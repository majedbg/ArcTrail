/**
 * @layer organism
 * @description Floating pill showing toggle buttons for each RelationType.
 *   PARENT_OF active by default. Reads/writes activeRelationTypeIds from Zustand.
 * @consumes relationTypes from store/loader, activeRelationTypeIds from store
 * @emits toggleRelationType via store
 * @diffAware false
 * @tiltEnabled false
 */

import { useStore } from "../../lib/store.js";
import { RelationTypePill } from "../molecules/RelationTypePill.js";
import type { RelationType } from "../../lib/types.js";

export type RelationLayerToggleProps = {
  relationTypes: RelationType[];
};

export function RelationLayerToggle({ relationTypes }: RelationLayerToggleProps) {
  const activeIds = useStore((s) => s.activeRelationTypeIds);
  const toggle = useStore((s) => s.toggleRelationType);

  if (relationTypes.length === 0) return null;

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-1.5 rounded-xl bg-zinc-900/80 p-2 backdrop-blur-sm">
      {relationTypes.map((rt) => (
        <RelationTypePill
          key={rt.id}
          name={rt.name}
          color={rt.color}
          isActive={activeIds.includes(rt.id)}
          onClick={() => toggle(rt.id)}
        />
      ))}
    </div>
  );
}
