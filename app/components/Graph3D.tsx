import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useMemo } from "react";
import type { IterationNode, IterationEdge } from "~/lib/types";

interface Graph3DProps {
  nodes: IterationNode[];
  edges: IterationEdge[];
  onNodeClick?: (nodeId: string) => void;
}

// Simple 3D node representation
function Node3D({
  position,
  node,
  onClick,
}: {
  position: [number, number, number];
  node: IterationNode;
  onClick?: () => void;
}) {
  return (
    <group position={position} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.2}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {node.title}
      </Text>
    </group>
  );
}

// Simple 3D edge representation
function Edge3D({
  from,
  to,
}: {
  from: [number, number, number];
  to: [number, number, number];
}) {
  const [x1, y1, z1] = from;
  const [x2, y2, z2] = to;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const midZ = (z1 + z2) / 2;
  const length = Math.sqrt(
    Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
  );

  return (
    <mesh position={[midX, midY, midZ]}>
      <cylinderGeometry args={[0.02, 0.02, length, 8]} />
      <meshStandardMaterial color="#9ca3af" />
    </mesh>
  );
}

export function Graph3D({ nodes, edges, onNodeClick }: Graph3DProps) {
  // Simple circular layout for 3D visualization
  const nodePositions = useMemo(() => {
    const radius = 3;
    const positions: Record<string, [number, number, number]> = {};

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (index % 3) * 0.5 - 1; // Stagger vertically
      positions[node.id] = [x, y, z];
    });

    return positions;
  }, [nodes]);

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />

        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;
          return (
            <Node3D
              key={node.id}
              position={pos}
              node={node}
              onClick={() => onNodeClick?.(node.id)}
            />
          );
        })}

        {edges.map((edge) => {
          const fromPos = nodePositions[edge.fromId];
          const toPos = nodePositions[edge.toId];
          if (!fromPos || !toPos) return null;
          return <Edge3D key={edge.id} from={fromPos} to={toPos} />;
        })}
      </Canvas>
    </div>
  );
}

