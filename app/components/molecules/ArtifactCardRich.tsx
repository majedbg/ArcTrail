/**
 * @layer molecule
 * @description Rich card rendering for CONCEPT and PROTOTYPE artifacts — includes
 *   media thumbnail, summary, stage badge, categories, and 3D tilt effect.
 * @consumes artifact: Artifact, DiffContext (via hook)
 * @emits onClick(artifactId: string)
 * @diffAware true
 * @tiltEnabled true
 */

import type { Artifact } from "../../lib/types.js";
import { DIFF_TOKENS } from "../../lib/tokens.js";
import { useTilt } from "../../hooks/useTilt.js";
import { useDiffStatus } from "../../contexts/DiffContext.js";
import { Badge } from "../atoms/Badge.js";
import { KindIcon } from "../atoms/KindIcon.js";
import { StageChip } from "../atoms/StageChip.js";
import { MediaThumb } from "../atoms/MediaThumb.js";

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
  const { ref, onMouseMove, onMouseLeave } = useTilt({
    factor: 12,
    scale: 1.02,
  });

  const diffStatus = useDiffStatus(artifact.id);
  const diffToken = DIFF_TOKENS[diffStatus];
  const isDiffed = diffStatus !== "unchanged";

  const accentColor =
    artifact.artifactType?.color ?? "var(--color-kind-concept)";
  const firstMedia = artifact.media?.[0] ?? null;

  return (
    <div
      ref={ref}
      className={`tilt-card w-[280px] min-h-[120px] rounded-2xl bg-white/90 shadow-md backdrop-blur-sm dark:bg-zinc-900/90 ${className}`}
      style={{
        borderLeft: `4px solid ${accentColor}`,
        ...(isDiffed
          ? { boxShadow: `0 0 8px 1px ${diffToken.color}` }
          : undefined),
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick?.(artifact.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(artifact.id);
      }}
    >
      <div className="flex flex-col gap-2 p-3">
        {/* Header: title + stage badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">
              {artifact.title}
            </h3>
            {artifact.dateISO && (
              <span className="text-[10px] text-zinc-500">
                {artifact.dateISO}
              </span>
            )}
          </div>
          {artifact.stage && (
            <StageChip name={artifact.stage.name} color={artifact.stage.color} />
          )}
        </div>

        {/* Category badges */}
        {artifact.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {artifact.categories.slice(0, 4).map((cat) => (
              <Badge key={cat} label={cat} bgClass="bg-zinc-700/60" textClass="text-zinc-300" />
            ))}
          </div>
        )}

        {/* Media thumbnail + summary */}
        <div className="flex gap-2">
          {firstMedia && (
            <MediaThumb
              src={firstMedia.src}
              alt={firstMedia.alt}
              type={firstMedia.type}
            />
          )}
          {artifact.summary && (
            <p className="flex-1 text-xs text-zinc-400 line-clamp-2">
              {artifact.summary}
            </p>
          )}
        </div>

        {/* Footer: kind badge + diff label */}
        <div className="flex items-center justify-between">
          <KindIcon kind={artifact.kind} showLabel size={12} />
          {isDiffed && (
            <Badge
              label={diffToken.label}
              bgClass="bg-transparent"
              textClass="text-zinc-200"
              className="border text-[10px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
