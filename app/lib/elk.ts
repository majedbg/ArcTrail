import ELK, { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export async function layoutGraph(
  nodes: { id: string }[],
  edges: { id: string; fromId: string; toId: string }[]
) {
  const elkNodes: ElkNode[] = nodes.map((n) => ({
    id: n.id,
    width: 260,
    height: 120,
  }));

  const elkEdges: ElkExtendedEdge[] = edges.map((e) => ({
    id: e.id,
    sources: [e.fromId],
    targets: [e.toId],
  }));

  const g = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "32",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
    },
    children: elkNodes,
    edges: elkEdges,
  });

  const positions: Record<string, { x: number; y: number }> = {};
  g.children?.forEach((c) => {
    positions[c.id] = { x: c.x ?? 0, y: c.y ?? 0 };
  });

  return positions;
}

