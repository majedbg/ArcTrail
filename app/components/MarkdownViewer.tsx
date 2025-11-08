import { useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { IterationNode } from "~/lib/types";
import { NodeCard } from "./NodeCard";

interface MarkdownViewerProps {
  node: IterationNode;
  className?: string;
}

export function MarkdownViewer({ node, className = "" }: MarkdownViewerProps) {
  const hasMarkdown = node.contentMd && node.contentMd.trim().length > 0;
  const showBoth = node.showBoth ?? false;

  // No markdown: show details only
  if (!hasMarkdown) {
    return <NodeCard node={node} className={className} />;
  }

  // Markdown exists but showBoth is false: show markdown only
  if (hasMarkdown && !showBoth) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
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
        <div className="prose prose-sm max-w-none">
          <MarkdownPreview
            source={node.contentMd || ""}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          />
        </div>
      </div>
    );
  }

  // Markdown exists and showBoth is true: show tabs
  const [activeTab, setActiveTab] = useState<"markdown" | "details">("markdown");

  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="border-b p-4">
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("markdown")}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === "markdown"
                ? "bg-black text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "bg-black text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Details
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "markdown" ? (
          <div className="prose prose-sm max-w-none">
            <MarkdownPreview
              source={node.contentMd || ""}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            />
          </div>
        ) : (
          <div>
            {node.summary && (
              <p className="mb-4 text-sm text-gray-600">{node.summary}</p>
            )}
            {node.media && node.media.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {node.media.map((item, idx) => (
                  <div key={idx} className="rounded border">
                    {item.type === "img" ? (
                      <img
                        src={item.src}
                        alt={item.alt || ""}
                        className="h-32 w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={item.src}
                        className="h-32 w-full rounded object-cover"
                        controls
                        muted
                        playsInline
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {node.metrics && Object.keys(node.metrics).length > 0 && (
              <div className="mt-4 flex gap-4 text-xs text-gray-500">
                {Object.entries(node.metrics).map(([key, value]) => (
                  <span key={key}>
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
            {!node.summary && (!node.media || node.media.length === 0) && (
              <p className="text-sm text-gray-500">No details available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

