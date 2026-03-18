/**
 * @layer molecule
 * @description Compact journal entry preview — title, date, summary snippet, dimension badges.
 * @consumes entry: Entry
 * @emits onClick (optional)
 * @diffAware false
 * @tiltEnabled false
 */

import type { Entry } from "../../lib/types.js";
import { Badge } from "../atoms/Badge.js";

export type EntryPreviewProps = {
  entry: Entry;
  onClick?: () => void;
  className?: string;
};

const DIMENSION_COLORS: Record<string, string> = {
  form: "bg-kind-concept",
  function: "bg-kind-prototype",
  manufacturing: "bg-kind-subsystem",
  ux: "bg-kind-feature",
  performance: "bg-kind-component",
};

export function EntryPreview({
  entry,
  onClick,
  className = "",
}: EntryPreviewProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg bg-zinc-800/50 p-2.5 ${
        onClick ? "cursor-pointer hover:bg-zinc-800" : ""
      } ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-zinc-200 line-clamp-1">
          {entry.title}
        </span>
        <span className="flex-shrink-0 text-[10px] text-zinc-500">
          {entry.dateISO}
        </span>
      </div>

      {entry.summary && (
        <p className="text-xs text-zinc-400 line-clamp-2">{entry.summary}</p>
      )}

      {entry.knowledgeDimensions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.knowledgeDimensions.map((dim) => (
            <Badge
              key={dim}
              label={dim}
              bgClass={DIMENSION_COLORS[dim] ?? "bg-zinc-700"}
              textClass="text-white"
            />
          ))}
        </div>
      )}
    </div>
  );
}
