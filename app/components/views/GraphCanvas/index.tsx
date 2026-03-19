/**
 * @layer view
 * @description GraphCanvas wrapper with toggle between "Graph" (ELK tree layout)
 *   and "Box" (nested rectangles) sub-views. Shared pan/zoom container.
 * @consumes ProjectGraph from Zustand store
 * @emits selectArtifact via store
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { GraphView } from "./GraphView.js";
import { BoxView } from "./BoxView.js";
import { useStore } from "~/lib/store.js";
import type { ElkDirection } from "~/lib/store/uiSlice.js";
import type { ArtifactType, Stage } from "~/lib/types.js";

type CanvasMode = "graph" | "box";

export type GraphCanvasProps = {
  artifactTypes?: ArtifactType[];
  stages?: Stage[];
  projectSlug?: string;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const ZOOM_SENSITIVITY = 0.001;

export function GraphCanvas({
  artifactTypes = [],
  stages = [],
  projectSlug = "",
}: GraphCanvasProps = {}) {
  const [mode, setMode] = useState<CanvasMode>("box");
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Pan/zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // Center content on initial load
  useEffect(() => {
    if (isInitialized || !containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    // Wait a tick for content to render
    setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      // Center the content in the viewport
      const centerX = (containerRect.width - contentRect.width) / 2;
      const centerY = (containerRect.height - contentRect.height) / 2;

      setPan({ x: Math.max(centerX, 100), y: Math.max(centerY, 100) });
      setIsInitialized(true);
    }, 100);
  }, [isInitialized, mode]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Don't pan when clicking buttons or cards
    if ((e.target as HTMLElement).closest("button, [data-card]")) return;
    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
  }, []);

  const graphDirection = useStore((s) => s.graphDirection);
  const setGraphDirection = useStore((s) => s.setGraphDirection);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--canvas-bg)", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      {/* Mode toggle — top right, below RelationLayerToggle */}
      <div className="absolute right-4 top-16 z-10 flex gap-0.5 rounded-lg bg-zinc-900/80 p-0.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            setMode("graph");
            setIsInitialized(false);
          }}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            mode === "graph"
              ? "bg-zinc-600 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Graph
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("box");
            setIsInitialized(false);
          }}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            mode === "box"
              ? "bg-zinc-600 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Box
        </button>
      </div>

      {/* Direction picker flower — only visible in graph mode */}
      {mode === "graph" && (
        <DirectionPicker active={graphDirection} onChange={(d) => { setGraphDirection(d); setIsInitialized(false); }} />
      )}

      {/* Pannable/zoomable inner container */}
      <div
        ref={contentRef}
        className="inner-container absolute origin-top-left w-[65vw]"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {mode === "graph" ? (
          <GraphView />
        ) : (
          <BoxView
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Direction Picker — flower/cross layout
// ---------------------------------------------------------------------------

const DIRECTIONS: { dir: ElkDirection; label: string; row: number; col: number }[] = [
  { dir: "UP",    label: "↑", row: 0, col: 1 },
  { dir: "LEFT",  label: "←", row: 1, col: 0 },
  { dir: "RIGHT", label: "→", row: 1, col: 2 },
  { dir: "DOWN",  label: "↓", row: 2, col: 1 },
];

function DirectionPicker({
  active,
  onChange,
}: {
  active: ElkDirection;
  onChange: (d: ElkDirection) => void;
}) {
  return (
    <div className="absolute right-4 top-[7.5rem] z-10 rounded-lg bg-zinc-900/80 p-1 backdrop-blur-sm">
      <div className="grid grid-cols-3 grid-rows-3 gap-0" style={{ width: 68, height: 68 }}>
        {DIRECTIONS.map(({ dir, label, row, col }) => (
          <button
            key={dir}
            type="button"
            onClick={() => onChange(dir)}
            className={`flex items-center justify-center rounded text-[13px] font-medium transition-colors ${
              active === dir
                ? "bg-zinc-600 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            style={{
              gridRow: row + 1,
              gridColumn: col + 1,
              width: 22,
              height: 22,
            }}
            title={dir}
          >
            {label}
          </button>
        ))}
        {/* Center label */}
        <span
          className="flex items-center justify-center text-[9px] text-zinc-500 select-none"
          style={{ gridRow: 2, gridColumn: 2 }}
        >
          dir
        </span>
      </div>
    </div>
  );
}
