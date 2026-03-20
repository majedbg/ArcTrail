/**
 * @layer view
 * @description Horizontal snapshot timeline view with ELK layout (direction:RIGHT).
 *   Renders SnapshotCards connected by SVG relation lines.
 * @consumes graph, snapshots, snapshotRelations from loader
 * @emits selectSnapshot, createSnapshot
 * @diffAware false
 * @tiltEnabled false
 */

import { useState, useEffect, useMemo } from "react";
import { RELATION_TYPE_TOKENS } from "~/lib/tokens.js";
import { layoutPrototypeView } from "~/lib/elk.js";
import { SnapshotCard } from "../../molecules/SnapshotCard.js";
import { SnapshotCreationPanel } from "./SnapshotCreationPanel.js";
import { Button } from "../../atoms/Button.js";
import type {
  Artifact,
  ProjectGraph,
  Snapshot,
  SnapshotRelation,
  SnapshotPositionMap,
} from "~/lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrototypeViewProps = {
  graph: ProjectGraph;
  snapshotRelations: SnapshotRelation[];
};

// Snapshot card dimensions matching elk.ts
const CARD_W = 320;
const CARD_H = 200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrototypeView({
  graph,
  snapshotRelations,
}: PrototypeViewProps) {
  const [positions, setPositions] = useState<SnapshotPositionMap>({});
  const [showCreate, setShowCreate] = useState(false);

  // Filter prototypes for selector
  const prototypes = useMemo(
    () => graph.artifacts.filter((a) => a.kind === "PROTOTYPE"),
    [graph.artifacts],
  );

  const [selectedPrototypeId, setSelectedPrototypeId] = useState(
    () => prototypes[0]?.id ?? "",
  );

  // Snapshots for this prototype
  const snapshots = useMemo(
    () =>
      graph.snapshots.filter(
        (s) => s.prototypeArtifactId === selectedPrototypeId,
      ),
    [graph.snapshots, selectedPrototypeId],
  );

  // Relevant snapshot relations (between snapshots of this prototype)
  const snapshotIds = useMemo(
    () => new Set(snapshots.map((s) => s.id)),
    [snapshots],
  );
  const relevantRelations = useMemo(
    () =>
      snapshotRelations.filter(
        (r) =>
          snapshotIds.has(r.fromSnapshotId) &&
          snapshotIds.has(r.toSnapshotId),
      ),
    [snapshotRelations, snapshotIds],
  );

  // ELK layout
  useEffect(() => {
    if (snapshots.length === 0) {
      setPositions({});
      return;
    }
    let cancelled = false;
    layoutPrototypeView(
      snapshots as Parameters<typeof layoutPrototypeView>[0],
      relevantRelations as Parameters<typeof layoutPrototypeView>[1],
    ).then((pos) => {
      if (!cancelled) setPositions(pos);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshots, relevantRelations]);

  // Canvas dimensions
  let maxX = 0;
  let maxY = 0;
  for (const s of snapshots) {
    const pos = positions[s.id];
    if (!pos) continue;
    maxX = Math.max(maxX, pos.x + CARD_W);
    maxY = Math.max(maxY, pos.y + CARD_H);
  }
  const canvasW = maxX + 100;
  const canvasH = Math.max(maxY + 100, 400);

  // Parent snapshot = last snapshot in timeline
  const parentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          {prototypes.length > 1 ? (
            <select
              value={selectedPrototypeId}
              onChange={(e) => setSelectedPrototypeId(e.target.value)}
              className="rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-200"
            >
              {prototypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-zinc-200">
              {prototypes[0]?.title ?? "Prototype"}
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          Create Snapshot
        </Button>
      </div>

      {/* Horizontally scrollable canvas */}
      {snapshots.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          No snapshots yet. Create the first snapshot to start tracking
          versions.
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto"
          style={{ background: "var(--canvas-bg)" }}
        >
          <div
            className="relative"
            style={{ width: canvasW, height: canvasH, minWidth: "100%" }}
          >
            {/* SVG lines between snapshot cards */}
            <svg
              className="absolute inset-0"
              width={canvasW}
              height={canvasH}
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <style>{`
                  @keyframes snap-dash { to { stroke-dashoffset: -24; } }
                `}</style>
              </defs>
              {relevantRelations.map((r) => {
                const fromPos = positions[r.fromSnapshotId];
                const toPos = positions[r.toSnapshotId];
                if (!fromPos || !toPos) return null;

                const fx = fromPos.x + CARD_W;
                const fy = fromPos.y + CARD_H / 2;
                const tx = toPos.x;
                const ty = toPos.y + CARD_H / 2;
                const handleX = 60;
                const d = `M ${fx} ${fy} C ${fx + handleX} ${fy}, ${tx - handleX} ${ty}, ${tx} ${ty}`;

                // relationType is populated via Prisma include in the loader
                const rt = (r as SnapshotRelation & { relationType?: { color: string; animated: boolean } }).relationType;
                const color = rt?.color ?? RELATION_TYPE_TOKENS.PARENT_OF.color;
                const animated = rt?.animated ?? false;

                return (
                  <g key={r.id}>
                    <defs>
                      <filter
                        id={`snap-glow-${r.id}`}
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="0"
                          stdDeviation="4"
                          floodColor={color}
                          floodOpacity="0.3"
                        />
                      </filter>
                    </defs>
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      filter={`url(#snap-glow-${r.id})`}
                      strokeLinecap="round"
                      style={
                        animated
                          ? {
                              strokeDasharray: "8 4",
                              animation: "snap-dash 1.5s linear infinite",
                            }
                          : undefined
                      }
                    />
                  </g>
                );
              })}
            </svg>

            {/* Snapshot cards */}
            {snapshots.map((s) => {
              const pos = positions[s.id];
              if (!pos) return null;
              return (
                <div
                  key={s.id}
                  className="absolute"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <SnapshotCard
                    snapshot={s as Parameters<typeof SnapshotCard>[0]["snapshot"]}
                    graph={graph as Parameters<typeof SnapshotCard>[0]["graph"]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Snapshot creation panel */}
      {showCreate && (
        <SnapshotCreationPanel
          graph={graph as Parameters<typeof SnapshotCreationPanel>[0]["graph"]}
          prototypeArtifactId={selectedPrototypeId}
          parentSnapshot={parentSnapshot as Parameters<typeof SnapshotCreationPanel>[0]["parentSnapshot"]}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
