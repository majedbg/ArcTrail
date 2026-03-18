/**
 * @layer molecule
 * @description Medium card (200px) with title, category badges, kind icon. Tilt + diff-aware.
 * @consumes artifact: Artifact, DiffContext (via hook)
 * @emits onClick(artifactId: string)
 * @diffAware true
 * @tiltEnabled true
 */

import type { Artifact } from "../../lib/types.js";
import { DIFF_TOKENS } from "../../lib/tokens.js";
import { useTilt } from "../../hooks/useTilt.js";
import { useDiffStatus } from "../../contexts/DiffContext.js";
import { KindIcon } from "../atoms/KindIcon.js";
import { Badge } from "../atoms/Badge.js";

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
  const { ref, onMouseMove, onMouseLeave } = useTilt({
    factor: 8,
    scale: 1.02,
  });

  const diffStatus = useDiffStatus(artifact.id);
  const diffToken = DIFF_TOKENS[diffStatus];
  const isDiffed = diffStatus !== "unchanged";

  const accentColor =
    artifact.artifactType?.color ?? "var(--color-kind-feature)";

  return (
    <div
      ref={ref}
      className={`tilt-card w-[200px] min-h-[80px] rounded-2xl bg-white/90 shadow-md backdrop-blur-sm dark:bg-zinc-900/90 ${className}`}
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
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-semibold text-zinc-100 line-clamp-2">
            {artifact.title}
          </span>
          <KindIcon kind={artifact.kind} size={14} />
        </div>

        {artifact.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {artifact.categories.slice(0, 3).map((cat) => (
              <Badge key={cat} label={cat} bgClass="bg-zinc-700/60" textClass="text-zinc-300" />
            ))}
          </div>
        )}

        {isDiffed && (
          <Badge
            label={diffToken.label}
            bgClass="bg-transparent"
            textClass="text-zinc-200"
            className="self-start border text-[10px]"
          />
        )}
      </div>
    </div>
  );
}
