/**
 * @layer view
 * @description ELK-based vertical tree layout with positioned ArtifactCards and SVG relation lines.
 *   Direction: DOWN (root at top, children grow downward).
 * @consumes ProjectGraph from Zustand store, deriveGraphViewData
 * @emits selectArtifact via store
 */

import { useState, useEffect } from "react";
import { useStore } from "~/lib/store.js";
import { deriveGraphViewData } from "~/lib/derived/graphView.js";
import { ArtifactCard } from "../../organisms/ArtifactCard.js";
import { SVGRelationLine } from "./SVGRelationLine.js";
import { AddSiblingButton } from "../../atoms/AddSiblingButton.js";
import type { GraphViewData, RelationLineData } from "~/lib/types.js";
import type { ArtifactKind } from "~/lib/tokens.js";

// Card dimension lookup (must match elk.ts)
const CARD_WIDTH: Record<string, number> = { rich: 280, medium: 200, minimal: 48 };
const CARD_HEIGHT: Record<string, number> = { rich: 120, medium: 80, minimal: 48 };

/** Map parent kind → child kind for the add button. */
const CHILD_KIND: Record<string, ArtifactKind> = {
  CONCEPT: "PROTOTYPE",
  PROTOTYPE: "SUBSYSTEM",
  SUBSYSTEM: "FEATURE",
  FEATURE: "COMPONENT",
  VARIATION: "COMPONENT",
  COMPONENT: "COMPONENT",
};

export function GraphView() {
  const projectGraph = useStore((s) => s.projectGraph);
  const activeRelationTypeIds = useStore((s) => s.activeRelationTypeIds);
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
    deriveGraphViewData(projectGraph, activeRelationTypeIds).then((data) => {
      if (!cancelled) {
        setViewData(data);
        setPositions(data.positions);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectGraph, activeRelationTypeIds, setPositions]);

  if (!viewData) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading graph…
      </div>
    );
  }

  const { positions, artifacts, relations, relationTypeMap } = viewData;

  // Canvas dimensions
  let maxX = 0;
  let maxY = 0;
  for (const a of artifacts) {
    const pos = positions[a.id];
    if (!pos) continue;
    const w = CARD_WIDTH[a.representation] ?? 200;
    const h = CARD_HEIGHT[a.representation] ?? 80;
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  }
  const canvasW = maxX + 200;
  const canvasH = maxY + 200;

  // Build relation line data
  const relationLines: RelationLineData[] = relations
    .filter((r) => positions[r.fromId] && positions[r.toId])
    .map((r) => {
      const fromA = artifacts.find((a) => a.id === r.fromId);
      const toA = artifacts.find((a) => a.id === r.toId);
      const fromW = CARD_WIDTH[fromA?.representation ?? "medium"] ?? 200;
      const fromH = CARD_HEIGHT[fromA?.representation ?? "medium"] ?? 80;
      const toW = CARD_WIDTH[toA?.representation ?? "medium"] ?? 200;

      return {
        id: r.id,
        fromPosition: {
          x: positions[r.fromId].x + fromW / 2,
          y: positions[r.fromId].y + fromH,
        },
        toPosition: {
          x: positions[r.toId].x + toW / 2,
          y: positions[r.toId].y,
        },
        relationType: relationTypeMap[r.relationTypeId] ?? {
          id: r.relationTypeId,
          name: "unknown",
          label: "",
          color: "#555",
          description: null,
          icon: null,
          animated: false,
        },
        isActive: true,
      };
    });

  return (
    <div style={{ width: canvasW, height: canvasH, position: "relative" }}>
      {/* Artifact cards with hover add-button */}
      {artifacts.map((a) => {
        const pos = positions[a.id];
        if (!pos) return null;
        const childKind = CHILD_KIND[a.kind] ?? ("COMPONENT" as ArtifactKind);
        return (
          <GraphCardWrapper
            key={a.id}
            x={pos.x}
            y={pos.y}
            artifact={a}
            childKind={childKind}
            onSelect={selectArtifact}
            onAdd={openFormForSibling}
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
// Card wrapper with hover add-button
// ---------------------------------------------------------------------------

function GraphCardWrapper({
  x,
  y,
  artifact,
  childKind,
  onSelect,
  onAdd,
}: {
  x: number;
  y: number;
  artifact: GraphViewData["artifacts"][number];
  childKind: ArtifactKind;
  onSelect: (id: string) => void;
  onAdd: (kind: ArtifactKind, parentId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-card
      className="absolute"
      style={{ left: x, top: y }}
      onMouseEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onMouseLeave={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <ArtifactCard artifact={artifact} onClick={(id) => onSelect(id)} />
      <div
        className="mt-1 overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: hovered ? 32 : 0,
          opacity: hovered ? 1 : 0,
        }}
      >
        <AddSiblingButton
          kind={childKind}
          onClick={() => onAdd(childKind, artifact.id)}
          fullWidth
        />
      </div>
    </div>
  );
}
