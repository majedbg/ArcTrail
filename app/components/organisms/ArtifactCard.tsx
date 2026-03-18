/**
 * @layer organism
 * @description Dispatcher organism: reads artifact.representation and renders the correct molecule variant.
 * @consumes artifact: Artifact
 * @emits onClick(artifactId: string)
 * @diffAware false (delegates to molecules which are diff-aware)
 * @tiltEnabled false (tilt is applied at molecule level per spec §25.9)
 */

import type { Artifact } from "../../lib/types.js";
import { ArtifactCardRich } from "../molecules/ArtifactCardRich.js";
import { ArtifactCardMedium } from "../molecules/ArtifactCardMedium.js";
import { ArtifactCardMinimal } from "../molecules/ArtifactCardMinimal.js";

export type ArtifactCardProps = {
  artifact: Artifact;
  onClick?: (artifactId: string) => void;
  className?: string;
};

export function ArtifactCard({ artifact, onClick, className }: ArtifactCardProps) {
  switch (artifact.representation) {
    case "rich":
      return <ArtifactCardRich artifact={artifact} onClick={onClick} className={className} />;
    case "minimal":
      return <ArtifactCardMinimal artifact={artifact} onClick={onClick} className={className} />;
    case "medium":
    default:
      return <ArtifactCardMedium artifact={artifact} onClick={onClick} className={className} />;
  }
}
