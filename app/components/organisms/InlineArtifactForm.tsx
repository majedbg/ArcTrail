/**
 * @layer organism
 * @description Compact inline artifact creation form that renders in-place
 *   inside BoxView/GraphView. Background color matches the selected kind token.
 *   Submits via optimistic mutation and auto-creates PARENT_OF relation.
 * @consumes kind, parentId, artifactTypes, stages, projectSlug
 * @emits onClose (after create or cancel)
 */

import { useState, useCallback, useRef } from "react";
import { useStore } from "~/lib/store.js";
import { useOptimisticMutation } from "~/hooks/useOptimisticMutation.js";
import { generateSubsystemCode } from "~/lib/version.js";
import { ARTIFACT_KIND_TOKENS } from "~/lib/tokens.js";
import { Button } from "../atoms/Button.js";
import { Tag } from "../atoms/Tag.js";
import type {
  Artifact,
  ArtifactType,
  ArtifactKind,
  Stage,
} from "~/lib/types.js";

// ---------------------------------------------------------------------------
// Kind display labels (title-case)
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<ArtifactKind, string> = {
  CONCEPT: "Concept",
  PROTOTYPE: "Prototype",
  SUBSYSTEM: "Subsystem",
  FEATURE: "Feature",
  VARIATION: "Variation",
  COMPONENT: "Component",
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type InlineArtifactFormProps = {
  defaultKind: ArtifactKind;
  parentId: string;
  artifactTypes: ArtifactType[];
  stages: Stage[];
  projectSlug: string;
  onClose: () => void;
  /** When provided, form operates in edit mode (pre-filled, update mutation). */
  artifact?: Artifact | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineArtifactForm({
  defaultKind,
  parentId,
  artifactTypes,
  stages,
  projectSlug,
  onClose,
  artifact,
}: InlineArtifactFormProps) {
  const isEdit = !!artifact;
  const openForm = useStore((s) => s.openForm);

  const [title, setTitle] = useState(artifact?.title ?? "");
  const [kind, setKind] = useState<ArtifactKind>(
    (artifact?.kind as ArtifactKind) ?? defaultKind,
  );
  const [artifactTypeId, setArtifactTypeId] = useState(
    artifact?.artifactTypeId ?? "",
  );
  const [stageId, setStageId] = useState(artifact?.stageId ?? "");
  const [summary, setSummary] = useState(artifact?.summary ?? "");
  const [subsystemCode, setSubsystemCode] = useState(
    artifact?.subsystemCode ?? "",
  );
  const [categories, setCategories] = useState<string[]>(
    artifact?.categories ?? [],
  );
  const [categoryInput, setCategoryInput] = useState("");
  const titleRef = useRef<HTMLInputElement>(null!);

  const token = ARTIFACT_KIND_TOKENS[kind];

  // Auto-focus title on mount
  const setTitleRef = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      titleRef.current = el;
      el.focus();
    }
  }, []);

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

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && categoryInput.trim()) {
      e.preventDefault();
      const val = categoryInput.trim();
      if (!categories.includes(val)) setCategories([...categories, val]);
      setCategoryInput("");
    }
  };

  const buildOptimisticArtifact = useCallback((): Artifact => {
    const now = new Date();
    return {
      id: `temp-${Date.now()}`,
      projectId: "",
      artifactTypeId: artifactTypeId || null,
      stageId: stageId || null,
      kind,
      representation: "medium",
      title: title.trim(),
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
      dateISO: null,
      summary: summary || null,
      contentMd: null,
      contentFormat: null,
      showBoth: false,
      media: null,
      typeProps: null,
      metrics: null,
      categories,
      catalogId: null,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      artifactType:
        artifactTypes.find((t) => t.id === artifactTypeId) ?? undefined,
      stage: stages.find((s) => s.id === stageId) ?? undefined,
    };
  }, [artifactTypeId, stageId, kind, title, subsystemCode, summary, categories, artifactTypes, stages]);

  // PARENT_OF relation type ID — set during initActiveRelationTypes from registry
  const parentOfTypeId = useStore((s) => s.parentOfTypeId);

  const createMutation = useOptimisticMutation({
    intent: "createArtifact",
    optimisticUpdate: (store) => {
      const optimistic = buildOptimisticArtifact();
      store.upsertArtifact(optimistic);
      // Also create the PARENT_OF relation so the tree renders correctly
      if (parentOfTypeId) {
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
      representation: "medium",
      summary: summary || null,
      categories: JSON.stringify(categories),
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
      parentId,
    },
  });

  const updateMutation = useOptimisticMutation({
    intent: "updateArtifact",
    optimisticUpdate: (store) => {
      if (!artifact) return;
      store.upsertArtifact({
        ...artifact,
        title: title.trim(),
        kind,
        artifactTypeId: artifactTypeId || null,
        stageId: stageId || null,
        summary: summary || null,
        categories,
        subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
        artifactType:
          artifactTypes.find((t) => t.id === artifactTypeId) ?? undefined,
        stage: stages.find((s) => s.id === stageId) ?? undefined,
        updatedAt: new Date(),
      });
    },
    rollback: (store) => {
      if (!artifact) return;
      store.upsertArtifact(artifact);
    },
    payload: {
      projectSlug,
      id: artifact?.id,
      title: title.trim(),
      kind,
      artifactTypeId: artifactTypeId || null,
      stageId: stageId || null,
      representation: artifact?.representation ?? "medium",
      summary: summary || null,
      categories: JSON.stringify(categories),
      subsystemCode: kind === "SUBSYSTEM" ? subsystemCode || null : null,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!title.trim()) return;
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl p-3"
      style={{
        backgroundColor: `${token.color}${Math.round(token.bgOpacity * 2 * 255)
          .toString(16)
          .padStart(2, "0")}`,
        border: `1.5px solid ${token.color}88`,
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Title — the primary field */}
        <input
          ref={setTitleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded bg-zinc-900/60 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500"
          placeholder={`New ${KIND_LABELS[kind]} title`}
        />

        {/* Kind + Type row */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={kind}
            onChange={(e) => handleKindChange(e.target.value as ArtifactKind)}
            className="rounded bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-100"
          >
            {KIND_OPTIONS.map((k) => {
              // Disable kinds above the expected child kind in the hierarchy
              const disabled = !isEdit && KIND_RANK[k] < KIND_RANK[defaultKind];
              return (
                <option key={k} value={k} disabled={disabled}>
                  {KIND_LABELS[k]}
                </option>
              );
            })}
          </select>

          <select
            value={artifactTypeId}
            onChange={(e) => setArtifactTypeId(e.target.value)}
            className="rounded bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-100"
          >
            <option value="">Type: None</option>
            {artifactTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stage (collapsed row) */}
        <select
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
          className="rounded bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-100"
        >
          <option value="">Stage: None</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Subsystem code */}
        {kind === "SUBSYSTEM" && (
          <input
            value={subsystemCode}
            onChange={(e) => setSubsystemCode(e.target.value.toUpperCase())}
            className="rounded bg-zinc-900/60 px-2.5 py-1.5 font-mono text-xs text-zinc-100"
            placeholder="Subsystem code (e.g. AI)"
            maxLength={4}
          />
        )}

        {/* Summary */}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="rounded bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
          placeholder="Brief summary (optional)"
        />

        {/* Categories */}
        <div>
          <input
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            className="w-full rounded bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
            placeholder="Category (type + enter)"
          />
          {categories.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {categories.map((cat) => (
                <Tag
                  key={cat}
                  label={cat}
                  onRemove={() => setCategories(categories.filter((c) => c !== cat))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {isEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                openForm(artifact!.id);
              }}
              className="text-[10px] text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              Advanced edit
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
