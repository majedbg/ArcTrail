import type { IterationNode } from "~/lib/types";
import { MediaThumb } from "./MediaThumb";

interface NodeCardProps {
  node: IterationNode;
  onSelect?: () => void;
  className?: string;
}

export function NodeCard({ node, onSelect, className = "" }: NodeCardProps) {
  const firstMedia = node.media?.[0];

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{node.title}</h3>
        <time className="text-sm text-gray-500">{node.dateISO}</time>
      </div>

      {node.categories.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {node.categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {node.summary && (
        <p className="mb-2 text-sm text-gray-600 line-clamp-2">{node.summary}</p>
      )}

      {firstMedia && (
        <div className="mt-2">
          <MediaThumb media={firstMedia} className="h-24 w-full" />
        </div>
      )}

      {node.metrics && Object.keys(node.metrics).length > 0 && (
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          {Object.entries(node.metrics).map(([key, value]) => (
            <span key={key}>
              {key}: {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

