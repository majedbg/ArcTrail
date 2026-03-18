/**
 * useTilt — CSS 3D tilt effect hook.
 *
 * Inspired by simeydotme/pokemon-cards-css.
 * NO holographic effects. NO shimmer. NO glare. Clean tilt rotation only.
 *
 * The hook calculates rotateX/rotateY from mouse position relative to the
 * element center, applies them as inline CSS transform, and springs back
 * on mouse leave.
 *
 * Auto-disables on:
 * - Touch-only devices (hover: none)
 * - Reduced-motion preference (prefers-reduced-motion: reduce)
 *
 * @module
 */

import React, { useRef, useCallback, useEffect, useState } from "react";
import type { MouseEventHandler } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TiltOptions = {
  /** Maximum rotation degrees (default: 12). */
  factor?: number;
  /** Hover scale lift (default: 1.02). */
  scale?: number;
  /** CSS perspective in px (default: 600). */
  perspective?: number;
  /** Transition spring-back duration in ms (default: 150). */
  transitionMs?: number;
  /** Skip effect entirely (default: false). */
  disabled?: boolean;
};

export type TiltResult = {
  ref: React.RefObject<HTMLDivElement>;
  onMouseMove: MouseEventHandler<HTMLDivElement>;
  onMouseLeave: MouseEventHandler<HTMLDivElement>;
};

// ---------------------------------------------------------------------------
// Media query helpers
// ---------------------------------------------------------------------------

function shouldDisable(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(hover: none)").matches) return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Attaches a CSS 3D tilt effect to a card element.
 *
 * CSS transform math:
 *   - `px` / `py` are normalized to [-1, 1] from center of the element.
 *   - `rotateX = -py * factor` (negative so tilting toward top rotates forward).
 *   - `rotateY =  px * factor` (positive so tilting right rotates clockwise).
 *   - Perspective is applied per-element for isolated 3D context.
 *
 * @example
 * const { ref, onMouseMove, onMouseLeave } = useTilt({ factor: 12, scale: 1.02 });
 * <div ref={ref} className="tilt-card" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
 */
export function useTilt(options: TiltOptions = {}): TiltResult {
  const {
    factor = 12,
    scale = 1.02,
    perspective = 600,
    transitionMs = 150,
    disabled = false,
  } = options;

  const ref = useRef<HTMLDivElement>(null!);
  const [autoDisabled, setAutoDisabled] = useState(false);

  useEffect(() => {
    setAutoDisabled(shouldDisable());
  }, []);

  const isDisabled = disabled || autoDisabled;

  const onMouseMove: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (isDisabled || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      // Normalize to [-1, 1] from element center
      const px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      const rotateX = -py * factor;
      const rotateY = px * factor;

      ref.current.style.transform =
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      ref.current.style.transition = `transform ${transitionMs}ms ease-out`;
    },
    [isDisabled, factor, scale, perspective, transitionMs],
  );

  const onMouseLeave: MouseEventHandler<HTMLDivElement> = useCallback(
    () => {
      if (isDisabled || !ref.current) return;

      // Spring back to flat position
      // (transition handles smooth spring-back)
      ref.current.style.transform =
        `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      ref.current.style.transition = `transform ${transitionMs}ms ease-out`;
    },
    [isDisabled, perspective, transitionMs],
  );

  return { ref, onMouseMove, onMouseLeave };
}

// TODO: Enhancement: add deviceorientation gyroscope tilt
// for mobile — rotate card based on device tilt angle
// using window.addEventListener('deviceorientation').
// Disabled for now; enable when touch tilt is desired.
