/**
 * @layer atom
 * @description Confirmation popper for destructive delete actions.
 *   Confirm button is disabled for 2 seconds, with a liquid-fill gradient
 *   animation that fills from bottom to top, enabling the button only once full.
 * @consumes name (entity name to display), onConfirm, onCancel
 * @emits onConfirm, onCancel
 */

import { useState, useEffect } from "react";

export type ConfirmDeletePopperProps = {
  /** Name of the entity being deleted, shown in the prompt. */
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const DELAY_MS = 2000;

export function ConfirmDeletePopper({
  name,
  onConfirm,
  onCancel,
}: ConfirmDeletePopperProps) {
  const [enabled, setEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed every 50ms for smooth fill animation
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const ms = now - start;
      setElapsed(ms);
      if (ms >= DELAY_MS) {
        setEnabled(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const fillPercent = Math.min(elapsed / DELAY_MS, 1) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onCancel}
      />

      {/* Popper */}
      <div className="fixed left-1/2 top-1/2 z-[61] w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-zinc-900 p-5 shadow-2xl">
        <p className="text-sm text-zinc-200">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-zinc-100">{name}</span>?
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          This action cannot be undone.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Cancel
          </button>

          {/* Confirm button with liquid fill */}
          <button
            type="button"
            onClick={enabled ? onConfirm : undefined}
            disabled={!enabled}
            className="relative overflow-hidden rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              border: "1.5px solid var(--color-diff-removed)",
              color: enabled ? "#fff" : "var(--color-diff-removed)",
            }}
          >
            {/* Liquid fill background — rises from bottom to top */}
            <span
              className="absolute inset-x-0 bottom-0 transition-none"
              style={{
                height: `${fillPercent}%`,
                background: "var(--color-diff-removed)",
                opacity: enabled ? 1 : 0.85,
              }}
            />
            <span className="relative z-10">Delete</span>
          </button>
        </div>
      </div>
    </>
  );
}
