import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "../lib/db.server.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { projectSlug } = params;

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
  });

  if (!project) {
    throw new Response("Not found", { status: 404 });
  }

  // Check public access or valid embed key
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  // For now, all projects are accessible. When isPublic field is added to Project,
  // enforce: if !project.isPublic, require valid EmbedKey.
  if (key) {
    const embedKey = await prisma.embedKey.findUnique({
      where: { publicKey: key },
    });
    if (!embedKey || !embedKey.isActive || embedKey.projectId !== project.id) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  const [artifacts, relations] = await Promise.all([
    prisma.artifact.findMany({
      where: { projectId: project.id, isPublic: true },
      include: { artifactType: true, stage: true },
    }),
    prisma.relation.findMany({
      where: { projectId: project.id },
      include: { relationType: true },
    }),
  ]);

  const graph = {
    project: {
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
    },
    artifacts,
    relations,
    snapshots: [],
  };

  return json(graph, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
