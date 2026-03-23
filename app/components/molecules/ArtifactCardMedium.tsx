/**
 * @layer molecule
 * @description Medium card (200px) with title, category badges, kind icon,
 *   optional media thumbnail. Tilt + diff-aware. Composes from shared
 *   card-sections for maintainability.
 * @consumes artifact: Artifact, DiffContext (via hook)
 * @emits onClick(artifactId: string)
 * @diffAware true
 * @tiltEnabled true
 */

import type { Artifact } from "../../lib/types.js";
import { useDiffStatus } from "../../contexts/DiffContext.js";
import { KindIcon } from "../atoms/KindIcon.js";
import {
  CardShell,
  TitleSection,
  MediaSection,
  CategorySection,
  DiffBadge,
} from "../atoms/card-sections/index.js";

export type ArtifactCardMediumProps = {
  artifact: Artifact;
  onClick?: (artifactId: string) => void;
  className?: string;
};

export function ArtifactCardMedium({
  artifact,
  onClick,
  className = "",
}: ArtifactCardMediumProps) {
  const diffStatus = useDiffStatus(artifact.id);

  const accentColor =
    artifact.artifactType?.color ?? "var(--color-kind-feature)";

  return (
    <CardShell
      accentColor={accentColor}
      widthClass="w-auto"
      diffStatus={diffStatus}
      tilt={{ factor: 8, scale: 1.02 }}
      onClick={onClick ? () => onClick(artifact.id) : undefined}
      className={className}
    >
      <div className="flex flex-col gap-1.5 p-3">
        <TitleSection
          title={artifact.title}
          trailing={<KindIcon kind={artifact.kind} size={14} />}
        />

        <CategorySection categories={artifact.categories} max={3} />

        <MediaSection media={artifact.media} />

        <DiffBadge diffStatus={diffStatus} className="self-start" />
      </div>
    </CardShell>
  );
}
