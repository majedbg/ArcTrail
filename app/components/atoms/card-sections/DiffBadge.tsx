/**
 * @layer atom
 * @description Shows a diff status label when the artifact has changed
 *   relative to a snapshot comparison. Renders nothing when unchanged.
 */

import type { DiffStatus } from "~/lib/types.js";
import { Badge } from "../Badge.js";
import { DIFF_TOKENS } from "~/lib/tokens.js";

export type DiffBadgeProps = {
  diffStatus: DiffStatus;
  className?: string;
};

export function DiffBadge({ diffStatus, className = "" }: DiffBadgeProps) {
  if (diffStatus === "unchanged") return null;

  const diffToken = DIFF_TOKENS[diffStatus];

  return (
    <Badge
      label={diffToken.label}
      bgClass="bg-transparent"
      textClass="text-zinc-200"
      className={`border text-[10px] ${className}`}
    />
  );
}
