/**
 * @layer atom
 * @description SVG icon wrapper rendering built-in icons by name.
 * @consumes name: IconName, size, className
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

export type IconName =
  | "concept"
  | "prototype"
  | "subsystem"
  | "feature"
  | "variation"
  | "component"
  | "chevron-right"
  | "x"
  | "plus"
  | "retry"
  | "check"
  | "spinner"
  | "media"
  | "markdown";

export type IconProps = {
  name: IconName;
  /** Size in pixels (default: 16). */
  size?: number;
  className?: string;
};

/**
 * Built-in SVG path data for each icon.
 * All paths are designed for a 24×24 viewBox.
 */
const ICON_PATHS: Record<IconName, string> = {
  concept:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
  prototype:
    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  subsystem:
    "M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z",
  feature:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  variation:
    "M16 4h2v2h-2V4zm-4 0h2v2h-2V4zm-4 0h2v2H8V4zm8 4h2v2h-2V8zm-4 0h2v2h-2V8zm-4 0h2v2H8V8zm8 4h2v2h-2v-2zm-4 0h2v2h-2v-2zm-4 0h2v2H8v-2zm0 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z",
  component:
    "M13 13v8h8v-8h-8zM3 21h8v-8H3v8zM3 3v8h8V3H3zm13.66-1.31L11 7.34 16.66 13l5.66-5.66-5.66-5.65z",
  "chevron-right": "M10 6l6 6-6 6",
  x: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  retry: "M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  check: "M20 6L9 17l-5-5",
  spinner: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  media: "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z",
  markdown: "M3 5h18v14H3V5zm3 10V9l3 4 3-4v6m4-6v6m0-3h3",
};

/** Whether the icon should use stroke (line-based) or fill rendering. */
const STROKE_ICONS = new Set<IconName>([
  "chevron-right",
  "x",
  "plus",
  "check",
  "spinner",
  "prototype",
  "markdown",
]);

export function Icon({ name, size = 16, className = "" }: IconProps) {
  const isStroke = STROKE_ICONS.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? 2 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
