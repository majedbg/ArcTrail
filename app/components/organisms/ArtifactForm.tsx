/**
 * @layer organism
 * @description Create/edit form for artifacts. Two tabs: Details and Markdown.
 *   Parent and children dropdowns above/below the form body, connected by a
 *   vertical line to visualize the tree relationship.
 *   Handles file upload via /api/upload and wires optimistic mutations.
 * @consumes artifact (for edit), artifactTypes, stages, projectSlug
 * @emits onClose, onSubmit (triggers optimistic mutation)
 * @diffAware false
 * @tiltEnabled false
 */

import { useState, useCallback, useMemo } from "react";
import { useStore } from "~/lib/store.js";
import { ARTIFACT_KIND_TOKENS } from "~/lib/tokens.js";
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
// Visual Constants
// ---------------------------------------------------------------------------

/**
 * Hierarchical connector line style.
 * Visual indicator showing the relationship between parent → current artifact → children.
 * Helps users understand that the newly created artifact falls under a parent
 * and can have one or more child artifacts that it is composed of.
 */
const HIERARCHY_CONNECTOR_STYLE = {
  width: 2,
  height: 24,
} as const;

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

/** Map kind → the kind one level above it in the hierarchy. */
const PARENT_KIND: Partial<Record<ArtifactKind, ArtifactKind>> = {
  PROTOTYPE: "CONCEPT",
  SUBSYSTEM: "PROTOTYPE",
  FEATURE: "SUBSYSTEM",
  VARIATION: "FEATURE",
  COMPONENT: "FEATURE",
};

/** Map kind → the kind one level below it. */
const CHILD_KIND: Partial<Record<ArtifactKind, ArtifactKind>> = {
  CONCEPT: "PROTOTYPE",
  PROTOTYPE: "SUBSYSTEM",
  SUBSYSTEM: "FEATURE",
  FEATURE: "COMPONENT",
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
  parentId: initialParentId,
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

  // Parent + children relationship state
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    initialParentId ?? null,
  );
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(() => {
    if (!artifact) return new Set();
    // In edit mode, find current children from graph relations
    const graph = useStore.getState().projectGraph;
    if (!graph) return new Set();
    const childIds = new Set<string>();
    for (const r of graph.relations) {
      if (r.fromId === artifact.id) childIds.add(r.toId);
    }
    return childIds;
  });

  // Graph data for dropdowns
  const projectGraph = useStore((s) => s.projectGraph);

  // Parent kind label + candidate parents (same layer as the parent)
  const parentKind = PARENT_KIND[kind] ?? null;
  const parentLabel = parentKind ? KIND_LABELS[parentKind] : null;

  const parentCandidates = useMemo(() => {
    if (!parentKind || !projectGraph) return [];
    return projectGraph.artifacts.filter((a) => a.kind === parentKind);
  }, [parentKind, projectGraph]);

  // Resolve the current parent in edit mode from graph relations
  useMemo(() => {
    if (isEdit && artifact && !initialParentId && projectGraph) {
      for (const r of projectGraph.relations) {
        if (r.toId === artifact.id) {
          setSelectedParentId(r.fromId);
          break;
        }
      }
    }
  }, [isEdit, artifact, initialParentId, projectGraph]);

  // Child kind label + candidate children
  const childKind = CHILD_KIND[kind] ?? null;
  const childLabel = childKind ? KIND_LABELS[childKind] : null;

  const childCandidates = useMemo(() => {
    if (!childKind || !projectGraph) return [];
    return projectGraph.artifacts.filter((a) => a.kind === childKind);
  }, [childKind, projectGraph]);

  // Kind token for visual styling
  const kindToken = ARTIFACT_KIND_TOKENS[kind];

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
      if (selectedParentId && parentOfTypeId) {
        store.upsertRelation({
          id: `temp-rel-${optimistic.id}`,
          projectId: optimistic.projectId,
          fromId: selectedParentId,
          toId: optimistic.id,
          relationTypeId: parentOfTypeId,
          label: null,
          metadata: null,
          order: null,
          createdAt: new Date(),
        });
      }
      // Create PARENT_OF relations to selected children
      if (parentOfTypeId) {
        for (const childId of selectedChildIds) {
          store.upsertRelation({
            id: `temp-rel-child-${childId}`,
            projectId: optimistic.projectId,
            fromId: optimistic.id,
            toId: childId,
            relationTypeId: parentOfTypeId,
            label: null,
            metadata: null,
            order: null,
            createdAt: new Date(),
          });
        }
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
      parentId: selectedParentId || null,
      childIds: JSON.stringify([...selectedChildIds]),
    },
  });

  // Optimistic update mutation
  const updateMutation = useOptimisticMutation({
    intent: "updateArtifact",
    optimisticUpdate: (store) => {
      store.upsertArtifact(buildOptimisticArtifact());
    },
    rollback: (store) => {
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

  const toggleChild = (id: string) => {
    setSelectedChildIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[5vh] z-50 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-zinc-900 shadow-2xl md:inset-x-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {isEdit ? "Edit Artifact" : "New Artifact"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800"
              aria-label="Close"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ═══════════════════════════════════════════
              Node-graph layout: Parent → Form → Children
              connected by vertical lines
              ═══════════════════════════════════════════ */}
          <div className="flex flex-col items-center">

            {/* ── Parent dropdown ── */}
            {parentLabel && parentCandidates.length > 0 && (
              <div className="w-full">
                <RelationDropdown
                  label={parentLabel}
                  color={ARTIFACT_KIND_TOKENS[parentKind!].color}
                  selectedId={selectedParentId}
                  candidates={parentCandidates}
                  onChange={setSelectedParentId}
                />
              </div>
            )}

            {/* Connector: parent → form */}
            {parentLabel && parentCandidates.length > 0 && (
              <div 
                className="flex justify-center" 
                style={{ 
                  ...HIERARCHY_CONNECTOR_STYLE, 
                  backgroundColor: `${kindToken.color}50` 
                }} 
              />
            )}

            {/* ── Main form body — styled like an artifact card ── */}
            <div
              className="relative z-10 w-full rounded-xl"
              style={{
                border: `1.5px solid ${kindToken.color}57`,
                boxShadow: `0 0 16px 2px ${kindToken.color}25`,
                backgroundColor: `${kindToken.color}08`,
              }}
            >
              <div className="flex flex-col gap-4 p-4">
                {/* Kind label */}
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: kindToken.color }}
                >
                  {KIND_LABELS[kind]}
                </span>

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
                          onChange={(e) => handleKindChange(e.target.value as ArtifactKind)}
                          className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                        >
                          {KIND_OPTIONS.map((k) => {
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
                            <option key={t.id} value={t.id}>{t.name}</option>
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
                            <option key={s.id} value={s.id}>{s.name}</option>
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
                          <span className="ml-1 text-zinc-600">(auto-generated, overridable)</span>
                        </span>
                        <input
                          value={subsystemCode}
                          onChange={(e) => setSubsystemCode(e.target.value.toUpperCase())}
                          className="rounded bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                          placeholder="e.g. AI, LO, SP"
                          maxLength={4}
                        />
                      </label>
                    )}

                    {/* Categories */}
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-400">
                        Categories <span className="ml-1 text-zinc-600">(type + enter)</span>
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
                            <Tag key={cat} label={cat} onRemove={() => setCategories(categories.filter((c) => c !== cat))} />
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
                          <option key={r} value={r}>{r}</option>
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
                        <span className="text-xs text-zinc-400">Show both markdown and details in view</span>
                      </label>
                    )}

                    {/* Media upload */}
                    <MediaUpload media={media} onMediaChange={setMedia} />

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
                      Markdown overrides Details in view mode unless &quot;Show both&quot; is enabled on the Details tab.
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
              </div>
            </div>

            {/* Connector: form → children */}
            {childLabel && childCandidates.length > 0 && (
              <div 
                className="flex justify-center" 
                style={{ 
                  ...HIERARCHY_CONNECTOR_STYLE, 
                  backgroundColor: `${kindToken.color}50` 
                }} 
              />
            )}

            {/* ── Children multi-select ── */}
            {childLabel && childCandidates.length > 0 && (
              <div className="w-full">
                <RelationMultiSelect
                  label={childLabel}
                  labelPlural={`${childLabel}s`}
                  color={ARTIFACT_KIND_TOKENS[childKind!].color}
                  selectedIds={selectedChildIds}
                  candidates={childCandidates}
                  onToggle={toggleChild}
                />
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-4">
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

// ---------------------------------------------------------------------------
// Relation dropdown — single-select for parent
// ---------------------------------------------------------------------------

function RelationDropdown({
  label,
  color,
  selectedId,
  candidates,
  onChange,
}: {
  label: string;
  color: string;
  selectedId: string | null;
  candidates: Artifact[];
  onChange: (id: string | null) => void;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        border: `1.5px solid ${color}40`,
        backgroundColor: `${color}0A`,
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 block w-full rounded bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-100"
      >
        <option value="">None</option>
        {candidates.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
            {a.subsystemCode ? ` [${a.subsystemCode}]` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relation multi-select — checkbox list for children
// ---------------------------------------------------------------------------

function RelationMultiSelect({
  label,
  labelPlural,
  color,
  selectedIds,
  candidates,
  onToggle,
}: {
  label: string;
  labelPlural: string;
  color: string;
  selectedIds: Set<string>;
  candidates: Artifact[];
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = selectedIds.size;

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        border: `1.5px solid ${color}40`,
        backgroundColor: `${color}0A`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
          {labelPlural}
          {count > 0 && (
            <span className="ml-1.5 text-zinc-400 normal-case tracking-normal">
              ({count} selected)
            </span>
          )}
        </span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-0.5 max-h-[200px] overflow-auto">
          {candidates.map((a) => {
            const checked = selectedIds.has(a.id);
            return (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-zinc-800 ${
                  checked ? "opacity-100" : "opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(a.id)}
                  style={{ accentColor: color }}
                />
                <span className="text-xs text-zinc-200 truncate">
                  {a.title}
                </span>
                {a.subsystemCode && (
                  <span className="font-mono text-[9px] text-zinc-500">[{a.subsystemCode}]</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
