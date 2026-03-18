/**
 * @layer atom
 * @description Animated "+" button that expands on hover to reveal "Add {kind}" label.
 *   Appears as a sibling to the hovered artifact in BoxView/GraphView.
 *   Uses the artifact kind's token color.
 * @consumes kind: ArtifactKind, onClick, fullWidth
 * @emits onClick
 * @diffAware false
 * @tiltEnabled false
 */

import { ARTIFACT_KIND_TOKENS } from "~/lib/tokens.js";
import type { ArtifactKind } from "~/lib/tokens.js";

export type AddSiblingButtonProps = {
  kind: ArtifactKind;
  onClick: () => void;
  /** When true, button spans full container width with centered content. */
  fullWidth?: boolean;
  className?: string;
};

const KIND_LABELS: Record<ArtifactKind, string> = {
  CONCEPT: "Concept",
  PROTOTYPE: "Prototype",
  SUBSYSTEM: "Subsystem",
  FEATURE: "Feature",
  VARIATION: "Variation",
  COMPONENT: "Component",
};

export function AddSiblingButton({
  kind,
  onClick,
  fullWidth = false,
  className = "",
}: AddSiblingButtonProps) {
  const token = ARTIFACT_KIND_TOKENS[kind];

  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150 hover:brightness-125 ${className}`}
        style={{
          backgroundColor: `${token.color}18`,
          border: `1.5px dashed ${token.color}55`,
          color: token.color,
        }}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="flex-shrink-0"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {KIND_LABELS[kind]}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`group/add inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-200 ease-out hover:gap-1.5 ${className}`}
      style={{
        backgroundColor: `${token.color}22`,
        border: `1.5px dashed ${token.color}66`,
        color: token.color,
        padding: "4px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.padding = "4px 10px 4px 6px";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.padding = "4px";
      }}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        className="flex-shrink-0"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide opacity-0 transition-all duration-200 ease-out group-hover/add:max-w-[80px] group-hover/add:opacity-100">
        {KIND_LABELS[kind]}
      </span>
    </button>
  );
}
