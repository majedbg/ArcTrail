/**
 * @layer molecule
 * @description 48×48 circle with kind-colored background, initials center, title label beneath. No tilt.
 * @consumes artifact: Artifact
 * @emits onClick(artifactId: string)
 * @diffAware true
 * @tiltEnabled false
 */

import type { Artifact } from "../../lib/types.js";
import { ARTIFACT_KIND_TOKENS } from "../../lib/tokens.js";
import { useDiffStatus } from "../../contexts/DiffContext.js";
import { DIFF_TOKENS } from "../../lib/tokens.js";
import { KindIcon } from "../atoms/KindIcon.js";

export type ArtifactCardMinimalProps = {
  artifact: Artifact;
  onClick?: (artifactId: string) => void;
  className?: string;
};

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ArtifactCardMinimal({
  artifact,
  onClick,
  className = "",
}: ArtifactCardMinimalProps) {
  const token = ARTIFACT_KIND_TOKENS[artifact.kind];
  const diffStatus = useDiffStatus(artifact.id);
  const diffToken = DIFF_TOKENS[diffStatus];

  const borderStyle =
    diffStatus !== "unchanged"
      ? { boxShadow: `0 0 0 2px ${diffToken.color}` }
      : undefined;

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => onClick?.(artifact.id)}
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
        style={{
          backgroundColor: `${token.color}33`,
          border: `2px solid ${token.color}`,
          minWidth: 44,
          minHeight: 44,
          ...borderStyle,
        }}
        aria-label={artifact.title}
      >
        {artifact.artifactType?.icon ? (
          <KindIcon kind={artifact.kind} size={20} />
        ) : (
          <span
            className="text-xs font-bold"
            style={{ color: token.color }}
          >
            {getInitials(artifact.title)}
          </span>
        )}
      </button>
      <span className="max-w-[64px] truncate text-center text-[10px] text-zinc-400">
        {artifact.title}
      </span>
    </div>
  );
}
