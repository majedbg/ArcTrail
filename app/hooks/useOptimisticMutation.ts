/**
 * useOptimisticMutation — React hook for optimistic UI updates.
 *
 * Implements the full pattern from spec §25.5:
 *   1. Caller defines optimisticUpdate (immediate) and rollback (on failure).
 *   2. mutate() applies the optimistic update instantly — no await.
 *   3. The mutation is enqueued in syncSlice and sent to the server async.
 *   4. On server error: rollback is called and a toast-worthy error is set.
 *   5. Returns { mutate, status } — status tracks this mutation in the queue.
 *
 * The `store` argument in optimisticUpdate / rollback is the full AppStore
 * state-plus-actions object returned by useStore.getState(). Callers use
 * actions like `store.upsertArtifact(...)` or `store.removeRelation(...)`.
 */

import { useState, useCallback } from "react";
import { useStore } from "../lib/store.js";
import { syncToServer, onMutationSuccess } from "../lib/sync.js";
import type { AppStore, SyncStatus } from "../lib/store.js";
import type { PendingMutation } from "../lib/store/syncSlice.js";

// ---------------------------------------------------------------------------
// UUID helper (no external dependency)
// ---------------------------------------------------------------------------

function generateId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (e.g. older Node)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export type UseOptimisticMutationOptions<T> = {
  /** The Remix action intent, e.g. "createArtifact". */
  intent: string;
  /**
   * Applied immediately before the server responds.
   * Receives the live store — call store actions directly.
   */
  optimisticUpdate: (store: AppStore) => void;
  /**
   * Applied if the server returns an error.
   * Restore the pre-mutation state using store actions.
   */
  rollback: (store: AppStore) => void;
  /**
   * The data payload sent to the server.
   * Must include `projectSlug` so sync.ts can determine the endpoint.
   */
  payload: T;
};

export type UseOptimisticMutationResult = {
  mutate(): void;
  /** Live status of the most recently triggered mutation. */
  status: SyncStatus;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @example
 * const { mutate, status } = useOptimisticMutation({
 *   intent: 'createArtifact',
 *   optimisticUpdate: (store) => store.upsertArtifact(optimisticArtifact),
 *   rollback:         (store) => store.removeArtifact(optimisticArtifact.id),
 *   payload: { projectSlug, ...formData },
 * });
 */
export function useOptimisticMutation<T>(
  options: UseOptimisticMutationOptions<T>
): UseOptimisticMutationResult {
  // Track the mutation ID for this hook instance so we can derive status
  const [currentMutationId, setCurrentMutationId] = useState<string | null>(
    null
  );

  // Derive status from the live sync queue
  const status = useStore((state) => {
    if (!currentMutationId) return "idle" as SyncStatus;
    const mutation = state.pending.find((m) => m.id === currentMutationId);
    // If dequeued (success), mutation won't be found → idle
    return mutation?.status ?? ("idle" as SyncStatus);
  });

  const mutate = useCallback(() => {
    const store = useStore.getState();
    const mutationId = generateId();

    // Step 1: apply optimistic update immediately
    options.optimisticUpdate(store);

    // Step 2: enqueue in sync slice
    const mutation: PendingMutation = {
      id: mutationId,
      intent: options.intent,
      payload: options.payload,
      createdAt: Date.now(),
      retries: 0,
      status: "pending",
    };

    store.enqueue(mutation);
    setCurrentMutationId(mutationId);

    // Step 3: fire async server sync
    syncToServer(mutation)
      .then(() => {
        onMutationSuccess();
      })
      .catch(() => {
        // syncToServer already called markError; we just need to rollback the UI
        options.rollback(useStore.getState());
      });
  }, [options]);

  return { mutate, status };
}
