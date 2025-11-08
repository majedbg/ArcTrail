import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { IterationNode, IterationEdge } from "~/lib/types";
import { layoutGraph } from "~/lib/elk";

interface Graph2DProps {
  nodes: IterationNode[];
  edges: IterationEdge[];
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
  onEdgeAdd?: (fromId: string, toId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onRelayout?: () => void;
}

export function Graph2D({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  onEdgeAdd,
  onEdgeDelete,
  onRelayout,
}: Graph2DProps) {
  const [isLayouting, setIsLayouting] = useState(false);

  // Convert to React Flow format
  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "default",
        data: {
          label: (
            <div className="p-2">
              <div className="font-semibold">{n.title}</div>
              <div className="text-xs text-gray-500">{n.dateISO}</div>
              {n.categories.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {n.categories.slice(0, 2).map((cat) => (
                    <span
                      key={cat}
                      className="rounded bg-blue-100 px-1 text-xs text-blue-800"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ),
        },
        position: { x: 0, y: 0 }, // Will be set by layout
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.fromId,
        target: e.toId,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        label: e.kind || "",
      })),
    [edges]
  );

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Apply layout when nodes/edges change
  useEffect(() => {
    if (nodes.length === 0) return;

    setIsLayouting(true);
    layoutGraph(nodes, edges)
      .then((positions) => {
        setNodes((nds) =>
          nds.map((n) => {
            const pos = positions[n.id];
            return pos ? { ...n, position: pos } : n;
          })
        );
      })
      .finally(() => setIsLayouting(false));
  }, [nodes, edges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (onEdgeAdd) {
        onEdgeAdd(params.source, params.target);
      }
    },
    [onEdgeAdd]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeDelete) {
        onEdgeDelete(edge.id);
      }
    },
    [onEdgeDelete]
  );

  const onNodeClickInternal = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  return (
    <div className="h-full w-full">
      {isLayouting && (
        <div className="absolute right-4 top-4 z-10 rounded bg-white px-3 py-1 text-sm shadow">
          Layouting...
        </div>
      )}
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClickInternal}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

