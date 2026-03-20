/**
 * @layer organism
 * @description Slide-up (mobile) / side-panel (desktop) detail sheet for a selected artifact.
 *   Shows header, categories, media gallery, content (markdown/details), entries, components,
 *   relations, and action row.
 * @consumes artifact: Artifact, entries, relations from store, readOnly prop
 * @emits onClose, onEdit, onSelectArtifact
 * @diffAware false
 * @tiltEnabled false
 */

import { useState } from "react";
import { RELATION_TYPE_TOKENS } from "~/lib/tokens.js";
import { useStore } from "~/lib/store.js";
import type { AIMode } from "~/lib/store/aiSlice.js";
import type { Artifact, Relation, Entry } from "~/lib/types.js";
import { Badge } from "../atoms/Badge.js";
import { KindIcon } from "../atoms/KindIcon.js";
import { StageChip } from "../atoms/StageChip.js";
import { MarkdownRenderer } from "../atoms/MarkdownRenderer.js";
import { Button } from "../atoms/Button.js";
import { CategoryTagRow } from "../molecules/CategoryTagRow.js";
import { MediaCarousel } from "../molecules/MediaCarousel.js";
import { EntryPreview } from "../molecules/EntryPreview.js";
import { KnowledgeDimensionBadges } from "../molecules/KnowledgeDimensionBadges.js";

export type ArtifactSheetProps = {
  artifact: Artifact;
  entries?: Entry[];
  relations?: Relation[];
  readOnly?: boolean;
  onClose: () => void;
  onEdit?: () => void;
};

export function ArtifactSheet({
  artifact,
  entries = [],
  relations = [],
  readOnly = false,
  onClose,
  onEdit,
}: ArtifactSheetProps) {
  const selectArtifact = useStore((s) => s.selectArtifact);
  const projectGraph = useStore((s) => s.projectGraph);
  const [contentTab, setContentTab] = useState<"markdown" | "details">(
    artifact.contentMd && !artifact.showBoth ? "markdown" : "details",
  );

  // Group relations by type
  const relationsByType = relations.reduce<Record<string, Relation[]>>(
    (acc, r) => {
      const key = r.relationTypeId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {},
  );

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out md:inset-y-0 md:left-auto md:right-0 md:max-h-full md:w-[420px] md:rounded-none md:rounded-l-2xl"
      >
        {/* Mobile handle bar */}
        <div className="flex justify-center py-2 md:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-600" />
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* 1. Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-zinc-100">
                {artifact.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <KindIcon kind={artifact.kind} showLabel size={14} />
                {artifact.stage && (
                  <StageChip
                    name={artifact.stage.name}
                    color={artifact.stage.color}
                  />
                )}
                {artifact.dateISO && (
                  <span className="text-xs text-zinc-500">
                    {artifact.dateISO}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 2. Category badges */}
          {artifact.categories.length > 0 && (
            <CategoryTagRow categories={artifact.categories} />
          )}

          {/* 3. Media gallery */}
          {artifact.media && artifact.media.length > 0 && (
            <MediaCarousel items={artifact.media} />
          )}

          {/* 4. Content area */}
          {artifact.contentMd && artifact.showBoth ? (
            <div>
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${contentTab === "markdown" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                  onClick={() => setContentTab("markdown")}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${contentTab === "details" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
                  onClick={() => setContentTab("details")}
                >
                  Details
                </button>
              </div>
              {contentTab === "markdown" ? (
                <MarkdownRenderer content={artifact.contentMd} />
              ) : (
                <DetailsSummary artifact={artifact} />
              )}
            </div>
          ) : artifact.contentMd ? (
            <MarkdownRenderer content={artifact.contentMd} />
          ) : (
            <DetailsSummary artifact={artifact} />
          )}

          {/* 5. Entries timeline */}
          {entries.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Entries
              </h3>
              <div className="flex flex-col gap-2">
                {entries
                  .sort(
                    (a, b) =>
                      new Date(b.dateISO).getTime() -
                      new Date(a.dateISO).getTime(),
                  )
                  .map((entry) => (
                    <EntryPreview key={entry.id} entry={entry} />
                  ))}
              </div>
            </div>
          )}

          {/* 6. Relations */}
          {Object.keys(relationsByType).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Relations
              </h3>
              {Object.entries(relationsByType).map(([typeId, rels]) => {
                const rt = rels[0]?.relationType;
                return (
                  <div key={typeId} className="mb-2">
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: rt?.color ?? RELATION_TYPE_TOKENS.PARENT_OF.color }}
                    >
                      {rt?.label ?? typeId}
                    </div>
                    <div className="flex flex-col gap-1">
                      {rels.map((r) => {
                        const isOutgoing = r.fromId === artifact.id;
                        const linkedId = isOutgoing ? r.toId : r.fromId;
                        const linkedArtifact =
                          projectGraph?.artifacts.find(
                            (a) => a.id === linkedId,
                          );
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                            onClick={() => selectArtifact(linkedId)}
                          >
                            <span className="text-zinc-500">
                              {isOutgoing ? "→" : "←"}
                            </span>
                            {linkedArtifact?.title ?? linkedId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 7. Action row */}
          {!readOnly && (
            <ActionRow artifact={artifact} entries={entries} onEdit={onEdit} />
          )}
        </div>
      </div>
    </>
  );
}

function ActionRow({
  artifact,
  entries,
  onEdit,
}: {
  artifact: Artifact;
  entries: Entry[];
  onEdit?: () => void;
}) {
  const openWithMode = useStore((s) => s.openWithMode);

  return (
    <div className="sticky bottom-0 flex gap-2 border-t border-zinc-800 bg-zinc-900 pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          openWithMode("narrator" as AIMode, { artifact, entries })
        }
      >
        Tell me about this
      </Button>
      {onEdit && (
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}

function DetailsSummary({ artifact }: { artifact: Artifact }) {
  if (!artifact.summary) {
    return (
      <p className="text-xs text-zinc-500 italic">No summary available.</p>
    );
  }
  return <p className="text-sm leading-relaxed text-zinc-300">{artifact.summary}</p>;
}
