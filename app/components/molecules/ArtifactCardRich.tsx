/**
 * @layer molecule
 * @description Rich card rendering for CONCEPT and PROTOTYPE artifacts — includes
 *   media thumbnail, summary, stage badge, categories, and 3D tilt effect.
 *   Composes from shared card-sections for maintainability.
 * @consumes artifact: Artifact, DiffContext (via hook)
 * @emits onClick(artifactId: string)
 * @diffAware true
 * @tiltEnabled true
 */

import type { Artifact } from "../../lib/types.js";
import { useDiffStatus } from "../../contexts/DiffContext.js";
import { StageChip } from "../atoms/StageChip.js";
import {
  CardShell,
  TitleSection,
  MediaSection,
  CategorySection,
  KindFooter,
  DiffBadge,
} from "../atoms/card-sections/index.js";

export type ArtifactCardRichProps = {
  artifact: Artifact;
  onClick?: (artifactId: string) => void;
  className?: string;
};

export function ArtifactCardRich({
  artifact,
  onClick,
  className = "",
}: ArtifactCardRichProps) {
  const diffStatus = useDiffStatus(artifact.id);

  const accentColor =
    artifact.artifactType?.color ?? "var(--color-kind-concept)";

  return (
    <CardShell
      accentColor={accentColor}
      widthClass="w-[280px]"
      diffStatus={diffStatus}
      tilt={{ factor: 12, scale: 1.02 }}
      onClick={onClick ? () => onClick(artifact.id) : undefined}
      className={className}
    >
      <div className="flex flex-col gap-2 p-3">
        <TitleSection
          title={artifact.title}
          dateISO={artifact.dateISO}
          trailing={
            artifact.stage ? (
              <StageChip
                name={artifact.stage.name}
                color={artifact.stage.color}
              />
            ) : undefined
          }
        />

        <CategorySection categories={artifact.categories} max={4} />

        <MediaSection media={artifact.media} summary={artifact.summary} />

        <KindFooter
          kind={artifact.kind}
          showLabel
          size={12}
          trailing={<DiffBadge diffStatus={diffStatus} />}
        />
      </div>
    </CardShell>
  );
}
