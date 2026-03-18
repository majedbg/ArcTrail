/**
 * @layer atom
 * @description Base button with variant and size props.
 * @consumes children, variant, size, disabled
 * @emits onClick
 * @diffAware false
 * @tiltEnabled false
 */

import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200",
  secondary:
    "bg-zinc-800 text-zinc-100 border border-zinc-600 hover:bg-zinc-700 active:bg-zinc-600",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
