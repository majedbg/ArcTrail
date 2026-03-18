/**
 * Sync Module — server synchronisation for optimistic mutations.
 *
 * Architecture:
 *   1. Mutations are enqueued in Zustand's syncSlice immediately after
 *      the optimistic UI update (see useOptimisticMutation).
 *   2. syncToServer() POSTs a single mutation to the appropriate Remix
 *      action endpoint and updates the queue on success or failure.
 *   3. setupAutoSync() wires up the four flush triggers specified in §25.1:
 *        — window "beforeunload"     (save before tab close)
 *        — navigator "online" event  (reconnect after offline)
 *        — document "visibilitychange" (app regaining focus)
 *        — 30-second polling interval
 *   4. Exponential backoff: 1s → 2s → 4s → … → 30s max between retries.
 *
 * Import note: this module imports useStore from store.ts.
 * store.ts does NOT import from sync.ts — no circular dependency.
 */

import type { PendingMutation, SyncStatus } from "./store/syncSlice.js";

// ---------------------------------------------------------------------------
// Endpoint resolution
// ---------------------------------------------------------------------------

/**
 * Derives the Remix action URL from an intent + payload.
 *
 * The mutation payload must carry a `projectSlug` field so the route can
 * be determined. Snapshot-related intents target the prototype sub-route.
 */
function resolveEndpoint(
  intent: string,
  payload: unknown
): string {
  const data =
    payload !== null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const slug = typeof data.projectSlug === "string" ? data.projectSlug : "_";

  if (
    intent === "createSnapshot" ||
    intent === "deleteSnapshot" ||
    intent === "createSnapshotRelation"
  ) {
    return `/app/${slug}/prototype`;
  }

  return `/app/${slug}`;
}

// ---------------------------------------------------------------------------
// Exponential back-off helper
// ---------------------------------------------------------------------------

const MIN_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

function retryDelay(retries: number): number {
  return Math.min(
    MIN_RETRY_DELAY_MS * Math.pow(2, retries),
    MAX_RETRY_DELAY_MS
  );
}

// ---------------------------------------------------------------------------
// syncToServer
// ---------------------------------------------------------------------------

/**
 * POSTs a single pending mutation to its Remix action endpoint.
 *
 * Lifecycle:
 *   — Marks the mutation as "syncing" in the store.
 *   — On HTTP 2xx: dequeues the mutation.
 *   — On HTTP error or network failure:
 *       • Calls markError() on the mutation.
 *       • Schedules a retry after exponential back-off if navigator.onLine.
 *       • If offline: leaves in queue (will be picked up by "online" event).
 *
 * @param mutation  The PendingMutation to send.
 */
export async function syncToServer(mutation: PendingMutation): Promise<void> {
  // Lazy-import store to avoid circular dependency issues at module load time
  const { useStore } = await import("./store.js");
  const store = useStore.getState();

  // Check offline status first
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    store.setStatus("offline" as SyncStatus);
    return;
  }

  // Mark as actively syncing
  store.setStatus("syncing" as SyncStatus);

  const url = resolveEndpoint(mutation.intent, mutation.payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: mutation.intent,
        ...(mutation.payload !== null && typeof mutation.payload === "object"
          ? mutation.payload
          : { payload: mutation.payload }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded ${response.status} ${response.statusText}`);
    }

    // Success — remove from queue
    useStore.getState().dequeue(mutation.id);
  } catch (err) {
    // Mark this mutation as errored
    useStore.getState().markError(mutation.id);

    // Schedule retry with exponential back-off (only if online)
    const delay = retryDelay(mutation.retries);
    setTimeout(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const currentPending = useStore.getState().pending;
      const current = currentPending.find((m) => m.id === mutation.id);

      if (current && current.status === "error") {
        await syncToServer({ ...current, retries: current.retries + 1 });
      }
    }, delay);
  }
}

// ---------------------------------------------------------------------------
// Queue flush
// ---------------------------------------------------------------------------

/** Sends all pending (not yet syncing / already-erroring) mutations. */
export async function flushQueue(): Promise<void> {
  const { useStore } = await import("./store.js");
  const { pending } = useStore.getState();
  const toSync = pending.filter((m) => m.status === "pending");

  // Fire sequentially so ordering is preserved
  for (const mutation of toSync) {
    await syncToServer(mutation);
  }
}

// ---------------------------------------------------------------------------
// Auto-sync setup (call once on app mount, clean up on unmount)
// ---------------------------------------------------------------------------

/** Number of successful mutations before triggering an eager flush. */
const EAGER_FLUSH_COUNT = 5;

let successCounter = 0;

/**
 * Wires up the four flush triggers from spec §25.1.
 * Call this once in the root layout component (browser only).
 * Returns a cleanup function for React useEffect.
 *
 * @example
 * useEffect(() => setupAutoSync(), []);
 */
export function setupAutoSync(): () => void {
  if (typeof window === "undefined") {
    // SSR — no-op
    return () => {};
  }

  const onOnline = () => {
    flushQueue().catch(console.error);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      flushQueue().catch(console.error);
    }
  };

  const onBeforeUnload = () => {
    // Best-effort synchronous trigger (async flush won't complete, but
    // the pending queue is persisted in localStorage so it retries on reload)
    flushQueue().catch(console.error);
  };

  // 30-second interval
  const intervalId = setInterval(() => {
    flushQueue().catch(console.error);
  }, 30_000);

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", onBeforeUnload);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", onBeforeUnload);
  };
}

/**
 * Called by useOptimisticMutation after a successful server sync.
 * Every EAGER_FLUSH_COUNT successes, flushes the remaining queue.
 */
export function onMutationSuccess(): void {
  successCounter++;
  if (successCounter >= EAGER_FLUSH_COUNT) {
    successCounter = 0;
    flushQueue().catch(console.error);
  }
}
