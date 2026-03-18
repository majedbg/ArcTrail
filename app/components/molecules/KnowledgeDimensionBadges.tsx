/**
 * @layer molecule
 * @description Row of Badge atoms for knowledge dimensions (form, function, manufacturing, ux, performance).
 * @consumes dimensions: KnowledgeDimension[]
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import type { KnowledgeDimension } from "../../lib/types.js";
import { Badge } from "../atoms/Badge.js";

export type KnowledgeDimensionBadgesProps = {
  dimensions: KnowledgeDimension[];
  className?: string;
};

const DIMENSION_COLORS: Record<KnowledgeDimension, string> = {
  form: "bg-kind-concept",
  function: "bg-kind-prototype",
  manufacturing: "bg-kind-subsystem",
  ux: "bg-kind-feature",
  performance: "bg-kind-component",
};

export function KnowledgeDimensionBadges({
  dimensions,
  className = "",
}: KnowledgeDimensionBadgesProps) {
  if (dimensions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {dimensions.map((dim) => (
        <Badge
          key={dim}
          label={dim}
          bgClass={DIMENSION_COLORS[dim]}
          textClass="text-white"
        />
      ))}
    </div>
  );
}
