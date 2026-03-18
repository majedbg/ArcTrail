/**
 * @layer view
 * @description SVG cubic bezier line connecting two artifact cards on the GraphCanvas.
 *   Animated stroke-dashoffset when relationType.animated; glow filter via drop-shadow.
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
 * SVG bezier curve math:
 *   - fromPos = source card center-bottom
 *   - toPos = target card center-top
 *   - Control points use vertical handles for the upward tree direction:
 *     cp1: (fromX, fromY - 60)  — pull downward from source
 *     cp2: (toX,   toY   + 60)  — pull upward toward target
 *   - This produces smooth S-curves for the layered upward tree.
 */
export function SVGRelationLine({ data }: SVGRelationLineProps) {
  const { fromPosition, toPosition, relationType, isActive, isHighlighted } = data;

  if (!isActive) return null;

  const fx = fromPosition.x;
  const fy = fromPosition.y;
  const tx = toPosition.x;
  const ty = toPosition.y;

  // Vertical handle offset for smooth bezier (DOWN direction: source above, target below)
  const handleOffset = 60;
  const cp1y = fy + handleOffset;
  const cp2y = ty - handleOffset;

  const d = `M ${fx} ${fy} C ${fx} ${cp1y}, ${tx} ${cp2y}, ${tx} ${ty}`;

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
