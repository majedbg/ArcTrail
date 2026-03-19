/**
 * @layer atom
 * @description Shared rectangular card wrapper used by Medium and Rich card
 *   variants. Owns the accent border, diff glow, tilt effect, click/keyboard
 *   handling, and base styling. Cards compose their content inside this shell.
 *
 *   Minimal cards do NOT use this — they have a fundamentally different shape
 *   (circle + label) and manage their own wrapper.
 */

import type { ReactNode, CSSProperties } from "react";
import type { DiffStatus } from "~/lib/types.js";
import { DIFF_TOKENS } from "~/lib/tokens.js";
import { useTilt } from "~/hooks/useTilt.js";

export type CardShellProps = {
  /** Accent color for the left border and glow effect (usually artifactType color). */
  accentColor: string;
  /** Width class or fixed width, e.g. "w-[200px]" or "w-[280px]". */
  widthClass: string;
  /** Diff status key from DiffContext. */
  diffStatus: DiffStatus;
  /** Tilt config — pass null to disable tilt (e.g. minimal). */
  tilt: { factor: number; scale: number } | null;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

export function CardShell({
  accentColor,
  widthClass,
  diffStatus,
  tilt,
  onClick,
  className = "",
  children,
}: CardShellProps) {
  const tiltProps = useTilt(tilt ?? { factor: 0, scale: 1 });
  const diffToken = DIFF_TOKENS[diffStatus];
  const isDiffed = diffStatus !== "unchanged";

  const style: CSSProperties = {
    border: `1.5px solid ${accentColor}57`,
    ...(isDiffed ? { boxShadow: `0 0 8px 1px ${diffToken.color}` } : undefined),
    "--accent-color": accentColor,
  } as CSSProperties;

  return (
    <div
      ref={tilt ? tiltProps.ref : undefined}
      className={`tilt-card ${widthClass} min-h-[80px] rounded-2xl  bg-white/90 shadow-[0_0_6px_1px_color-mix(in_srgb,var(--accent-color)_10%,transparent)] backdrop-blur-sm transition-shadow hover:shadow-[0_0_16px_2px_color-mix(in_srgb,var(--accent-color)_60%,transparent)] dark:bg-zinc-900/90 ${className}`}
      style={style}
      onMouseMove={tilt ? tiltProps.onMouseMove : undefined}
      onMouseLeave={tilt ? tiltProps.onMouseLeave : undefined}
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
      {children}
    </div>
  );
}
