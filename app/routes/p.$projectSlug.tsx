import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "../lib/db.server.js";

export async function loader({ params }: LoaderFunctionArgs) {
  const { projectSlug } = params;

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
  });

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const [artifacts, relations, snapshots] = await Promise.all([
    prisma.artifact.findMany({
      where: { projectId: project.id, isPublic: true },
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
  ]);

  const graph = { project, artifacts, relations, snapshots };

  return json({ graph });
}

export default function PublicProjectPage() {
  const { graph } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{graph.project.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">Public view</p>
      <pre className="mt-6 overflow-auto rounded bg-zinc-900 p-4 text-xs text-zinc-300">
        {JSON.stringify(graph, null, 2)}
      </pre>
      <div className="mt-8 text-center text-xs text-zinc-600">
        Made with ArcTrail
      </div>
    </div>
  );
}
