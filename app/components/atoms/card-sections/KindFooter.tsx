/**
 * @layer atom
 * @description Footer row with kind icon/label on the left and an optional
 *   trailing slot (e.g. DiffBadge) on the right.
 */

import { KindIcon } from "../KindIcon.js";
import type { ArtifactKind } from "~/lib/tokens.js";

export type KindFooterProps = {
  kind: ArtifactKind;
  showLabel?: boolean;
  size?: number;
  trailing?: React.ReactNode;
};

export function KindFooter({
  kind,
  showLabel = true,
  size = 12,
  trailing,
}: KindFooterProps) {
  return (
    <div className="flex items-center justify-between">
      <KindIcon kind={kind} showLabel={showLabel} size={size} />
      {trailing}
    </div>
  );
}
