/**
 * @layer atom
 * @description ArtifactKind icon with optional label, colored via ARTIFACT_KIND_TOKENS.
 * @consumes kind: ArtifactKind, showLabel (optional)
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import { ARTIFACT_KIND_TOKENS } from "../../lib/tokens.js";
import type { ArtifactKind } from "../../lib/tokens.js";
import { Icon } from "./Icon.js";
import type { IconName } from "./Icon.js";

export type KindIconProps = {
  kind: ArtifactKind;
  /** Show the kind name as a text label beside the icon (default: false). */
  showLabel?: boolean;
  /** Icon size in pixels (default: 14). */
  size?: number;
  className?: string;
};

const KIND_TO_ICON: Record<ArtifactKind, IconName> = {
  CONCEPT: "concept",
  PROTOTYPE: "prototype",
  SUBSYSTEM: "subsystem",
  FEATURE: "feature",
  VARIATION: "variation",
  COMPONENT: "component",
};

export function KindIcon({
  kind,
  showLabel = false,
  size = 14,
  className = "",
}: KindIconProps) {
  const token = ARTIFACT_KIND_TOKENS[kind];

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      style={{ color: token.color }}
    >
      <Icon name={KIND_TO_ICON[kind]} size={size} />
      {showLabel && (
        <span className="text-[10px] font-medium uppercase tracking-wide">
          {kind}
        </span>
      )}
    </span>
  );
}
