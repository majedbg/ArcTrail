/**
 * @layer view
 * @description ELK-based tree layout with positioned ArtifactCards and SVG relation lines.
 *   Supports all four directions: UP, DOWN, LEFT, RIGHT (default: RIGHT).
 *   CONCEPT artifacts render as large container boxes enclosing their descendants.
 *   When a snapshot is active, non-member artifacts render at half opacity with
 *   disabled interactivity (no editing, no add-sibling buttons).
 * @consumes ProjectGraph from Zustand store, deriveGraphViewData
 * @emits selectArtifact via store
 */

import { useState, useEffect, useMemo } from "react";
import { useStore } from "~/lib/store.js";
import { deriveGraphViewData } from "~/lib/derived/graphView.js";
import { getGraphNodeDimensions } from "~/lib/elk.js";
import { ArtifactCard } from "../../organisms/ArtifactCard.js";
import { SVGRelationLine } from "./SVGRelationLine.js";
import { AddSiblingButton } from "../../atoms/AddSiblingButton.js";
import { StageChip } from "../../atoms/StageChip.js";
import {
  CategorySection,
  KindFooter,
} from "../../atoms/card-sections/index.js";
import type { Artifact, GraphViewData, RelationLineData } from "~/lib/types.js";
import type { ArtifactKind } from "~/lib/tokens.js";
import type { ElkDirection } from "~/lib/store/uiSlice.js";

/** Map parent kind → child kind for the add button. */
const CHILD_KIND: Record<string, ArtifactKind> = {
  CONCEPT: "PROTOTYPE",
  PROTOTYPE: "SUBSYSTEM",
  SUBSYSTEM: "FEATURE",
  FEATURE: "COMPONENT",
  VARIATION: "COMPONENT",
  COMPONENT: "COMPONENT",
};

/**
 * Computes the connection point on a card edge given the layout direction.
 */
function getConnectionPoints(
  fromPos: { x: number; y: number },
  fromW: number,
  fromH: number,
  toPos: { x: number; y: number },
  toW: number,
  toH: number,
  direction: ElkDirection
) {
  switch (direction) {
    case "RIGHT":
      return {
        from: { x: fromPos.x + fromW, y: fromPos.y + fromH / 2 },
        to:   { x: toPos.x,           y: toPos.y + toH / 2 },
      };
    case "LEFT":
      return {
        from: { x: fromPos.x,         y: fromPos.y + fromH / 2 },
        to:   { x: toPos.x + toW,     y: toPos.y + toH / 2 },
      };
    case "DOWN":
      return {
        from: { x: fromPos.x + fromW / 2, y: fromPos.y + fromH },
        to:   { x: toPos.x + toW / 2,     y: toPos.y },
      };
    case "UP":
      return {
        from: { x: fromPos.x + fromW / 2, y: fromPos.y },
        to:   { x: toPos.x + toW / 2,     y: toPos.y + toH },
      };
  }
}

function getAddButtonPosition(direction: ElkDirection): "below" | "right" | "left" | "above" {
  switch (direction) {
    case "DOWN": return "below";
    case "UP": return "above";
    case "RIGHT": return "right";
    case "LEFT": return "left";
  }
}

export function GraphView() {
  const projectGraph = useStore((s) => s.projectGraph);
  const activeRelationTypeIds = useStore((s) => s.activeRelationTypeIds);
  const graphDirection = useStore((s) => s.graphDirection);
  const activeSnapshotId = useStore((s) => s.activeSnapshotId);
  const selectArtifact = useStore((s) => s.selectArtifact);
  const setPositions = useStore((s) => s.setPositions);
  const openFormForSibling = useStore((s) => s.openFormForSibling);

  const [viewData, setViewData] = useState<GraphViewData | null>(null);

  useEffect(() => {
    if (!projectGraph) {
      setViewData(null);
      return;
    }
    let cancelled = false;
    deriveGraphViewData(projectGraph, activeRelationTypeIds, graphDirection).then((data) => {
      if (!cancelled) {
        setViewData(data);
        setPositions(data.positions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectGraph, activeRelationTypeIds, graphDirection, setPositions]);

  // Build set of artifact IDs that belong to the active snapshot
  const snapshotMemberIds = useMemo(() => {
    if (!activeSnapshotId || !projectGraph) return null;
    const snapshot = projectGraph.snapshots?.find((s) => s.id === activeSnapshotId);
    if (!snapshot) return null;
    const memberIds = new Set(snapshot.members?.map((m) => m.artifactId) ?? []);
    // Include the prototype artifact itself. This is done to ensure the prototype is NOT dimmed (not a member of the snapshot by default because the snapshot.members array contains only children)
    memberIds.add(snapshot.prototypeArtifactId);
    return memberIds;
  }, [activeSnapshotId, projectGraph]);

  if (!viewData) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading graph…
      </div>
    );
  }

  const { positions, containers, artifacts, relations, relationTypeMap } = viewData;

  // Set of CONCEPT artifact IDs (rendered as containers, not cards)
  const conceptIds = new Set(Object.keys(containers));

  // Canvas dimensions
  let maxX = 0;
  let maxY = 0;
  for (const a of artifacts) {
    if (conceptIds.has(a.id)) {
      const c = containers[a.id];
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    } else {
      const pos = positions[a.id];
      if (!pos) continue;
      const { width: w, height: h } = getGraphNodeDimensions(a);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }
  }
  const canvasW = maxX + 200;
  const canvasH = maxY + 200;

  // Build relation line data — skip CONCEPT→descendant relations (containment replaces line)
  const relationLines: RelationLineData[] = relations
    .filter((r) => {
      if (!positions[r.fromId] || !positions[r.toId]) return false;
      if (conceptIds.has(r.fromId)) return false;
      return true;
    })
    .map((r) => {
      const fromA = artifacts.find((a) => a.id === r.fromId);
      const toA = artifacts.find((a) => a.id === r.toId);
      const fromDims = getGraphNodeDimensions(fromA ?? { representation: "medium", media: null } as any);
      const toDims = getGraphNodeDimensions(toA ?? { representation: "medium", media: null } as any);

      const { from, to } = getConnectionPoints(
        positions[r.fromId], fromDims.width, fromDims.height,
        positions[r.toId], toDims.width, toDims.height,
        graphDirection
      );

      // Dim relation lines where either endpoint is outside the snapshot
      const dimmed = snapshotMemberIds
        ? !snapshotMemberIds.has(r.fromId) || !snapshotMemberIds.has(r.toId)
        : false;

      return {
        id: r.id,
        fromPosition: from,
        toPosition: to,
        relationType: dimmed
          ? { ...relationTypeMap[r.relationTypeId] ?? { id: r.relationTypeId, name: "unknown", label: "", color: "#555", description: null, icon: null, animated: false }, color: "#555" }
          : relationTypeMap[r.relationTypeId] ?? { id: r.relationTypeId, name: "unknown", label: "", color: "#555", description: null, icon: null, animated: false },
        isActive: true,
        direction: graphDirection,
      };
    });

  const addButtonPos = getAddButtonPosition(graphDirection);

  /** Check if an artifact is a member of the active snapshot (or no snapshot active). */
  const isInSnapshot = (id: string) => !snapshotMemberIds || snapshotMemberIds.has(id);

  return (
    <div style={{ width: canvasW, height: canvasH, position: "relative" }}>
      {/* CONCEPT container boxes */}
      {artifacts
        .filter((a) => conceptIds.has(a.id))
        .map((a) => {
          const c = containers[a.id];
          return (
            <ConceptContainer
              key={`container-${a.id}`}
              artifact={a}
              x={c.x}
              y={c.y}
              width={c.width}
              height={c.height}
              dimmed={!isInSnapshot(a.id)}
              onSelect={selectArtifact}
            />
          );
        })}

      {/* Regular artifact cards (non-CONCEPT) */}
      {artifacts
        .filter((a) => !conceptIds.has(a.id))
        .map((a) => {
          const pos = positions[a.id];
          if (!pos) return null;
          const childKind = CHILD_KIND[a.kind] ?? ("COMPONENT" as ArtifactKind);
          const dimmed = !isInSnapshot(a.id);
          return (
            <GraphCardWrapper
              key={a.id}
              x={pos.x}
              y={pos.y}
              artifact={a}
              childKind={childKind}
              addButtonPosition={addButtonPos}
              dimmed={dimmed}
              onSelect={dimmed ? undefined : selectArtifact}
              onAdd={dimmed ? undefined : openFormForSibling}
            />
          );
        })}

      {/* SVG overlay for relation lines */}
      <svg
        className="absolute inset-0"
        width={canvasW}
        height={canvasH}
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <style>{`
            @keyframes dash-flow {
              to { stroke-dashoffset: -24; }
            }
          `}</style>
        </defs>
        {relationLines.map((line) => (
          <SVGRelationLine key={line.id} data={line} />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONCEPT container — large rounded box with header info at top-left
// ---------------------------------------------------------------------------

function ConceptContainer({
  artifact,
  x,
  y,
  width,
  height,
  dimmed,
  onSelect,
}: {
  artifact: Artifact;
  x: number;
  y: number;
  width: number;
  height: number;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const accentColor = artifact.artifactType?.color ?? "#7F77DD";

  return (
    <div
      data-card
      className="absolute rounded-2xl border cursor-pointer transition-opacity duration-300"
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: `${accentColor}10`,
        borderColor: `${accentColor}93`,
        boxShadow: `0 0 25px 3px ${accentColor}53`,
        opacity: dimmed ? 0.4 : 1,
        pointerEvents: dimmed ? "none" : undefined,
      }}
      onClick={() => onSelect(artifact.id)}
      role="button"
      tabIndex={dimmed ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(artifact.id);
      }}
    >
      {/* Header info — top-left aligned */}
      <div className="flex flex-col items-start gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-100">{artifact.title}</h3>
          {artifact.stage && (
            <StageChip name={artifact.stage.name} color={artifact.stage.color} />
          )}
        </div>

        {artifact.summary && (
          <p className="text-[11px] text-zinc-400 leading-tight max-w-[280px]">
            {artifact.summary}
          </p>
        )}

        {artifact.categories.length > 0 && (
          <CategorySection categories={artifact.categories} max={4} />
        )}

        <KindFooter kind={artifact.kind} showLabel size={12} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper with hover add-button
// ---------------------------------------------------------------------------

function GraphCardWrapper({
  x,
  y,
  artifact,
  childKind,
  addButtonPosition,
  dimmed,
  onSelect,
  onAdd,
}: {
  x: number;
  y: number;
  artifact: GraphViewData["artifacts"][number];
  childKind: ArtifactKind;
  addButtonPosition: "below" | "right" | "left" | "above";
  dimmed: boolean;
  onSelect?: (id: string) => void;
  onAdd?: (kind: ArtifactKind, parentId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isHorizontal = addButtonPosition === "left" || addButtonPosition === "right";
  const showAddButton = !dimmed && hovered && onAdd;

  return (
    <div
      data-card
      className={`absolute transition-opacity duration-300 ${isHorizontal ? "flex items-center" : ""}`}
      style={{
        left: x,
        top: y,
        flexDirection: addButtonPosition === "left" ? "row-reverse" : undefined,
        opacity: dimmed ? 0.4 : 1,
        pointerEvents: dimmed ? "none" : undefined,
      }}
      onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onMouseLeave={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {addButtonPosition === "above" && (
        <div
          className="mb-1 overflow-hidden transition-all duration-200 ease-out"
          style={{ maxHeight: showAddButton ? 32 : 0, opacity: showAddButton ? 1 : 0 }}
        >
          <AddSiblingButton kind={childKind} onClick={() => onAdd!(childKind, artifact.id)} fullWidth />
        </div>
      )}

      {addButtonPosition === "left" && (
        <div
          className="mr-1 overflow-hidden transition-all duration-200 ease-out"
          style={{ maxWidth: showAddButton ? 32 : 0, opacity: showAddButton ? 1 : 0 }}
        >
          <AddSiblingButton kind={childKind} onClick={() => onAdd!(childKind, artifact.id)} />
        </div>
      )}

      <ArtifactCard artifact={artifact} onClick={onSelect ? (id) => onSelect(id) : undefined} />

      {addButtonPosition === "right" && (
        <div
          className="ml-1 overflow-hidden transition-all duration-200 ease-out"
          style={{ maxWidth: showAddButton ? 32 : 0, opacity: showAddButton ? 1 : 0 }}
        >
          <AddSiblingButton kind={childKind} onClick={() => onAdd!(childKind, artifact.id)} />
        </div>
      )}

      {addButtonPosition === "below" && (
        <div
          className="mt-1 overflow-hidden transition-all duration-200 ease-out"
          style={{ maxHeight: showAddButton ? 32 : 0, opacity: showAddButton ? 1 : 0 }}
        >
          <AddSiblingButton kind={childKind} onClick={() => onAdd!(childKind, artifact.id)} fullWidth />
        </div>
      )}
    </div>
  );
}
