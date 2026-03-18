/**
 * @layer molecule
 * @description Nested-rectangle snapshot card for PrototypeView.
 *   Wraps children in DiffContext.Provider so nested artifact blocks
 *   can read their own diff status. Calls computeSnapshotDiff internally.
 * @consumes snapshot: Snapshot, graph: ProjectGraph, artifacts lookup
 * @emits onClick
 * @diffAware true (is the diff provider)
 * @tiltEnabled true (factor:10, scale:1.01)
 */

import { useMemo } from "react";
import { DiffContext } from "~/contexts/DiffContext.js";
import { computeSnapshotDiff } from "~/lib/diffSnapshot.js";
import { useTilt } from "~/hooks/useTilt.js";
import { VersionBadge } from "../atoms/VersionBadge.js";
import { Badge } from "../atoms/Badge.js";
import { ARTIFACT_KIND_TOKENS, DIFF_TOKENS } from "~/lib/tokens.js";
import type { Snapshot, ProjectGraph, Artifact, DiffStatus } from "~/lib/types.js";

export type SnapshotCardProps = {
  snapshot: Snapshot;
  graph: ProjectGraph;
  onClick?: () => void;
  className?: string;
};

export function SnapshotCard({
  snapshot,
  graph,
  onClick,
  className = "",
}: SnapshotCardProps) {
  const { ref, onMouseMove, onMouseLeave } = useTilt({
    factor: 10,
    scale: 1.01,
  });

  // Compute diff between this snapshot and the current graph
  const diffResult = useMemo(
    () => computeSnapshotDiff(graph, snapshot),
    [graph, snapshot],
  );

  // Build diff lookup
  const diffMap = useMemo(() => {
    const map = new Map<string, DiffStatus>();
    for (const da of diffResult.diffedArtifacts) {
      map.set(da.id, da.diffStatus);
    }
    return map;
  }, [diffResult]);

  const diffContextValue = useMemo(
    () => ({
      getDiffStatus: (id: string) => diffMap.get(id) ?? "unchanged",
      isActive: true,
    }),
    [diffMap],
  );

  // Group snapshot members by subsystem
  const memberIds = new Set(
    (snapshot.members ?? []).map((m) => m.artifactId),
  );

  const memberArtifacts = graph.artifacts.filter((a) =>
    memberIds.has(a.id),
  );

  // Group: subsystems contain features, which contain variations/components
  const subsystems = memberArtifacts.filter((a) => a.kind === "SUBSYSTEM");
  const features = memberArtifacts.filter((a) => a.kind === "FEATURE");
  const others = memberArtifacts.filter(
    (a) =>
      a.kind === "VARIATION" ||
      a.kind === "COMPONENT",
  );

  // Build subsystem → features mapping via graph relations
  const childMap = new Map<string, string[]>();
  for (const r of graph.relations) {
    if (!childMap.has(r.fromId)) childMap.set(r.fromId, []);
    childMap.get(r.fromId)!.push(r.toId);
  }

  const prototype = graph.artifacts.find(
    (a) => a.id === snapshot.prototypeArtifactId,
  );

  return (
    <DiffContext.Provider value={diffContextValue}>
      <div
        ref={ref}
        className={`tilt-card w-[320px] rounded-2xl border border-zinc-700 bg-zinc-900/90 shadow-lg backdrop-blur-sm ${className}`}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") onClick();
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {prototype?.title ?? "Prototype"}
            </span>
            <VersionBadge versionString={snapshot.versionString} />
          </div>
          {(snapshot.displayLabel || snapshot.dateISO) && (
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
              {snapshot.displayLabel && <span>{snapshot.displayLabel}</span>}
              {snapshot.dateISO && <span>{snapshot.dateISO}</span>}
            </div>
          )}
          {diffResult.summary !== "no changes" && (
            <div className="mt-1 text-[10px] text-zinc-500">
              {diffResult.summary}
            </div>
          )}
        </div>

        {/* Nested rectangles */}
        <div className="flex flex-col gap-2 p-3">
          {subsystems.length === 0 && features.length === 0 && (
            <p className="text-xs text-zinc-600 italic">No members</p>
          )}

          {subsystems.map((sub) => {
            const subDiff = diffMap.get(sub.id) ?? "unchanged";
            const subToken = ARTIFACT_KIND_TOKENS[sub.kind];
            const subChildren = (childMap.get(sub.id) ?? []).filter((id) =>
              memberIds.has(id),
            );
            const childArtifacts = subChildren
              .map((id) => graph.artifacts.find((a) => a.id === id))
              .filter(Boolean) as Artifact[];

            return (
              <ArtifactBlock
                key={sub.id}
                artifact={sub}
                diffStatus={subDiff}
                color={subToken.color}
                bgOpacity={subToken.bgOpacity}
              >
                {childArtifacts.map((child) => {
                  const childDiff = diffMap.get(child.id) ?? "unchanged";
                  const childToken = ARTIFACT_KIND_TOKENS[child.kind];
                  const grandChildren = (childMap.get(child.id) ?? []).filter(
                    (id) => memberIds.has(id),
                  );
                  const pills = grandChildren
                    .map((id) => graph.artifacts.find((a) => a.id === id))
                    .filter(Boolean) as Artifact[];

                  return (
                    <ArtifactBlock
                      key={child.id}
                      artifact={child}
                      diffStatus={childDiff}
                      color={childToken.color}
                      bgOpacity={childToken.bgOpacity}
                      nested
                    >
                      {pills.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pills.map((p) => {
                            const pDiff = diffMap.get(p.id) ?? "unchanged";
                            return (
                              <ArtifactPill
                                key={p.id}
                                artifact={p}
                                diffStatus={pDiff}
                              />
                            );
                          })}
                        </div>
                      )}
                    </ArtifactBlock>
                  );
                })}
              </ArtifactBlock>
            );
          })}

          {/* Ungrouped features (not under a subsystem) */}
          {features
            .filter(
              (f) =>
                !subsystems.some((s) =>
                  (childMap.get(s.id) ?? []).includes(f.id),
                ),
            )
            .map((f) => {
              const fDiff = diffMap.get(f.id) ?? "unchanged";
              const fToken = ARTIFACT_KIND_TOKENS[f.kind];
              return (
                <ArtifactBlock
                  key={f.id}
                  artifact={f}
                  diffStatus={fDiff}
                  color={fToken.color}
                  bgOpacity={fToken.bgOpacity}
                />
              );
            })}

          {/* Ungrouped others */}
          {others
            .filter((o) => {
              // Only show if not nested under any already-shown parent
              for (const [, children] of childMap) {
                if (children.includes(o.id)) return false;
              }
              return true;
            })
            .map((o) => {
              const oDiff = diffMap.get(o.id) ?? "unchanged";
              return (
                <ArtifactPill key={o.id} artifact={o} diffStatus={oDiff} />
              );
            })}
        </div>
      </div>
    </DiffContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ArtifactBlock({
  artifact,
  diffStatus,
  color,
  bgOpacity,
  nested = false,
  children,
}: {
  artifact: Artifact;
  diffStatus: DiffStatus;
  color: string;
  bgOpacity: number;
  nested?: boolean;
  children?: React.ReactNode;
}) {
  const diffToken = DIFF_TOKENS[diffStatus];
  const isUnchanged = diffStatus === "unchanged";
  const isRemoved = diffStatus === "removed";

  return (
    <div
      className={`rounded-lg ${nested ? "p-2" : "p-2.5"} ${isUnchanged ? "opacity-50" : ""}`}
      style={{
        backgroundColor: `${color}${Math.round(bgOpacity * 255)
          .toString(16)
          .padStart(2, "0")}`,
        border: `1px solid ${!isUnchanged && diffToken.color !== "transparent" ? diffToken.color : color}`,
        boxShadow:
          !isUnchanged && diffToken.color !== "transparent"
            ? `0 0 6px ${diffToken.color}40`
            : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs font-medium ${isRemoved ? "line-through" : ""}`}
          style={{ color }}
        >
          {artifact.title}
          {artifact.subsystemCode && (
            <span className="ml-1 font-mono text-[10px] opacity-70">
              [{artifact.subsystemCode}]
            </span>
          )}
        </span>
        {!isUnchanged && diffToken.label && (
          <Badge
            label={diffToken.label}
            bgClass="bg-transparent"
            textClass="text-zinc-200"
            className="border text-[8px]"
          />
        )}
      </div>
      {children && <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>}
    </div>
  );
}

function ArtifactPill({
  artifact,
  diffStatus,
}: {
  artifact: Artifact;
  diffStatus: DiffStatus;
}) {
  const token = ARTIFACT_KIND_TOKENS[artifact.kind];
  const diffToken = DIFF_TOKENS[diffStatus];
  const isUnchanged = diffStatus === "unchanged";
  const isRemoved = diffStatus === "removed";

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${isUnchanged ? "opacity-50" : ""} ${isRemoved ? "line-through" : ""}`}
      style={{
        backgroundColor: `${token.color}33`,
        color: token.color,
        border:
          !isUnchanged && diffToken.color !== "transparent"
            ? `1px solid ${diffToken.color}`
            : `1px solid ${token.color}55`,
      }}
    >
      {artifact.title}
    </span>
  );
}
