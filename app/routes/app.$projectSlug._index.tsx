import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useEffect, lazy, Suspense } from "react";
import { prisma } from "../lib/db.server.js";
import { useStore } from "../lib/store.js";
import { selectArtifactById, selectRelationsForArtifact } from "../lib/store.js";
import { GraphCanvas } from "../components/views/GraphCanvas/index.js";
import { RelationLayerToggle } from "../components/organisms/RelationLayerToggle.js";
import { SyncIndicatorOrganism } from "../components/organisms/SyncIndicator.js";
import { ArtifactSheet } from "../components/organisms/ArtifactSheet.js";
import { ArtifactForm } from "../components/organisms/ArtifactForm.js";
import { AIAssistant } from "../components/organisms/AIAssistant.js";
import { Button } from "../components/atoms/Button.js";
import type { ViewMode } from "../lib/store/uiSlice.js";
import type { ArtifactType, Stage } from "../lib/types.js";

// Dynamic import: ConstellationView uses WebGL (cannot SSR)
const LazyConstellationView = lazy(() =>
  import("../components/views/ConstellationView/ConstellationView.client.js").then(
    (m) => ({ default: m.ConstellationView }),
  ),
);

// ---------------------------------------------------------------------------
// Helpers: parse SQLite JSON string fields into app-layer types
// ---------------------------------------------------------------------------

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseMediaArray(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ params }: LoaderFunctionArgs) {
  const { projectSlug } = params;

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
  });

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const artifacts = await prisma.artifact.findMany({
    where: { projectId: project.id },
    include: { artifactType: true, stage: true },
    orderBy: { createdAt: "asc" },
  });
  const relations = await prisma.relation.findMany({
    where: { projectId: project.id },
    include: { relationType: true },
    orderBy: { createdAt: "asc" },
  });
  const [snapshots, artifactTypes, relationTypes, stages] = await Promise.all([
    prisma.snapshot.findMany({
      where: { projectId: project.id },
      include: { members: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.artifactType.findMany({ orderBy: { name: "asc" } }),
    prisma.relationType.findMany({ orderBy: { name: "asc" } }),
    prisma.stage.findMany({ orderBy: { order: "asc" } }),
  ]);

  // Transform Prisma models → app-layer types (parse JSON string fields)
  const parsedArtifacts = artifacts.map((a) => ({
    ...a,
    categories: parseJsonArray(a.categories),
    media: parseMediaArray(a.media),
    typeProps: parseJsonObject(a.typeProps),
    metrics: parseJsonObject(a.metrics),
  }));

  const parsedRelations = relations.map((r) => ({
    ...r,
    metadata: parseJsonObject(r.metadata),
  }));

  const graph = {
    project,
    artifacts: parsedArtifacts,
    relations: parsedRelations,
    snapshots,
  };

  return json({ graph, artifactTypes, relationTypes, stages });
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function action({ request, params }: ActionFunctionArgs) {
  const { projectSlug } = params;
  const form = await request.formData();
  const intent = form.get("intent");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
  });
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  switch (intent) {
    case "createArtifact": {
      const title = form.get("title");
      const kind = form.get("kind");
      if (typeof title !== "string" || typeof kind !== "string") {
        return json({ error: "title and kind are required" }, { status: 400 });
      }
      const artifactTypeId = form.get("artifactTypeId") as string | null;
      const stageId = form.get("stageId") as string | null;
      const representation =
        (form.get("representation") as string) || "medium";
      const summary = (form.get("summary") as string) || null;
      const categories = form.get("categories") as string | null;

      const artifact = await prisma.artifact.create({
        data: {
          projectId: project.id,
          title: title.trim(),
          kind,
          representation,
          artifactTypeId: artifactTypeId || null,
          stageId: stageId || null,
          summary,
          categories: categories || "[]",
        },
      });

      // Auto-create PARENT_OF relation when parentId is provided
      const parentId = form.get("parentId") as string | null;
      if (parentId) {
        const parentOfType = await prisma.relationType.findFirst({
          where: { name: "PARENT_OF" },
        });
        if (parentOfType) {
          await prisma.relation.create({
            data: {
              projectId: project.id,
              fromId: parentId,
              toId: artifact.id,
              relationTypeId: parentOfType.id,
            },
          });
        }
      }

      return json({ ok: true });
    }

    case "updateArtifact": {
      const id = form.get("id");
      if (typeof id !== "string") {
        return json({ error: "id is required" }, { status: 400 });
      }
      const data: Record<string, unknown> = {};
      for (const field of [
        "title",
        "kind",
        "representation",
        "summary",
        "contentMd",
        "artifactTypeId",
        "stageId",
        "subsystemCode",
        "dateISO",
      ]) {
        const val = form.get(field);
        if (val !== null) data[field] = val;
      }
      const categories = form.get("categories");
      if (typeof categories === "string") {
        data.categories = categories;
      }
      await prisma.artifact.update({ where: { id }, data });
      return json({ ok: true });
    }

    case "deleteArtifact": {
      const id = form.get("id");
      if (typeof id !== "string") {
        return json({ error: "id is required" }, { status: 400 });
      }
      // Cascade: delete entries, components, snapshot members, relations
      await prisma.$transaction([
        prisma.entry.deleteMany({ where: { artifactId: id } }),
        prisma.artifactComponent.deleteMany({ where: { artifactId: id } }),
        prisma.snapshotMember.deleteMany({ where: { artifactId: id } }),
        prisma.relation.deleteMany({
          where: { OR: [{ fromId: id }, { toId: id }] },
        }),
        prisma.artifact.delete({ where: { id } }),
      ]);
      return json({ ok: true });
    }

    case "createRelation": {
      const fromId = form.get("fromId");
      const toId = form.get("toId");
      const relationTypeId = form.get("relationTypeId");
      if (
        typeof fromId !== "string" ||
        typeof toId !== "string" ||
        typeof relationTypeId !== "string"
      ) {
        return json(
          { error: "fromId, toId, and relationTypeId are required" },
          { status: 400 },
        );
      }
      if (fromId === toId) {
        return json({ error: "Cannot relate an artifact to itself" }, { status: 400 });
      }
      await prisma.relation.create({
        data: {
          projectId: project.id,
          fromId,
          toId,
          relationTypeId,
          label: (form.get("label") as string) || null,
        },
      });
      return json({ ok: true });
    }

    case "deleteRelation": {
      const id = form.get("id");
      if (typeof id !== "string") {
        return json({ error: "id is required" }, { status: 400 });
      }
      await prisma.relation.delete({ where: { id } });
      return json({ ok: true });
    }

    case "createEntry": {
      const artifactId = form.get("artifactId");
      const title = form.get("title");
      if (typeof artifactId !== "string" || typeof title !== "string") {
        return json(
          { error: "artifactId and title are required" },
          { status: 400 },
        );
      }
      await prisma.entry.create({
        data: {
          artifactId,
          title: title.trim(),
          dateISO: (form.get("dateISO") as string) || new Date().toISOString().slice(0, 10),
          contentMd: (form.get("contentMd") as string) || null,
          summary: (form.get("summary") as string) || null,
          knowledgeDimensions: (form.get("knowledgeDimensions") as string) || "[]",
        },
      });
      return json({ ok: true });
    }

    case "deleteEntry": {
      const id = form.get("id");
      if (typeof id !== "string") {
        return json({ error: "id is required" }, { status: 400 });
      }
      await prisma.entry.delete({ where: { id } });
      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown intent" }, { status: 400 });
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VIEW_LABELS: Record<ViewMode, string> = {
  graph: "Graph",
  prototype: "Prototype",
  constellation: "Constellation",
};

export default function ProjectPage() {
  const data = useLoaderData<typeof loader>();
  const setProjectGraph = useStore((s) => s.setProjectGraph);
  const initActiveRelationTypes = useStore((s) => s.initActiveRelationTypes);
  const openWithMode = useStore((s) => s.openWithMode);
  const selectedArtifactId = useStore((s) => s.selectedArtifactId);
  const selectArtifact = useStore((s) => s.selectArtifact);
  const showArtifactForm = useStore((s) => s.showArtifactForm);
  const editingArtifactId = useStore((s) => s.editingArtifactId);
  const openForm = useStore((s) => s.openForm);
  const closeForm = useStore((s) => s.closeForm);
  const formDefaultKind = useStore((s) => s.formDefaultKind);
  const formParentId = useStore((s) => s.formParentId);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const projectGraph = useStore((s) => s.projectGraph);

  // Hydrate Zustand store from loader data on mount.
  // Remix json() serializes Date → string; cast through unknown since
  // our app layer treats dates as opaque (display-only).
  useEffect(() => {
    setProjectGraph(data.graph as unknown as Parameters<typeof setProjectGraph>[0]);
    initActiveRelationTypes(data.relationTypes as unknown as Parameters<typeof initActiveRelationTypes>[0]);
  }, [data, setProjectGraph, initActiveRelationTypes]);

  // Derive selected artifact and its relations from store
  const selectedArtifact = projectGraph && selectedArtifactId
    ? selectArtifactById(projectGraph as unknown as Parameters<typeof selectArtifactById>[0], selectedArtifactId)
    : undefined;

  const selectedRelations = projectGraph && selectedArtifactId
    ? selectRelationsForArtifact(
        projectGraph as unknown as Parameters<typeof selectRelationsForArtifact>[0],
        selectedArtifactId,
      )
    : [];

  const editingArtifact = projectGraph && editingArtifactId
    ? selectArtifactById(projectGraph as unknown as Parameters<typeof selectArtifactById>[0], editingArtifactId)
    : null;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h1 className="text-lg font-bold">{data.graph.project.title}</h1>

        {/* View toggle */}
        <div className="flex gap-0.5 rounded-lg bg-zinc-800 p-0.5">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-zinc-600 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openWithMode("graph-qa", projectGraph)}
          >
            AI
          </Button>
          <Button variant="primary" size="sm" onClick={() => openForm()}>
            Add Artifact
          </Button>
        </div>
      </header>

      {/* Canvas area */}
      <div className="relative flex-1">
        <RelationLayerToggle
          relationTypes={data.relationTypes as unknown as Parameters<typeof RelationLayerToggle>[0]["relationTypes"]}
        />
        <SyncIndicatorOrganism />

        {view === "graph" && (
          <GraphCanvas
            artifactTypes={data.artifactTypes as unknown as ArtifactType[]}
            stages={data.stages as unknown as Stage[]}
            projectSlug={data.graph.project.slug}
          />
        )}
        {view === "prototype" && (
          <div className="flex h-full items-center justify-center">
            <Link
              to="prototype"
              className="rounded bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Open Prototype View →
            </Link>
          </div>
        )}
        {view === "constellation" && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-zinc-500">
                Loading 3D view…
              </div>
            }
          >
            <LazyConstellationView />
          </Suspense>
        )}
      </div>

      {/* ArtifactSheet overlay */}
      {selectedArtifact && (
        <ArtifactSheet
          artifact={selectedArtifact}
          relations={selectedRelations}
          onClose={() => selectArtifact(null)}
          onEdit={() => {
            openForm(selectedArtifact.id);
            selectArtifact(null);
          }}
        />
      )}

      {/* ArtifactForm modal */}
      {showArtifactForm && (
        <ArtifactForm
          artifact={editingArtifact}
          artifactTypes={data.artifactTypes as unknown as Parameters<typeof ArtifactForm>[0]["artifactTypes"]}
          stages={data.stages as unknown as Parameters<typeof ArtifactForm>[0]["stages"]}
          projectSlug={data.graph.project.slug}
          defaultKind={formDefaultKind}
          parentId={formParentId}
          onClose={closeForm}
        />
      )}

      {/* AI Assistant panel */}
      <AIAssistant />
    </div>
  );
}
