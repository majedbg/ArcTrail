/**
 * @layer atom
 * @description Horizontal row of category badges, truncated to a max count.
 *   Used by Medium and Rich cards.
 */

import { Badge } from "../Badge.js";

export type CategorySectionProps = {
  categories: string[];
  /** Max badges to show before truncating. Default: 3. */
  max?: number;
};

export function CategorySection({
  categories,
  max = 3,
}: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {categories.slice(0, max).map((cat) => (
        <Badge
          key={cat}
          label={cat}
          bgClass="bg-zinc-700/60"
          textClass="text-zinc-300"
        />
      ))}
    </div>
  );
}
