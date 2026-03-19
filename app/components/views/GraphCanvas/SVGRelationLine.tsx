/**
 * @layer view
 * @description SVG cubic bezier line connecting two artifact cards on the GraphCanvas.
 *   Animated stroke-dashoffset when relationType.animated; glow filter via drop-shadow.
 *   Direction-aware: adjusts bezier control points for UP/DOWN/LEFT/RIGHT layouts.
 * @consumes RelationLineData
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import type { RelationLineData } from "../../../lib/types.js";

export type SVGRelationLineProps = {
  data: RelationLineData;
};

/**
 * Builds a cubic bezier path string based on the ELK layout direction.
 *
 * - DOWN:  vertical handles (source bottom → target top)
 * - UP:    vertical handles (source top → target bottom)
 * - RIGHT: horizontal handles (source right → target left)
 * - LEFT:  horizontal handles (source left → target right)
 */
function buildBezierPath(
  fx: number, fy: number,
  tx: number, ty: number,
  direction: string
): string {
  const offset = 60;

  switch (direction) {
    case "LEFT":
    case "RIGHT": {
      // Horizontal handles
      const cp1x = fx + (direction === "RIGHT" ? offset : -offset);
      const cp2x = tx + (direction === "RIGHT" ? -offset : offset);
      return `M ${fx} ${fy} C ${cp1x} ${fy}, ${cp2x} ${ty}, ${tx} ${ty}`;
    }
    case "UP": {
      // Vertical handles — source top, target bottom
      const cp1y = fy - offset;
      const cp2y = ty + offset;
      return `M ${fx} ${fy} C ${fx} ${cp1y}, ${tx} ${cp2y}, ${tx} ${ty}`;
    }
    case "DOWN":
    default: {
      // Vertical handles — source bottom, target top
      const cp1y = fy + offset;
      const cp2y = ty - offset;
      return `M ${fx} ${fy} C ${fx} ${cp1y}, ${tx} ${cp2y}, ${tx} ${ty}`;
    }
  }
}

export function SVGRelationLine({ data }: SVGRelationLineProps) {
  const { fromPosition, toPosition, relationType, isActive, isHighlighted } = data;

  if (!isActive) return null;

  const d = buildBezierPath(
    fromPosition.x, fromPosition.y,
    toPosition.x, toPosition.y,
    data.direction ?? "DOWN"
  );

  const strokeWidth = isHighlighted ? 2.5 : 1.5;
  const filterId = `glow-${data.id}`;

  return (
    <g>
      {/* Glow filter: drop-shadow in relation color at 30% opacity, blur 4px */}
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="4"
            floodColor={relationType.color}
            floodOpacity="0.3"
          />
        </filter>
      </defs>

      <path
        d={d}
        fill="none"
        stroke={relationType.color}
        strokeWidth={strokeWidth}
        filter={`url(#${filterId})`}
        strokeLinecap="round"
        className={relationType.animated ? "relation-line-animated" : undefined}
        style={
          relationType.animated
            ? {
                strokeDasharray: "8 4",
                animation: "dash-flow 1.5s linear infinite",
              }
            : undefined
        }
      />
    </g>
  );
}
