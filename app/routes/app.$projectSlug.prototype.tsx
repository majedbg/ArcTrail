import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "../lib/db.server.js";
import { PrototypeView } from "../components/views/PrototypeView/index.js";

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

  const [artifacts, relations, snapshots, snapshotRelations] =
    await Promise.all([
      prisma.artifact.findMany({
        where: { projectId: project.id },
        include: { artifactType: true, stage: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.relation.findMany({
        where: { projectId: project.id },
        include: { relationType: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.snapshot.findMany({
        where: { projectId: project.id },
        include: { members: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.snapshotRelation.findMany({
        where: {
          from: { projectId: project.id },
        },
        include: { relationType: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const graph = { project, artifacts, relations, snapshots };

  return json({ graph, snapshotRelations });
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
    case "createSnapshot": {
      const prototypeArtifactId = form.get("prototypeArtifactId");
      const versionString = form.get("versionString");
      if (
        typeof prototypeArtifactId !== "string" ||
        typeof versionString !== "string"
      ) {
        return json(
          { error: "prototypeArtifactId and versionString are required" },
          { status: 400 },
        );
      }

      const displayLabel = (form.get("displayLabel") as string) || null;
      const notes = (form.get("notes") as string) || null;
      const memberIds = form.get("memberIds");
      const parentSnapshotId = form.get("parentSnapshotId") as string | null;
      const relationTypeId = form.get("relationTypeId") as string | null;

      const snapshot = await prisma.snapshot.create({
        data: {
          projectId: project.id,
          prototypeArtifactId,
          versionString: versionString.trim(),
          displayLabel,
          dateISO: new Date().toISOString().slice(0, 10),
          notes,
          members: memberIds
            ? {
                create: JSON.parse(memberIds as string).map(
                  (artifactId: string) => ({ artifactId }),
                ),
              }
            : undefined,
        },
      });

      // Create snapshot relation from parent if provided
      if (parentSnapshotId && relationTypeId) {
        await prisma.snapshotRelation.create({
          data: {
            fromSnapshotId: parentSnapshotId,
            toSnapshotId: snapshot.id,
            relationTypeId,
          },
        });
      }

      return json({ ok: true, snapshotId: snapshot.id });
    }

    case "deleteSnapshot": {
      const id = form.get("id");
      if (typeof id !== "string") {
        return json({ error: "id is required" }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.snapshotMember.deleteMany({ where: { snapshotId: id } }),
        prisma.snapshotRelation.deleteMany({
          where: { OR: [{ fromSnapshotId: id }, { toSnapshotId: id }] },
        }),
        prisma.snapshot.delete({ where: { id } }),
      ]);
      return json({ ok: true });
    }

    case "createSnapshotRelation": {
      const fromSnapshotId = form.get("fromSnapshotId");
      const toSnapshotId = form.get("toSnapshotId");
      const relationTypeId = form.get("relationTypeId");
      if (
        typeof fromSnapshotId !== "string" ||
        typeof toSnapshotId !== "string" ||
        typeof relationTypeId !== "string"
      ) {
        return json(
          {
            error:
              "fromSnapshotId, toSnapshotId, and relationTypeId are required",
          },
          { status: 400 },
        );
      }
      await prisma.snapshotRelation.create({
        data: { fromSnapshotId, toSnapshotId, relationTypeId },
      });
      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown intent" }, { status: 400 });
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PrototypePage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="h-screen">
      <PrototypeView
        graph={data.graph as unknown as Parameters<typeof PrototypeView>[0]["graph"]}
        snapshotRelations={data.snapshotRelations as unknown as Parameters<typeof PrototypeView>[0]["snapshotRelations"]}
      />
    </div>
  );
}
