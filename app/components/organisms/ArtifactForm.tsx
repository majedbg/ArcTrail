/**
 * @layer organism
 * @description Create/edit form for artifacts. Two tabs: Details and Markdown.
 *   Details tab: all fields including subsystemCode (SUBSYSTEM only).
 *   Markdown tab: @uiw/react-md-editor for contentMd.
 *   Handles file upload via /api/upload and wires optimistic mutations.
 * @consumes artifact (for edit), artifactTypes, stages, projectSlug
 * @emits onClose, onSubmit (triggers optimistic mutation)
 * @diffAware false
 * @tiltEnabled false
 */

import { useState, useCallback } from "react";
import { useStore } from "~/lib/store.js";
import { ConfirmDeletePopper } from "../atoms/ConfirmDeletePopper.js";
import { useOptimisticMutation } from "~/hooks/useOptimisticMutation.js";
import { generateSubsystemCode } from "~/lib/version.js";
import { Button } from "../atoms/Button.js";
import { Tag } from "../atoms/Tag.js";
import { MediaUpload } from "../molecules/MediaUpload.js";
import type {
  Artifact,
  ArtifactType,
  ArtifactKind,
  MediaItem,
  Stage,
} from "~/lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArtifactFormProps = {
  /** Existing artifact for edit mode; null for create mode. */
  artifact?: Artifact | null;
  artifactTypes: ArtifactType[];
  stages: Stage[];
  projectSlug: string;
  /** Pre-selected kind when creating a sibling. */
  defaultKind?: ArtifactKind | null;
  /** Parent artifact id — a PARENT_OF relation will be auto-created on submit. */
  parentId?: string | null;
  onClose: () => void;
};

const KIND_OPTIONS: ArtifactKind[] = [
  "CONCEPT",
  "PROTOTYPE",
  "SUBSYSTEM",
  "FEATURE",
  "VARIATION",
  "COMPONENT",
];

/** Hierarchy depth — lower = more abstract. Used to disable invalid kinds in the dropdown. */
const KIND_RANK: Record<ArtifactKind, number> = {
  CONCEPT: 0,
  PROTOTYPE: 1,
  SUBSYSTEM: 2,
  FEATURE: 3,
  VARIATION: 4,
  COMPONENT: 5,
};

const KIND_LABELS: Record<ArtifactKind, string> = {
  CONCEPT: "Concept",
  PROTOTYPE: "Prototype",
  SUBSYSTEM: "Subsystem",
  FEATURE: "Feature",
  VARIATION: "Variation",
  COMPONENT: "Component",
};

const REPRESENTATION_OPTIONS = ["rich", "medium", "minimal"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtifactForm({
  artifact,
  artifactTypes,
  stages,
  projectSlug,
  defaultKind,
  parentId,
  onClose,
}: ArtifactFormProps) {
  const isEdit = !!artifact;
  const [tab, setTab] = useState<"details" | "markdown">(
    artifact?.contentMd ? "markdown" : "details",
  );

  // Form state
  const [title, setTitle] = useState(artifact?.title ?? "");
  const [kind, setKind] = useState<ArtifactKind>(artifact?.kind ?? defaultKind ?? "FEATURE");
  const [artifactTypeId, setArtifactTypeId] = useState(
    artifact?.artifactTypeId ?? "",
  );
  const [stageId, setStageId] = useState(artifact?.stageId ?? "");
  const [dateISO, setDateISO] = useState(artifact?.dateISO ?? "");
  const [summary, setSummary] = useState(artifact?.summary ?? "");
  const [representation, setRepresentation] = useState(
    artifact?.representation ?? "medium",
  );
  const [showBoth, setShowBoth] = useState(artifact?.showBoth ?? false);
  const [contentMd, setContentMd] = useState(artifact?.contentMd ?? "");
  const [subsystemCode, setSubsystemCode] = useState(
    artifact?.subsystemCode ?? "",
  );
  const [categories, setCategories] = useState<string[]>(
    artifact?.categories ?? [],
  );
  const [media, setMedia] = useState<MediaItem[]>(artifact?.media ?? []);
  const [categoryInput, setCategoryInput] = useState("");

  // Auto-generate subsystem code when kind is SUBSYSTEM and title changes
  const handleKindChange = useCallback(
    (newKind: ArtifactKind) => {
      setKind(newKind);
      if (newKind === "SUBSYSTEM" && !subsystemCode && title) {
        const existingCodes =
          useStore
            .getState()
            .projectGraph?.artifacts.filter((a) => a.subsystemCode)
            .map((a) => a.subsystemCode!) ?? [];
        setSubsystemCode(generateSubsystemCode(title, existingCodes));
      }
    },
    [title, subsystemCode],
  );

  // Category tag input
  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && categoryInput.trim()) {
      e.preventDefault();
      const val = categoryInput.trim();
      if (!categories.includes(val)) {
        setCategories([...categories, val]);
      }
      setCategoryInput("");
    }
  };


  // Build the optimistic artifact for create/update
  const buildOptimisticArtifact = useCallback((): Artifact => {
    const now = new Date();
    return {
      id: artifact?.id ?? `temp-${Date.now()}`,
      projectId: artifact?.projectId ?? "",
      artifactTypeId: artifactTypeId || null,
      stageId: stageId || null,
      kind,
      representation,
      title: title.trim(),
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
      dateISO: dateISO || null,
      summary: summary || null,
      contentMd: contentMd || null,
      contentFormat: contentMd ? "md" : null,
      showBoth,
      media: media.length > 0 ? media : null,
      typeProps: artifact?.typeProps ?? null,
      metrics: artifact?.metrics ?? null,
      categories,
      catalogId: artifact?.catalogId ?? null,
      isPublic: artifact?.isPublic ?? true,
      createdAt: artifact?.createdAt ?? now,
      updatedAt: now,
      artifactType: artifactTypes.find((t) => t.id === artifactTypeId) ?? undefined,
      stage: stages.find((s) => s.id === stageId) ?? undefined,
    };
  }, [
    artifact,
    artifactTypeId,
    stageId,
    kind,
    representation,
    title,
    subsystemCode,
    dateISO,
    summary,
    contentMd,
    showBoth,
    media,
    categories,
    artifactTypes,
    stages,
  ]);

  // PARENT_OF relation type ID — set during initActiveRelationTypes from registry
  const parentOfTypeId = useStore((s) => s.parentOfTypeId);

  // Optimistic create mutation
  const createMutation = useOptimisticMutation({
    intent: "createArtifact",
    optimisticUpdate: (store) => {
      const optimistic = buildOptimisticArtifact();
      store.upsertArtifact(optimistic);
      // Create PARENT_OF relation when parentId is provided
      if (parentId && parentOfTypeId) {
        store.upsertRelation({
          id: `temp-rel-${optimistic.id}`,
          projectId: optimistic.projectId,
          fromId: parentId,
          toId: optimistic.id,
          relationTypeId: parentOfTypeId,
          label: null,
          metadata: null,
          order: null,
          createdAt: new Date(),
        });
      }
    },
    rollback: (store) => {
      const optimistic = buildOptimisticArtifact();
      store.removeArtifact(optimistic.id);
    },
    payload: {
      projectSlug,
      title: title.trim(),
      kind,
      artifactTypeId: artifactTypeId || null,
      stageId: stageId || null,
      representation,
      summary: summary || null,
      categories: JSON.stringify(categories),
      contentMd: contentMd || null,
      showBoth,
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
      dateISO: dateISO || null,
      mediaJson: JSON.stringify(media),
      parentId: parentId || null,
    },
  });

  // Optimistic update mutation
  const updateMutation = useOptimisticMutation({
    intent: "updateArtifact",
    optimisticUpdate: (store) => {
      store.upsertArtifact(buildOptimisticArtifact());
    },
    rollback: (store) => {
      // Restore original artifact
      if (artifact) store.upsertArtifact(artifact);
    },
    payload: {
      projectSlug,
      id: artifact?.id,
      title: title.trim(),
      kind,
      artifactTypeId: artifactTypeId || null,
      stageId: stageId || null,
      representation,
      summary: summary || null,
      categories: JSON.stringify(categories),
      contentMd: contentMd || null,
      showBoth,
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
      dateISO: dateISO || null,
    },
  });

  // Optimistic delete mutation
  const deleteMutation = useOptimisticMutation({
    intent: "deleteArtifact",
    optimisticUpdate: (store) => {
      if (artifact) store.removeArtifact(artifact.id);
    },
    rollback: (store) => {
      if (artifact) store.upsertArtifact(artifact);
    },
    payload: { projectSlug, id: artifact?.id },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
    onClose();
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (!artifact) return;
    deleteMutation.mutate();
    onClose();
  };

  // Dynamic import for MDEditor (client-only)
  const [MDEditor, setMDEditor] = useState<typeof import("@uiw/react-md-editor").default | null>(null);
  if (typeof window !== "undefined" && !MDEditor) {
    import("@uiw/react-md-editor").then((mod) => setMDEditor(() => mod.default));
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5vh] z-50 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-zinc-900 shadow-2xl md:inset-x-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {isEdit ? "Edit Artifact" : "New Artifact"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800"
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

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-800 pb-1">
            <button
              type="button"
              className={`rounded-t px-3 py-1.5 text-sm ${tab === "details" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              onClick={() => setTab("details")}
            >
              Details
            </button>
            <button
              type="button"
              className={`rounded-t px-3 py-1.5 text-sm ${tab === "markdown" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}
              onClick={() => setTab("markdown")}
            >
              Markdown
            </button>
          </div>

          {/* Details tab */}
          {tab === "details" && (
            <div className="flex flex-col gap-3">
              {/* Title */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Title *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                  placeholder="Artifact title"
                />
              </label>

              {/* Kind + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Kind</span>
                  <select
                    value={kind}
                    onChange={(e) =>
                      handleKindChange(e.target.value as ArtifactKind)
                    }
                    className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  >
                    {KIND_OPTIONS.map((k) => {
                      // When creating with a defaultKind, disable kinds above it
                      const disabled = !artifact && defaultKind && KIND_RANK[k] < KIND_RANK[defaultKind];
                      return (
                        <option key={k} value={k} disabled={!!disabled}>
                          {KIND_LABELS[k]}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Type</span>
                  <select
                    value={artifactTypeId}
                    onChange={(e) => setArtifactTypeId(e.target.value)}
                    className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="">None</option>
                    {artifactTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Stage + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Stage</span>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="">None</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">Date</span>
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>

              {/* Subsystem code (only for SUBSYSTEM kind) */}
              {kind === "SUBSYSTEM" && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">
                    Subsystem Code
                    <span className="ml-1 text-zinc-600">
                      (auto-generated, overridable)
                    </span>
                  </span>
                  <input
                    value={subsystemCode}
                    onChange={(e) =>
                      setSubsystemCode(e.target.value.toUpperCase())
                    }
                    className="rounded bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                    placeholder="e.g. AI, LO, SP"
                    maxLength={4}
                  />
                </label>
              )}

              {/* Categories */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">
                  Categories
                  <span className="ml-1 text-zinc-600">(type + enter)</span>
                </span>
                <input
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                  placeholder="Add category"
                />
                {categories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <Tag
                        key={cat}
                        label={cat}
                        onRemove={() =>
                          setCategories(categories.filter((c) => c !== cat))
                        }
                      />
                    ))}
                  </div>
                )}
              </label>

              {/* Summary */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Summary</span>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                  placeholder="Brief description"
                />
              </label>

              {/* Representation */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Card style</span>
                <select
                  value={representation}
                  onChange={(e) => setRepresentation(e.target.value)}
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                >
                  {REPRESENTATION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              {/* showBoth checkbox */}
              {contentMd && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBoth}
                    onChange={(e) => setShowBoth(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                  />
                  <span className="text-xs text-zinc-400">
                    Show both markdown and details in view
                  </span>
                </label>
              )}

              {/* Media upload */}
              <MediaUpload
                media={media}
                onMediaChange={setMedia}
              />

              <p className="text-[10px] text-zinc-600">
                Markdown content (Markdown tab) takes precedence in view mode
                unless &quot;Show both&quot; is on.
              </p>
            </div>
          )}

          {/* Markdown tab */}
          {tab === "markdown" && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-zinc-500">
                Markdown overrides Details in view mode unless &quot;Show
                both&quot; is enabled on the Details tab.
              </p>
              {MDEditor ? (
                <MDEditor
                  value={contentMd}
                  onChange={(v) => setContentMd(v ?? "")}
                  height={360}
                  data-color-mode="dark"
                />
              ) : (
                <textarea
                  value={contentMd}
                  onChange={(e) => setContentMd(e.target.value)}
                  rows={15}
                  className="rounded bg-zinc-800 p-3 font-mono text-sm text-zinc-100"
                  placeholder="Write markdown content..."
                />
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-diff-removed"
                >
                  Delete
                </Button>
              )}
              {showDeleteConfirm && artifact && (
                <ConfirmDeletePopper
                  name={artifact.title}
                  onConfirm={handleDelete}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
