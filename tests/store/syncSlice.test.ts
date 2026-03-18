/**
 * Tests for syncSlice — pending queue management and status transitions.
 */
import { describe, it, expect } from "vitest";
import { create } from "zustand";
import { createSyncSlice } from "../../app/lib/store/syncSlice";
import type { SyncSlice, PendingMutation, SyncStatus } from "../../app/lib/store/syncSlice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return create<SyncSlice>()(createSyncSlice);
}

function makeMutation(id: string, overrides: Partial<PendingMutation> = {}): PendingMutation {
  return {
    id,
    intent: "createArtifact",
    payload: { projectSlug: "test-proj", title: `Artifact ${id}` },
    createdAt: Date.now(),
    retries: 0,
    status: "pending",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// enqueue
// ---------------------------------------------------------------------------

describe("syncSlice: enqueue", () => {
  it("adds a mutation to the pending queue", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    expect(store.getState().pending).toHaveLength(1);
    expect(store.getState().pending[0].id).toBe("m1");
  });

  it("sets aggregate status to 'pending'", () => {
    const store = makeStore();
    expect(store.getState().status).toBe("idle");
    store.getState().enqueue(makeMutation("m1"));
    expect(store.getState().status).toBe("pending");
  });

  it("preserves existing mutations when adding a new one", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    expect(store.getState().pending).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// dequeue
// ---------------------------------------------------------------------------

describe("syncSlice: dequeue", () => {
  it("removes the mutation with the given id", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    store.getState().dequeue("m1");
    expect(store.getState().pending).toHaveLength(1);
    expect(store.getState().pending[0].id).toBe("m2");
  });

  it("sets aggregate status to 'idle' when queue becomes empty", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().dequeue("m1");
    expect(store.getState().status).toBe("idle");
  });

  it("keeps status 'pending' when queue still has items", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    store.getState().dequeue("m1");
    expect(store.getState().status).toBe("pending");
  });

  it("sets status to 'error' when remaining items have error status", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    // Mark m2 as errored
    store.getState().markError("m2");
    // Now dequeue m1
    store.getState().dequeue("m1");
    // m2 (errored) remains; status should be 'error'
    expect(store.getState().status).toBe("error");
  });

  it("is a no-op for a non-existent id", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().dequeue("not-real");
    expect(store.getState().pending).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// markError
// ---------------------------------------------------------------------------

describe("syncSlice: markError", () => {
  it("changes the mutation status to 'error'", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().markError("m1");
    expect(store.getState().pending[0].status).toBe("error");
  });

  it("sets aggregate status to 'error'", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().markError("m1");
    expect(store.getState().status).toBe("error");
  });

  it("does not affect other mutations in the queue", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    store.getState().markError("m1");
    expect(store.getState().pending.find((m) => m.id === "m2")?.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// retryAll
// ---------------------------------------------------------------------------

describe("syncSlice: retryAll", () => {
  it("re-queues all errored mutations as 'pending'", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().enqueue(makeMutation("m2"));
    store.getState().markError("m1");
    store.getState().markError("m2");

    store.getState().retryAll();

    const pending = store.getState().pending;
    expect(pending.every((m) => m.status === "pending")).toBe(true);
  });

  it("re-queues 'offline' mutations as 'pending'", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1", { status: "offline" }));
    store.getState().retryAll();
    expect(store.getState().pending[0].status).toBe("pending");
  });

  it("does not affect mutations that are already 'pending'", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));       // pending
    store.getState().enqueue(makeMutation("m2", { status: "error" }));

    store.getState().retryAll();

    const pending = store.getState().pending;
    expect(pending.find((m) => m.id === "m1")?.status).toBe("pending");
    expect(pending.find((m) => m.id === "m2")?.status).toBe("pending");
  });

  it("increments the retries counter for retried mutations", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1", { retries: 2, status: "error" }));
    store.getState().retryAll();
    expect(store.getState().pending[0].retries).toBe(3);
  });

  it("sets aggregate status back to 'pending' after retry", () => {
    const store = makeStore();
    store.getState().enqueue(makeMutation("m1"));
    store.getState().markError("m1");
    expect(store.getState().status).toBe("error");

    store.getState().retryAll();
    expect(store.getState().status).toBe("pending");
  });

  it("sets status to 'idle' if no mutations to retry and queue is empty after", () => {
    const store = makeStore();
    // Queue is empty; retryAll should be a no-op
    store.getState().retryAll();
    expect(store.getState().status).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// setStatus
// ---------------------------------------------------------------------------

describe("syncSlice: setStatus", () => {
  it("allows direct status override (used by sync.ts during active sync)", () => {
    const store = makeStore();
    store.getState().setStatus("syncing");
    expect(store.getState().status).toBe("syncing");
  });

  it("can set offline status", () => {
    const store = makeStore();
    store.getState().setStatus("offline");
    expect(store.getState().status).toBe("offline");
  });
});

// ---------------------------------------------------------------------------
// Integration: full queue lifecycle
// ---------------------------------------------------------------------------

describe("syncSlice: full lifecycle", () => {
  it("idle → pending → syncing → idle on success", () => {
    const store = makeStore();

    expect(store.getState().status).toBe("idle");

    store.getState().enqueue(makeMutation("m1"));
    expect(store.getState().status).toBe("pending");

    store.getState().setStatus("syncing");
    expect(store.getState().status).toBe("syncing");

    store.getState().dequeue("m1");
    expect(store.getState().status).toBe("idle");
    expect(store.getState().pending).toHaveLength(0);
  });

  it("pending → error → pending (retry) on transient failure", () => {
    const store = makeStore();

    store.getState().enqueue(makeMutation("m1"));
    store.getState().markError("m1");
    expect(store.getState().status).toBe("error");

    store.getState().retryAll();
    expect(store.getState().status).toBe("pending");
    expect(store.getState().pending[0].status).toBe("pending");
  });
});
