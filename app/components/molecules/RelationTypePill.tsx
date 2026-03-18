/**
 * @layer molecule
 * @description Colored dot + relation type label pill.
 * @consumes name: string, color: string, isActive (optional)
 * @emits onClick (optional)
 * @diffAware false
 * @tiltEnabled false
 */

export type RelationTypePillProps = {
  /** Relation type display name (e.g. "PARENT_OF"). */
  name: string;
  /** Dot color from RelationType.color. */
  color: string;
  /** Whether this relation type is currently active/visible. */
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
};

export function RelationTypePill({
  name,
  color,
  isActive = true,
  onClick,
  className = "",
}: RelationTypePillProps) {
  const label = name.replace(/_/g, " ").toLowerCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${
        isActive
          ? "bg-zinc-800 text-zinc-200"
          : "bg-zinc-800/50 text-zinc-500 opacity-60"
      } ${className}`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}
