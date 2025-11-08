import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ProjectDTO } from "./types";
import { Graph2D } from "~/components/Graph2D";
import { NodeCard } from "~/components/NodeCard";

interface EmbedViewerProps {
  project: ProjectDTO;
}

/**
 * Read-only viewer component for embeds
 */
function EmbedViewer({ project }: EmbedViewerProps) {
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

/**
 * Mount the embed viewer into a DOM element
 */
export function mountEmbedViewer(element: HTMLElement, project: ProjectDTO) {
  const root = createRoot(element);
  root.render(<EmbedViewer project={project} />);
  return () => root.unmount();
}

/**
 * Initialize embed script - finds all [data-project] elements and loads their projects
 */
export function initEmbedScript() {
  const elements = document.querySelectorAll<HTMLElement>("[data-project]");

  elements.forEach((element) => {
    const projectId = element.getAttribute("data-project");
    if (!projectId) return;

    // Fetch project data
    fetch(`/api/embed/${projectId}`)
      .then((res) => res.json())
      .then((data: ProjectDTO) => {
        mountEmbedViewer(element, data);
      })
      .catch((err) => {
        console.error("Failed to load embed:", err);
        element.innerHTML = `<p class="text-red-500">Failed to load project</p>`;
      });
  });
}

