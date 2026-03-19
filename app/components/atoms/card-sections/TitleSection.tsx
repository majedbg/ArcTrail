/**
 * @layer atom
 * @description Card title row with optional date subtitle. Used by Medium and
 *   Rich variants. Minimal uses its own initials-in-circle layout instead.
 */

export type TitleSectionProps = {
  title: string;
  dateISO?: string | null;
  /** Right-side slot (e.g. StageChip or KindIcon). */
  trailing?: React.ReactNode;
};

export function TitleSection({ title, dateISO, trailing }: TitleSectionProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">
          {title}
        </h3>
        {dateISO && (
          <span className="text-[10px] text-zinc-500">{dateISO}</span>
        )}
      </div>
      {trailing}
    </div>
  );
}
