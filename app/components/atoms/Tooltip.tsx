/**
 * @layer atom
 * @description Hover/focus tooltip positioned above target element.
 * @consumes content, children
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import type { ReactNode } from "react";

export type TooltipProps = {
  /** Tooltip text content. */
  content: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className = "" }: TooltipProps) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
