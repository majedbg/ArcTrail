/**
 * @layer organism
 * @description Renders a scrollable list of SnapshotCards with click-to-activate,
 *   plus a snapshot creation flow at the bottom. Default layout is column;
 *   can be switched to row via prop.
 *
 *   Creation flow:
 *   1. Blank card with "+ Create Snapshot" prompt
 *   1b. "Start fresh" vs "Based on existing" choice (dropdown pre-selects latest)
 *   2. Selection mode: user picks artifacts to include, can add new artifacts inline
 *   3. Save (persists snapshot) or Cancel (with confirmation popper)
 *
 * @consumes snapshots from Zustand store, activeSnapshotId from uiSlice
 * @emits setActiveSnapshot via store
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "~/lib/store.js";
import { useTilt } from "~/hooks/useTilt.js";
import { useOptimisticMutation } from "~/hooks/useOptimisticMutation.js";
import { SnapshotCard } from "../molecules/SnapshotCard.js";
import { VersionBadge } from "../atoms/VersionBadge.js";
import { ARTIFACT_KIND_TOKENS } from "~/lib/tokens.js";
import type {
  Artifact,
  ArtifactType,
  ProjectGraph,
  Snapshot,
  Stage,
} from "~/lib/types.js";
import type { ArtifactKind } from "~/lib/tokens.js";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SnapshotListContainerProps = {
  /** Layout direction. Default: "column" */
  direction?: "column" | "row";
  artifactTypes?: ArtifactType[];
  stages?: Stage[];
  projectSlug?: string;
};

type CreationStep = "idle" | "choose-basis" | "selecting";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SnapshotListContainer({
  direction = "column",
  artifactTypes = [],
  stages = [],
  projectSlug = "",
}: SnapshotListContainerProps) {
  const projectGraph = useStore((s) => s.projectGraph);
  const activeSnapshotId = useStore((s) => s.activeSnapshotId);
  const setActiveSnapshot = useStore((s) => s.setActiveSnapshot);

  const [creationStep, setCreationStep] = useState<CreationStep>("idle");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [basisSnapshotId, setBasisSnapshotId] = useState<string | null>(null);
  const [versionString, setVersionString] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!projectGraph) return null;

  const snapshots = projectGraph.snapshots ?? [];
  const isRow = direction === "row";

  const activeSnapshot = activeSnapshotId
    ? snapshots.find((s) => s.id === activeSnapshotId) ?? null
    : null;

  // Prototypes available for the snapshot
  const prototypes = projectGraph.artifacts.filter(
    (a) => a.kind === "PROTOTYPE",
  );

  // Latest snapshot (for pre-selecting the "based on" dropdown)
  const latestSnapshot =
    snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // When entering selection mode from a basis, pre-populate member IDs
  const startFromBasis = useCallback(
    (basisId: string | null) => {
      setBasisSnapshotId(basisId);
      if (basisId) {
        const basis = snapshots.find((s) => s.id === basisId);
        const memberIds = new Set(
          (basis?.members ?? []).map((m) => m.artifactId),
        );
        setSelectedMemberIds(memberIds);
      } else {
        setSelectedMemberIds(new Set());
      }
      setVersionString("");
      setCreationStep("selecting");
    },
    [snapshots],
  );

  const cancelCreation = useCallback(() => {
    setCreationStep("idle");
    setSelectedMemberIds(new Set());
    setBasisSnapshotId(null);
    setVersionString("");
    setShowCancelConfirm(false);
  }, []);

  const isSelecting = creationStep === "selecting";

  return (
    <div className="flex h-full flex-col">
      {/* Banner section */}
      {isSelecting ? (
        <SelectionModeBanner
          memberCount={selectedMemberIds.size}
          onCancel={() => setShowCancelConfirm(true)}
        />
      ) : activeSnapshot ? (
        <ActiveSnapshotBanner
          snapshot={activeSnapshot}
          graph={projectGraph}
          onDeselect={() => setActiveSnapshot(null)}
        />
      ) : (
        <OverviewBanner />
      )}

      {/* Snapshot list + creation card */}
      <div
        className={`flex-1 overflow-auto p-3 ${
          isRow ? "flex flex-row gap-3" : "flex flex-col gap-3"
        }`}
      >
        {snapshots.map((snap) => (
          <div
            key={snap.id}
            className={`shrink-0 transition-all duration-200 ${
              isSelecting
                ? "opacity-40 pointer-events-none"
                : activeSnapshotId === snap.id
                  ? "ring-2 ring-zinc-400 rounded-2xl"
                  : activeSnapshotId
                    ? "opacity-60 hover:opacity-90"
                    : "hover:opacity-90"
            }`}
          >
            <SnapshotCard
              snapshot={snap}
              graph={projectGraph}
              onClick={
                isSelecting
                  ? undefined
                  : () =>
                      setActiveSnapshot(
                        activeSnapshotId === snap.id ? null : snap.id,
                      )
              }
            />
          </div>
        ))}

        {/* Creation flow */}
        {creationStep === "idle" && (
          <CreateSnapshotPrompt
            onClick={() => setCreationStep("choose-basis")}
          />
        )}

        {creationStep === "choose-basis" && (
          <BasisChooser
            snapshots={snapshots}
            latestSnapshotId={latestSnapshot?.id ?? null}
            onChooseBlank={() => startFromBasis(null)}
            onChooseBasis={(id) => startFromBasis(id)}
            onCancel={() => setCreationStep("idle")}
          />
        )}

        {isSelecting && (
          <SnapshotArtifactSelector
            graph={projectGraph}
            selectedIds={selectedMemberIds}
            onToggle={(ids, select) => {
              setSelectedMemberIds((prev) => {
                const next = new Set(prev);
                for (const id of ids) {
                  if (select) next.add(id);
                  else next.delete(id);
                }
                return next;
              });
            }}
            versionString={versionString}
            onVersionChange={setVersionString}
            prototypes={prototypes}
            projectSlug={projectSlug}
            artifactTypes={artifactTypes}
            stages={stages}
            basisSnapshotId={basisSnapshotId}
            onSave={cancelCreation}
            onCancel={() => setShowCancelConfirm(true)}
          />
        )}
      </div>

      {/* Cancel confirmation popper */}
      {showCancelConfirm && (
        <ConfirmCancelPopper
          onConfirm={cancelCreation}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Blank "Create Snapshot" card with tilt
// ---------------------------------------------------------------------------

function CreateSnapshotPrompt({ onClick }: { onClick: () => void }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt({
    factor: 10,
    scale: 1.01,
  });

  return (
    <div
      ref={ref}
      className="tilt-card flex w-[320px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 py-10 backdrop-blur-sm transition-colors hover:border-zinc-500 hover:bg-zinc-900/80"
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 text-xl text-zinc-400">
        +
      </span>
      <span className="text-xs font-medium text-zinc-400">
        Create Snapshot
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1b: "New or from existing?" basis chooser
// ---------------------------------------------------------------------------

function BasisChooser({
  snapshots,
  latestSnapshotId,
  onChooseBlank,
  onChooseBasis,
  onCancel,
}: {
  snapshots: Snapshot[];
  latestSnapshotId: string | null;
  onChooseBlank: () => void;
  onChooseBasis: (id: string) => void;
  onCancel: () => void;
}) {
  const { ref, onMouseMove, onMouseLeave } = useTilt({
    factor: 10,
    scale: 1.01,
  });

  const [selectedBasis, setSelectedBasis] = useState<string>(
    latestSnapshotId ?? "",
  );

  return (
    <div
      ref={ref}
      className="tilt-card w-[320px] rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4 shadow-lg backdrop-blur-sm"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-zinc-200">
        Start fresh, or build on what exists?
      </p>
      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
        If your new snapshot shares most of its configuration with a previous
        version, start from it — you'll only need to adjust what changed.
      </p>

      <div className="mt-3 flex gap-2">
        {/* Blank button */}
        <button
          type="button"
          onClick={onChooseBlank}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
        >
          Blank
        </button>

        {/* Based-on section */}
        <div className="flex flex-1 gap-1">
          {snapshots.length > 0 ? (
            <>
              <select
                value={selectedBasis}
                onChange={(e) => setSelectedBasis(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-[10px] text-zinc-300"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.versionString}
                    {s.displayLabel ? ` — ${s.displayLabel}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (selectedBasis) onChooseBasis(selectedBasis);
                }}
                disabled={!selectedBasis}
                className="shrink-0 rounded-lg bg-zinc-700 px-2.5 py-2 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:opacity-40"
              >
                Use
              </button>
            </>
          ) : (
            <span className="flex flex-1 items-center justify-center text-[10px] italic text-zinc-600">
              No existing snapshots
            </span>
          )}
        </div>
      </div>

      {/* Cancel link */}
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Artifact selector — selection mode UI
// ---------------------------------------------------------------------------

function SnapshotArtifactSelector({
  graph,
  selectedIds,
  onToggle,
  versionString,
  onVersionChange,
  prototypes,
  projectSlug,
  artifactTypes: _artifactTypes,
  stages: _stages,
  basisSnapshotId,
  onSave,
  onCancel,
}: {
  graph: ProjectGraph;
  selectedIds: Set<string>;
  /** Batch toggle: receives the IDs to change and whether to select or deselect them. */
  onToggle: (ids: string[], select: boolean) => void;
  versionString: string;
  onVersionChange: (v: string) => void;
  prototypes: Artifact[];
  projectSlug: string;
  artifactTypes: ArtifactType[];
  stages: Stage[];
  basisSnapshotId: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [prototypeId, setPrototypeId] = useState(
    prototypes[0]?.id ?? "",
  );

  // Non-concept artifacts grouped by kind for selection
  const selectableArtifacts = useMemo(() => {
    return graph.artifacts.filter((a) => a.kind !== "CONCEPT");
  }, [graph.artifacts]);

  // Parent → children adjacency from graph relations
  const childMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of graph.relations) {
      const list = map.get(r.fromId);
      if (list) list.push(r.toId);
      else map.set(r.fromId, [r.toId]);
    }
    return map;
  }, [graph.relations]);

  /** Collect all descendants of an artifact via BFS. */
  const collectDescendants = useCallback(
    (rootId: string): string[] => {
      const visited = new Set<string>();
      const queue = [...(childMap.get(rootId) ?? [])];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        queue.push(...(childMap.get(id) ?? []));
      }
      return [...visited];
    },
    [childMap],
  );

  /**
   * Cascading toggle: selecting an artifact also selects all its descendants;
   * deselecting an artifact also deselects all its descendants.
   * Operates as a single batch update for consistency.
   */
  const handleToggle = useCallback(
    (id: string) => {
      const select = !selectedIds.has(id);
      const affected = [id, ...collectDescendants(id)];
      onToggle(affected, select);
    },
    [selectedIds, collectDescendants, onToggle],
  );

  // Group by kind for display
  const groupedByKind = useMemo(() => {
    const groups: Record<string, Artifact[]> = {};
    for (const a of selectableArtifacts) {
      (groups[a.kind] ??= []).push(a);
    }
    return groups;
  }, [selectableArtifacts]);

  const kindOrder: ArtifactKind[] = [
    "PROTOTYPE",
    "SUBSYSTEM",
    "FEATURE",
    "VARIATION",
    "COMPONENT",
  ];

  // Find the relation type for snapshot lineage
  const iteratesTypeId = useStore((s) => {
    const rel = s.projectGraph?.relations.find(
      (r) => r.relationType?.name === "ITERATES_ON",
    );
    return rel?.relationTypeId ?? null;
  });

  const saveMutation = useOptimisticMutation({
    intent: "createSnapshot",
    optimisticUpdate: (store) => {
      // Optimistic: add snapshot to projectGraph
      const optimisticSnapshot: Snapshot = {
        id: `temp-snap-${Date.now()}`,
        projectId: graph.project.id,
        prototypeArtifactId: prototypeId,
        versionString: versionString.trim() || "0.0.1",
        displayLabel: null,
        dateISO: new Date().toISOString().slice(0, 10),
        notes: null,
        createdAt: new Date(),
        members: [...selectedIds].map((artifactId) => ({
          id: `temp-member-${artifactId}`,
          snapshotId: `temp-snap-${Date.now()}`,
          artifactId,
          role: null,
          notes: null,
        })),
      };
      const pg = store.projectGraph;
      if (pg) {
        store.setProjectGraph({
          ...pg,
          snapshots: [...pg.snapshots, optimisticSnapshot],
        });
      }
    },
    rollback: () => {
      // On error, the page will reload from server anyway
    },
    payload: {
      projectSlug,
      prototypeArtifactId: prototypeId,
      versionString: versionString.trim() || "0.0.1",
      memberIds: JSON.stringify([...selectedIds]),
      parentSnapshotId: basisSnapshotId,
      relationTypeId: basisSnapshotId ? iteratesTypeId : null,
    },
  });

  const handleSave = () => {
    if (!prototypeId || selectedIds.size === 0) return;
    saveMutation.mutate();
    onSave();
  };

  return (
    <div
      className="w-[320px] rounded-2xl border border-emerald-500/30 bg-zinc-900/95 shadow-lg"
      style={{
        boxShadow: "inset 0 0 40px 0 rgba(16, 185, 129, 0.06)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="border-b border-zinc-800 px-3 py-2.5">
        <p className="text-[11px] font-medium text-emerald-400">
          New Prototype Snapshot
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
          Select subsystems, features, and components to include.
          New artifacts you add here will be created and automatically included.
        </p>
      </div>

      {/* Prototype selector + version */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 px-3 py-2.5">
        <div className="flex gap-2">
          <select
            value={prototypeId}
            onChange={(e) => setPrototypeId(e.target.value)}
            className="flex-1 rounded bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-200"
          >
            {prototypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <input
          value={versionString}
          onChange={(e) => onVersionChange(e.target.value)}
          placeholder="Version string (e.g. AI.RCA2)"
          className="rounded bg-zinc-800 px-2 py-1.5 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600"
        />
      </div>

      {/* Artifact checklist grouped by kind */}
      <div className="max-h-[40vh] overflow-auto px-3 py-2">
        {kindOrder.map((kind) => {
          const artifacts = groupedByKind[kind];
          if (!artifacts || artifacts.length === 0) return null;
          const token = ARTIFACT_KIND_TOKENS[kind];
          return (
            <div key={kind} className="mb-2">
              <p
                className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: token.color }}
              >
                {kind}
              </p>
              {artifacts.map((a) => {
                const checked = selectedIds.has(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-zinc-800 ${
                      checked ? "opacity-100" : "opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(a.id)}
                      className="accent-emerald-500"
                    />
                    <span className="text-[11px] text-zinc-200 truncate">
                      {a.title}
                    </span>
                    {a.subsystemCode && (
                      <span className="font-mono text-[9px] text-zinc-500">
                        [{a.subsystemCode}]
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Save/cancel footer */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500">
            {selectedIds.size} artifact{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-left text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={selectedIds.size === 0 || !prototypeId}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Snapshot
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection mode banner
// ---------------------------------------------------------------------------

function SelectionModeBanner({
  memberCount,
  onCancel,
}: {
  memberCount: number;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-950/30 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-emerald-300">
            Snapshot builder
          </p>
          <p className="text-[10px] text-zinc-500">
            {memberCount} artifact{memberCount !== 1 ? "s" : ""} selected
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active snapshot banner
// ---------------------------------------------------------------------------

function ActiveSnapshotBanner({
  snapshot,
  graph,
  onDeselect,
}: {
  snapshot: Snapshot;
  graph: ProjectGraph;
  onDeselect: () => void;
}) {
  const prototype = graph.artifacts.find(
    (a) => a.id === snapshot.prototypeArtifactId,
  );
  const memberCount = snapshot.members?.length ?? 0;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-zinc-200">
              {prototype?.title ?? "Snapshot"}
            </span>
            <VersionBadge versionString={snapshot.versionString} />
          </div>
          <p className="text-[10px] text-zinc-500">
            {memberCount} artifact{memberCount !== 1 ? "s" : ""} in snapshot
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDeselect}
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        title="Return to overview"
      >
        ✕ Clear
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview banner
// ---------------------------------------------------------------------------

function OverviewBanner() {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <p className="text-[11px] font-medium text-zinc-300">Overview</p>
      <p className="text-[10px] leading-snug text-zinc-500">
        All features, subsystems, and components ever explored for this idea —
        across every prototype version, regardless of time. Select a snapshot
        to focus on a specific point-in-time configuration.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm cancel popper — with liquid-fill gradient animation
// ---------------------------------------------------------------------------

const CANCEL_DELAY_MS = 1500;

function ConfirmCancelPopper({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);
      if (ms >= CANCEL_DELAY_MS) {
        setEnabled(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const fillPercent = Math.min(elapsed / CANCEL_DELAY_MS, 1) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onCancel}
      />

      {/* Popper */}
      <div className="fixed left-1/2 top-1/2 z-[61] w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-zinc-900 p-5 shadow-2xl">
        <p className="text-sm text-zinc-200">
          Discard this snapshot?
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Your artifact selections and any new artifacts created during this
          session will not be saved to a snapshot.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Keep editing
          </button>

          {/* Confirm button with liquid fill */}
          <button
            type="button"
            onClick={enabled ? onConfirm : undefined}
            disabled={!enabled}
            className="relative overflow-hidden rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              border: "1.5px solid var(--color-diff-removed)",
              color: enabled ? "#fff" : "var(--color-diff-removed)",
            }}
          >
            <span
              className="absolute inset-x-0 bottom-0 transition-none"
              style={{
                height: `${fillPercent}%`,
                background: "var(--color-diff-removed)",
                opacity: enabled ? 1 : 0.85,
              }}
            />
            <span className="relative z-10">Discard</span>
          </button>
        </div>
      </div>
    </>
  );
}
