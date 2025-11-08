import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { getProject, createNode, updateNode, deleteNode, createEdge, deleteEdge } from "~/lib/utils.server";
import { Graph2D } from "~/components/Graph2D";
import { MarkdownViewer } from "~/components/MarkdownViewer";
import { NodeForm } from "~/components/NodeForm";
import type { IterationNode, MediaItem } from "~/lib/types";

export async function loader({ params }: LoaderFunctionArgs) {
  const projectId = params.projectId;
  if (!projectId) {
    throw new Response("Project ID required", { status: 400 });
  }

  const project = await getProject(projectId);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  return json({ project });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const projectId = params.projectId;
  if (!projectId) {
    return json({ error: "Project ID required" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    switch (intent) {
      case "createNode": {
        const title = formData.get("title") as string;
        const dateISO = formData.get("dateISO") as string;
        const summary = formData.get("summary") as string;
        const categoriesStr = formData.get("categories") as string;
        const categories = categoriesStr ? categoriesStr.split(",").map((c) => c.trim()) : [];
        const mediaJson = formData.get("mediaJson") as string;
        const contentMd = formData.get("contentMd") as string;
        const contentFormat = formData.get("contentFormat") as string;
        const showBoth = formData.get("showBoth") === "1";

        if (!title || !dateISO) {
          return json({ error: "Title and date are required" }, { status: 400 });
        }

        let media: MediaItem[] | undefined;
        if (mediaJson) {
          try {
            media = JSON.parse(mediaJson) as MediaItem[];
          } catch {
            // Invalid JSON, ignore
          }
        }

        await createNode({
          projectId,
          title,
          dateISO,
          summary: summary || undefined,
          categories: categories.length > 0 ? categories : undefined,
          media: media && media.length > 0 ? media : undefined,
          contentMd: contentMd || null,
          contentFormat: contentFormat || null,
          showBoth,
        });
        return json({ success: true });
      }

      case "updateNode": {
        const nodeId = formData.get("nodeId") as string;
        const title = formData.get("title") as string;
        const dateISO = formData.get("dateISO") as string;
        const summary = formData.get("summary") as string;
        const categoriesStr = formData.get("categories") as string;
        const categories = categoriesStr ? categoriesStr.split(",").map((c) => c.trim()) : [];
        const mediaJson = formData.get("mediaJson") as string;
        const contentMd = formData.get("contentMd") as string;
        const contentFormat = formData.get("contentFormat") as string;
        const showBoth = formData.get("showBoth") === "1";

        if (!nodeId) {
          return json({ error: "Node ID required" }, { status: 400 });
        }

        let media: MediaItem[] | undefined;
        if (mediaJson) {
          try {
            media = JSON.parse(mediaJson) as MediaItem[];
          } catch {
            // Invalid JSON, ignore
          }
        }

        await updateNode(nodeId, {
          title: title || undefined,
          dateISO: dateISO || undefined,
          summary: summary || undefined,
          categories: categories.length > 0 ? categories : undefined,
          media: media !== undefined ? media : undefined,
          contentMd: contentMd || null,
          contentFormat: contentFormat || null,
          showBoth,
        });
        return json({ success: true });
      }

      case "deleteNode": {
        const nodeId = formData.get("nodeId") as string;
        if (!nodeId) {
          return json({ error: "Node ID required" }, { status: 400 });
        }
        await deleteNode(nodeId);
        return json({ success: true });
      }

      case "createEdge": {
        const fromId = formData.get("fromId") as string;
        const toId = formData.get("toId") as string;
        const kind = formData.get("kind") as string;

        if (!fromId || !toId) {
          return json({ error: "From and To IDs required" }, { status: 400 });
        }

        await createEdge({
          projectId,
          fromId,
          toId,
          kind: kind || undefined,
        });
        return json({ success: true });
      }

      case "deleteEdge": {
        const edgeId = formData.get("edgeId") as string;
        if (!edgeId) {
          return json({ error: "Edge ID required" }, { status: 400 });
        }
        await deleteEdge(edgeId);
        return json({ success: true });
      }

      default:
        return json({ error: "Unknown intent" }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return json({ error: message }, { status: 400 });
  }
}

export default function ProjectEditor() {
  const { project } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [showAddNode, setShowAddNode] = useState(false);
  const [editingNode, setEditingNode] = useState<IterationNode | null>(null);

  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId);

  // Refresh after action
  if (actionData?.success) {
    // Simple refresh - in production, use revalidation
    setTimeout(() => navigate(0), 100);
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="border-b bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            {project.summary && (
              <p className="text-sm text-gray-600">{project.summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={`/p/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              View Public
            </a>
            <button
              onClick={() => setShowAddNode(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Add Node
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Filters & Actions */}
        <aside className="w-64 border-r bg-white p-4 overflow-y-auto">
          <h2 className="mb-4 font-semibold">Actions</h2>
          <button
            onClick={() => navigate(0)}
            className="mb-2 w-full rounded-md bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300"
          >
            Relayout Graph
          </button>

          {showAddNode && (
            <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-4 font-semibold">Add Node</h3>
              <NodeForm projectId={project.id} onCancel={() => setShowAddNode(false)} />
            </div>
          )}

          {actionData?.error && (
            <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-800">
              {actionData.error}
            </div>
          )}
        </aside>

        {/* Main graph view */}
        <main className="flex-1">
          <Graph2D
            nodes={project.nodes}
            edges={project.edges}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            onEdgeAdd={(fromId, toId) => {
              const form = document.createElement("form");
              form.method = "post";
              form.innerHTML = `
                <input type="hidden" name="intent" value="createEdge" />
                <input type="hidden" name="fromId" value="${fromId}" />
                <input type="hidden" name="toId" value="${toId}" />
              `;
              document.body.appendChild(form);
              form.submit();
            }}
            onEdgeDelete={(edgeId) => {
              const form = document.createElement("form");
              form.method = "post";
              form.innerHTML = `
                <input type="hidden" name="intent" value="deleteEdge" />
                <input type="hidden" name="edgeId" value="${edgeId}" />
              `;
              document.body.appendChild(form);
              form.submit();
            }}
          />
        </main>

        {/* Right sidebar - Node details */}
        {selectedNode && (
          <aside className="w-80 border-l bg-white p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Node Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingNode(selectedNode)}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  Edit
                </button>
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="deleteNode" />
                  <input type="hidden" name="nodeId" value={selectedNode.id} />
                  <button
                    type="submit"
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </Form>
              </div>
            </div>

            {editingNode && editingNode.id === selectedNode.id ? (
              <NodeForm node={editingNode} projectId={project.id} onCancel={() => setEditingNode(null)} />
            ) : (
              <MarkdownViewer node={selectedNode} />
            )}
          </aside>
        )}
      </div>

      {/* 
        Example data seeding snippet (for quick testing):
        
        // In browser console or a test script:
        const projectId = "YOUR_PROJECT_ID";
        
        // Create sample nodes
        await fetch(`/app/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            intent: "createNode",
            title: "Initial Prototype",
            dateISO: "2024-01-15",
            categories: "digital,physical",
            summary: "First iteration of the design"
          })
        });
        
        // Create edges between nodes (after creating multiple nodes)
        await fetch(`/app/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            intent: "createEdge",
            fromId: "NODE_ID_1",
            toId: "NODE_ID_2",
            kind: "improves"
          })
        });
      */}
    </div>
  );
}

