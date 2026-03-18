/**
 * DiffContext — provides per-artifact diff status to descendant components.
 *
 * An ancestor component (e.g. SnapshotCard) wraps its children in
 * DiffContext.Provider, passing a getDiffStatus lookup and isActive flag.
 * Card molecules consume via useDiffStatus(artifactId) to apply diff styling
 * without prop drilling.
 *
 * @module
 */

import { createContext, useContext } from "react";
import type { DiffStatus } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export type DiffContextValue = {
  /** Returns the diff status for a given artifact. */
  getDiffStatus(artifactId: string): DiffStatus;
  /** When false, no diff is active — all cards render as "unchanged". */
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const DiffContext = createContext<DiffContextValue>({
  getDiffStatus: () => "unchanged",
  isActive: false,
});

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Reads the DiffContext and returns the diff status for the given artifact.
 * Returns "unchanged" when the context is inactive (normal non-diff renders).
 */
export function useDiffStatus(artifactId: string): DiffStatus {
  const ctx = useContext(DiffContext);
  if (!ctx.isActive) return "unchanged";
  return ctx.getDiffStatus(artifactId);
}
