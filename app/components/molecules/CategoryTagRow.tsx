/**
 * @layer molecule
 * @description Horizontal row of Tag atoms for artifact categories.
 * @consumes categories: string[], onRemove (optional per-tag callback)
 * @emits onRemove(category: string)
 * @diffAware false
 * @tiltEnabled false
 */

import { Tag } from "../atoms/Tag.js";

export type CategoryTagRowProps = {
  categories: string[];
  /** When provided, tags become removable. Called with the category string. */
  onRemove?: (category: string) => void;
  className?: string;
};

export function CategoryTagRow({
  categories,
  onRemove,
  className = "",
}: CategoryTagRowProps) {
  if (categories.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {categories.map((cat) => (
        <Tag
          key={cat}
          label={cat}
          onRemove={onRemove ? () => onRemove(cat) : undefined}
        />
      ))}
    </div>
  );
}
