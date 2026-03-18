/**
 * @layer atom
 * @description Renders a markdown string as HTML using react-markdown.
 * @consumes content: string
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export type MarkdownRendererProps = {
  /** Raw markdown string to render. */
  content: string;
  className?: string;
};

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-sm prose-invert max-w-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
