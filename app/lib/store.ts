/**
 * ArcTrail Zustand Store
 *
 * Composes five slices into a single store with selective persistence:
 *
 *   graphSlice    — persisted: projectGraph (offline editing)
 *   uiSlice       — persisted: view, activeRelationTypeIds
 *   snapshotSlice — NOT persisted (reloaded from server on navigation)
 *   aiSlice       — NOT persisted (conversations are ephemeral)
 *   syncSlice     — persisted: pending mutations queue
 *
 * localStorage is not available in SSR / Node.js. We fall back to a
 * no-op in-memory storage so that the store initialises cleanly in
 * server context and during tests.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateCreator, StoreMutatorIdentifier } from "zustand";

import { createGraphSlice } from "./store/graphSlice.js";
import { createUISlice } from "./store/uiSlice.js";
import { createSnapshotSlice } from "./store/snapshotSlice.js";
import { createAISlice } from "./store/aiSlice.js";
import { createSyncSlice } from "./store/syncSlice.js";

export type { GraphSlice } from "./store/graphSlice.js";
export type { UISlice, ViewMode } from "./store/uiSlice.js";
export type { SnapshotSlice } from "./store/snapshotSlice.js";
export type { AISlice, AIMode, AIMessage } from "./store/aiSlice.js";
export type { SyncSlice, SyncStatus, PendingMutation } from "./store/syncSlice.js";

export {
  selectArtifactById,
  selectArtifactsByKind,
  selectRelationsForArtifact,
  selectSubtree,
} from "./store/graphSlice.js";

import type { GraphSlice } from "./store/graphSlice.js";
import type { UISlice } from "./store/uiSlice.js";
import type { SnapshotSlice } from "./store/snapshotSlice.js";
import type { AISlice } from "./store/aiSlice.js";
import type { SyncSlice } from "./store/syncSlice.js";

// ---------------------------------------------------------------------------
// Combined store type
// ---------------------------------------------------------------------------

export type AppStore = GraphSlice & UISlice & SnapshotSlice & AISlice & SyncSlice;

// ---------------------------------------------------------------------------
// SSR-safe storage — falls back to no-op when localStorage is unavailable
// ---------------------------------------------------------------------------

type SimpleStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** In-memory fallback used in SSR / Node.js / tests. */
function createMemoryStorage(): SimpleStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

function getStorage(): SimpleStorage {
  if (typeof localStorage !== "undefined") return localStorage;
  return createMemoryStorage();
}

// ---------------------------------------------------------------------------
// Helper to cast slice creators to AppStore context
// This is the standard Zustand pattern for TypeScript slice composition —
// the cast is contained here rather than in the slice files themselves.
// ---------------------------------------------------------------------------

type SC<T> = StateCreator<AppStore, [["zustand/persist", unknown]], [], T>;

function asSlice<T>(
  creator: StateCreator<T, [], [], T>
): SC<T> {
  return creator as unknown as SC<T>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...asSlice<GraphSlice>(createGraphSlice)(...args),
      ...asSlice<UISlice>(createUISlice)(...args),
      ...asSlice<SnapshotSlice>(createSnapshotSlice)(...args),
      ...asSlice<AISlice>(createAISlice)(...args),
      ...asSlice<SyncSlice>(createSyncSlice)(...args),
    }),
    {
      name: "arctrail-store",
      storage: createJSONStorage(getStorage),

      /**
       * Selectively persist only the fields that need to survive a reload.
       * Everything else rehydrates from the server (Remix loaders).
       */
      partialize: (state) => ({
        // graphSlice: full project graph for offline editing
        projectGraph: state.projectGraph,
        positions: state.positions,

        // uiSlice: remember the active view and visible relation layers
        view: state.view,
        activeRelationTypeIds: state.activeRelationTypeIds,

        // syncSlice: queue must survive reload so mutations are not lost
        pending: state.pending,
        // Note: aggregate status is recomputed from the queue on rehydration;
        // we don't persist it to avoid stale "syncing" states after crashes.
      }),
    }
  )
);
