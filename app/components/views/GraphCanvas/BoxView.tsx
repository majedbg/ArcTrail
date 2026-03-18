/**
 * @layer view
 * @description Nested-rectangle "box" view. CONCEPT at top, PROTOTYPE nested inside,
 *   SUBSYSTEMS inside prototypes, FEATURES inside subsystems, etc.
 *   Hover on any block reveals a "+" button to add a sibling artifact.
 * @consumes ProjectGraph from Zustand store
 * @emits selectArtifact via store, openFormForSibling via store
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "~/lib/store.js";
import { ARTIFACT_KIND_TOKENS } from "~/lib/tokens.js";
import { KindIcon } from "../../atoms/KindIcon.js";
import { StageChip } from "../../atoms/StageChip.js";
import { Badge } from "../../atoms/Badge.js";
import { MediaThumb } from "../../atoms/MediaThumb.js";
import { MarkdownRenderer } from "../../atoms/MarkdownRenderer.js";
import { CategoryTagRow } from "../../molecules/CategoryTagRow.js";
import { AddSiblingButton } from "../../atoms/AddSiblingButton.js";
import { ConfirmDeletePopper } from "../../atoms/ConfirmDeletePopper.js";
import { InlineArtifactForm } from "../../organisms/InlineArtifactForm.js";
import type { Artifact, ArtifactType, Relation, Stage, ArtifactKind } from "~/lib/types.js";

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

type TreeNode = {
  artifact: Artifact;
  children: TreeNode[];
};

/** The child kind that should be added under a given parent kind. */
const CHILD_KIND: Record<ArtifactKind, ArtifactKind> = {
  CONCEPT: "PROTOTYPE",
  PROTOTYPE: "SUBSYSTEM",
  SUBSYSTEM: "FEATURE",
  FEATURE: "COMPONENT",
  VARIATION: "COMPONENT",
  COMPONENT: "COMPONENT",
};

function buildTree(artifacts: Artifact[], relations: Relation[]): TreeNode[] {
  const childMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const r of relations) {
    if (!childMap.has(r.fromId)) childMap.set(r.fromId, []);
    childMap.get(r.fromId)!.push(r.toId);
    hasParent.add(r.toId);
  }

  const artifactMap = new Map(artifacts.map((a) => [a.id, a]));

  function buildNode(id: string): TreeNode | null {
    const artifact = artifactMap.get(id);
    if (!artifact) return null;
    const childIds = childMap.get(id) ?? [];
    const children = childIds
      .map((cid) => buildNode(cid))
      .filter((n): n is TreeNode => n !== null);
    return { artifact, children };
  }

  return artifacts
    .filter((a) => !hasParent.has(a.id))
    .map((a) => buildNode(a.id))
    .filter((n): n is TreeNode => n !== null);
}

// ---------------------------------------------------------------------------
// Nested block renderer
// ---------------------------------------------------------------------------

function ArtifactBlock({
  node,
  depth,
  onSelect,
  selectedId,
  artifactTypes,
  stages,
  projectSlug,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  artifactTypes: ArtifactType[];
  stages: Stage[];
  projectSlug: string;
}) {
  const { artifact, children } = node;
  const kind = artifact.kind as ArtifactKind;
  const token = ARTIFACT_KIND_TOKENS[kind];
  const isSelected = artifact.id === selectedId;
  const childKind = CHILD_KIND[kind];

  const padding = depth === 0 ? "p-4" : depth === 1 ? "p-3" : "p-2.5";

  const [hovered, setHovered] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const openForm = useStore((s) => s.openForm);
  const removeArtifact = useStore((s) => s.removeArtifact);

  // Feature-level blocks (depth >= 3) use a compact row layout:
  // title on the left, component pills flowing to the right, "+" at the end.
  const isRowLayout = depth >= 3;

  if (isRowLayout) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-xl ${padding} ${isSelected ? "ring-2 ring-white/40" : ""}`}
        style={{
          backgroundColor: `${token.color}${Math.round(token.bgOpacity * 255)
            .toString(16)
            .padStart(2, "0")}`,
          border: `1.5px solid ${token.color}${isSelected ? "" : "66"}`,
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        {/* Title chip */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(artifact.id);
          }}
          className="flex items-center gap-1.5 text-left"
        >
          <KindIcon kind={kind} size={12} />
          <span className="text-xs font-semibold" style={{ color: token.color }}>
            {artifact.title}
          </span>
        </button>

        {/* Edit pill */}
        {isSelected && !showEditForm && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEditForm(true);
            }}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60"
            style={{
              backgroundColor: `${token.color}30`,
              border: `1px solid ${token.color}55`,
            }}
          >
            Edit
          </button>
        )}

        {/* Stage chip */}
        {artifact.stage && (
          <StageChip name={artifact.stage.name} color={artifact.stage.color} />
        )}

        {/* Separator between title area and children */}
        {children.length > 0 && (
          <span className="mx-0.5 text-zinc-600">›</span>
        )}

        {/* Component children as pills inline */}
        {children.map((child) => (
          <ArtifactPill
            key={child.artifact.id}
            artifact={child.artifact}
            isSelected={child.artifact.id === selectedId}
            onSelect={onSelect}
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
          />
        ))}

        {/* Add child button */}
        {showInlineForm ? (
          <InlineArtifactForm
            defaultKind={childKind}
            parentId={artifact.id}
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
            onClose={() => setShowInlineForm(false)}
          />
        ) : (
          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{
              maxWidth: hovered ? 120 : 0,
              opacity: hovered ? 1 : 0,
            }}
          >
            <AddSiblingButton
              kind={childKind}
              onClick={() => setShowInlineForm(true)}
            />
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <ConfirmDeletePopper
            name={artifact.title}
            onConfirm={() => {
              removeArtifact(artifact.id);
              setShowDeleteConfirm(false);
              onSelect(artifact.id);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {/* Inline edit form — full width below the row when active */}
        {isSelected && showEditForm && (
          <div className="w-full">
            <InlineArtifactForm
              defaultKind={kind}
              parentId=""
              artifactTypes={artifactTypes}
              stages={stages}
              projectSlug={projectSlug}
              onClose={() => setShowEditForm(false)}
              artifact={artifact}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl transition-shadow ${padding} ${isSelected ? "ring-2 ring-white/40" : ""}`}
      style={{
        backgroundColor: `${token.color}${Math.round(token.bgOpacity * 255)
          .toString(16)
          .padStart(2, "0")}`,
        border: `1.5px solid ${token.color}${isSelected ? "" : "66"}`,
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {/* Header — always visible */}
      <div className="mb-1 flex w-full items-start justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(artifact.id);
          }}
          className="flex flex-1 items-start gap-2 text-left"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <KindIcon kind={kind} size={depth === 0 ? 16 : 12} />
              <span
                className={`font-semibold ${depth === 0 ? "text-base" : depth === 1 ? "text-sm" : "text-xs"}`}
                style={{ color: token.color }}
              >
                {artifact.title}
              </span>

              {/* Edit pill — appears when selected */}
              {isSelected && !showEditForm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditForm(true);
                  }}
                  className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60"
                  style={{
                    backgroundColor: `${token.color}30`,
                    border: `1px solid ${token.color}55`,
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            {artifact.subsystemCode && (
              <span
                className="mt-0.5 inline-block font-mono text-[10px] opacity-70"
                style={{ color: token.color }}
              >
                [{artifact.subsystemCode}]
              </span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1.5">
          {artifact.stage && (
            <StageChip name={artifact.stage.name} color={artifact.stage.color} />
          )}
          {!isSelected && artifact.categories.length > 0 && (
            <Badge
              label={artifact.categories[0]}
              bgClass="bg-zinc-800/60"
              textClass="text-zinc-300"
            />
          )}
        </div>
      </div>

      {/* Delete confirmation popper */}
      {showDeleteConfirm && (
        <ConfirmDeletePopper
          name={artifact.title}
          onConfirm={() => {
            removeArtifact(artifact.id);
            setShowDeleteConfirm(false);
            onSelect(artifact.id); // deselect
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Compact summary — only when NOT selected */}
      {!isSelected && artifact.summary && depth < 2 && (
        <p className="mb-2 text-xs text-zinc-400 line-clamp-1">
          {artifact.summary}
        </p>
      )}

      {/* Rich detail panel OR inline edit form when selected */}
      {isSelected && showEditForm ? (
        <InlineArtifactForm
          defaultKind={kind}
          parentId=""
          artifactTypes={artifactTypes}
          stages={stages}
          projectSlug={projectSlug}
          onClose={() => setShowEditForm(false)}
          artifact={artifact}
        />
      ) : (
        <ExpandableDetails
          artifact={artifact}
          isSelected={isSelected}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* Children + add button */}
      {/* Features (depth >= 2) wrap horizontally; others stack vertically */}
      <div className={depth >= 2 ? "flex flex-wrap items-start gap-2" : "flex flex-col gap-2"}>
        {children.map((child) => (
          <ArtifactBlock
            key={child.artifact.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedId={selectedId}
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
          />
        ))}

        {/* Inline form — replaces the add button when active */}
        {showInlineForm ? (
          <InlineArtifactForm
            defaultKind={childKind}
            parentId={artifact.id}
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
            onClose={() => setShowInlineForm(false)}
          />
        ) : (
          <div
            className="overflow-hidden transition-all duration-200 ease-out"
            style={{
              maxHeight: hovered ? 32 : 0,
              opacity: hovered ? 1 : 0,
            }}
          >
            <AddSiblingButton
              kind={childKind}
              onClick={() => setShowInlineForm(true)}
              fullWidth={depth < 2}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable rich detail section — animates open when artifact is selected
// ---------------------------------------------------------------------------

function ExpandableDetails({
  artifact,
  isSelected,
  onDelete,
}: {
  artifact: Artifact;
  isSelected: boolean;
  onDelete?: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null!);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isSelected && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isSelected]);

  const hasContent =
    artifact.summary ||
    artifact.contentMd ||
    (artifact.categories && artifact.categories.length > 0) ||
    (artifact.media && artifact.media.length > 0) ||
    artifact.dateISO;

  if (!hasContent) return null;

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{ maxHeight: isSelected ? height : 0, opacity: isSelected ? 1 : 0 }}
    >
      <div ref={contentRef} className="flex flex-col gap-2 pt-1 pb-1">
        {/* Date */}
        {artifact.dateISO && (
          <span className="text-[10px] text-zinc-500">{artifact.dateISO}</span>
        )}

        {/* Categories */}
        {artifact.categories.length > 0 && (
          <CategoryTagRow categories={artifact.categories} />
        )}

        {/* Media thumbnails */}
        {artifact.media && artifact.media.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {artifact.media.map((m, i) => (
              <MediaThumb key={i} src={m.src} alt={m.alt} type={m.type} />
            ))}
          </div>
        )}

        {/* Summary or markdown content */}
        {artifact.contentMd ? (
          <div className="max-h-32 overflow-y-auto rounded bg-zinc-900/40 p-2">
            <MarkdownRenderer content={artifact.contentMd} className="text-xs" />
          </div>
        ) : artifact.summary ? (
          <p className="text-xs leading-relaxed text-zinc-300">
            {artifact.summary}
          </p>
        ) : null}

        {/* Delete button */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="self-start rounded-full px-2 py-0.5 text-[10px] font-medium text-diff-removed transition-colors hover:bg-diff-removed/20"
            style={{ border: "1px solid var(--color-diff-removed)" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leaf-level pill (with expandable detail on select)
// ---------------------------------------------------------------------------

function ArtifactPill({
  artifact,
  isSelected,
  onSelect,
  artifactTypes,
  stages,
  projectSlug,
}: {
  artifact: Artifact;
  isSelected: boolean;
  onSelect: (id: string) => void;
  artifactTypes: ArtifactType[];
  stages: Stage[];
  projectSlug: string;
}) {
  const kind = artifact.kind as ArtifactKind;
  const token = ARTIFACT_KIND_TOKENS[kind];
  const removeArtifact = useStore((s) => s.removeArtifact);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(artifact.id);
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-shadow ${isSelected ? "ring-2 ring-white/40" : ""}`}
          style={{
            backgroundColor: `${token.color}33`,
            color: token.color,
            border: `1px solid ${token.color}55`,
          }}
        >
          <KindIcon kind={kind} size={10} />
          {artifact.title}
        </button>

        {/* Edit pill — when selected */}
        {isSelected && !showEditForm && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEditForm(true);
            }}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700/60"
            style={{
              backgroundColor: `${token.color}30`,
              border: `1px solid ${token.color}55`,
            }}
          >
            Edit
          </button>
        )}
      </div>

      {isSelected && showEditForm ? (
        <InlineArtifactForm
          defaultKind={kind}
          parentId=""
          artifactTypes={artifactTypes}
          stages={stages}
          projectSlug={projectSlug}
          onClose={() => setShowEditForm(false)}
          artifact={artifact}
        />
      ) : (
        <ExpandableDetails
          artifact={artifact}
          isSelected={isSelected}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDeletePopper
          name={artifact.title}
          onConfirm={() => {
            removeArtifact(artifact.id);
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export type BoxViewProps = {
  artifactTypes: ArtifactType[];
  stages: Stage[];
  projectSlug: string;
};

export function BoxView({ artifactTypes, stages, projectSlug }: BoxViewProps) {
  const projectGraph = useStore((s) => s.projectGraph);
  const selectArtifact = useStore((s) => s.selectArtifact);
  const selectedArtifactId = useStore((s) => s.selectedArtifactId);

  const tree = useMemo(() => {
    if (!projectGraph) return [];
    return buildTree(projectGraph.artifacts, projectGraph.relations);
  }, [projectGraph]);

  if (!projectGraph) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading graph…
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        No artifacts yet. Add your first artifact to begin.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4">
        {tree.map((root) => (
          <ArtifactBlock
            key={root.artifact.id}
            node={root}
            depth={0}
            onSelect={(id) => selectArtifact(id === selectedArtifactId ? null : id)}
            selectedId={selectedArtifactId}
            artifactTypes={artifactTypes}
            stages={stages}
            projectSlug={projectSlug}
          />
        ))}
      </div>
    </div>
  );
}
