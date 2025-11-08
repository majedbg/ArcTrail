import { PrismaClient } from "@prisma/client";
import type { ProjectDTO, IterationNode, IterationEdge } from "./types";

const prisma = new PrismaClient();

// Singleton pattern for Prisma client in server context
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = db;

/**
 * Fetch a project with its nodes and edges, converting to DTO format
 */
export async function getProject(projectId: string): Promise<ProjectDTO | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!project) return null;

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary ?? undefined,
    nodes: project.nodes.map(parseNode),
    edges: project.edges.map(parseEdge),
  };
}

/**
 * Fetch a project by slug
 */
export async function getProjectBySlug(slug: string): Promise<ProjectDTO | null> {
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!project) return null;

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary ?? undefined,
    nodes: project.nodes.map(parseNode),
    edges: project.edges.map(parseEdge),
  };
}

/**
 * Parse Prisma node to DTO format
 */
function parseNode(node: {
  id: string;
  title: string;
  dateISO: string;
  summary: string | null;
  categories: string;
  media: string | null;
  metrics: string | null;
}): IterationNode {
  return {
    id: node.id,
    title: node.title,
    dateISO: node.dateISO,
    summary: node.summary ?? undefined,
    categories: JSON.parse(node.categories || "[]"),
    media: node.media ? JSON.parse(node.media) : undefined,
    metrics: node.metrics ? JSON.parse(node.metrics) : undefined,
  };
}

/**
 * Parse Prisma edge to DTO format
 */
function parseEdge(edge: {
  id: string;
  fromId: string;
  toId: string;
  kind: string | null;
}): IterationEdge {
  return {
    id: edge.id,
    fromId: edge.fromId,
    toId: edge.toId,
    kind: edge.kind ?? undefined,
  };
}

/**
 * Create a new project
 */
export async function createProject(data: {
  title: string;
  slug: string;
  summary?: string;
}) {
  return db.project.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
    },
  });
}

/**
 * Create a node
 */
export async function createNode(data: {
  projectId: string;
  title: string;
  dateISO: string;
  summary?: string;
  categories?: string[];
  media?: unknown;
  metrics?: Record<string, number>;
}) {
  return db.node.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      dateISO: data.dateISO,
      summary: data.summary,
      categories: JSON.stringify(data.categories || []),
      media: data.media ? JSON.stringify(data.media) : null,
      metrics: data.metrics ? JSON.stringify(data.metrics) : null,
    },
  });
}

/**
 * Update a node
 */
export async function updateNode(
  nodeId: string,
  data: {
    title?: string;
    dateISO?: string;
    summary?: string;
    categories?: string[];
    media?: unknown;
    metrics?: Record<string, number>;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.dateISO !== undefined) updateData.dateISO = data.dateISO;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.categories !== undefined) updateData.categories = JSON.stringify(data.categories);
  if (data.media !== undefined) updateData.media = data.media ? JSON.stringify(data.media) : null;
  if (data.metrics !== undefined) updateData.metrics = data.metrics ? JSON.stringify(data.metrics) : null;

  return db.node.update({
    where: { id: nodeId },
    data: updateData,
  });
}

/**
 * Delete a node
 */
export async function deleteNode(nodeId: string) {
  return db.node.delete({
    where: { id: nodeId },
  });
}

/**
 * Create an edge
 */
export async function createEdge(data: {
  projectId: string;
  fromId: string;
  toId: string;
  kind?: string;
}) {
  return db.edge.create({
    data: {
      projectId: data.projectId,
      fromId: data.fromId,
      toId: data.toId,
      kind: data.kind,
    },
  });
}

/**
 * Delete an edge
 */
export async function deleteEdge(edgeId: string) {
  return db.edge.delete({
    where: { id: edgeId },
  });
}

/**
 * List all projects
 */
export async function listProjects() {
  return db.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

