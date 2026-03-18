/**
 * @layer atom
 * @description Colored pill showing stage name, color derived from Stage type or STAGE_TOKENS fallback.
 * @consumes name: string, color: string
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import { STAGE_TOKENS } from "../../lib/tokens.js";

export type StageChipProps = {
  /** Stage display name (e.g. "idea", "research"). */
  name: string;
  /** Explicit color override. Falls back to STAGE_TOKENS lookup. */
  color?: string;
  className?: string;
};

export function StageChip({ name, color, className = "" }: StageChipProps) {
  const tokenKey = name.toLowerCase() as keyof typeof STAGE_TOKENS;
  const resolvedColor =
    color ?? STAGE_TOKENS[tokenKey]?.color ?? "var(--color-stage-idea)";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      style={{
        backgroundColor: resolvedColor,
        color: "#fff",
      }}
    >
      {name}
    </span>
  );
}
