import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { getProjectBySlug } from "~/lib/utils.server";
import { Graph2D } from "~/components/Graph2D";
import { NodeCard } from "~/components/NodeCard";

export async function loader({ params }: LoaderFunctionArgs) {
  const projectId = params.projectId;
  if (!projectId) {
    throw new Response("Project ID required", { status: 400 });
  }

  const project = await getProjectBySlug(projectId);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  return json({ project });
}

export default function PublicProjectView() {
  const { project } = useLoaderData<typeof loader>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="border-b bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
        {project.summary && (
          <p className="mt-1 text-sm text-gray-600">{project.summary}</p>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1">
          <Graph2D
            nodes={project.nodes}
            edges={project.edges}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </main>

        {selectedNode && (
          <aside className="w-80 border-l bg-white p-4 overflow-y-auto">
            <NodeCard node={selectedNode} />
          </aside>
        )}
      </div>
    </div>
  );
}

