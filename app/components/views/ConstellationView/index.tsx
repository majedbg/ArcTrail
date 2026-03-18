/**
 * @layer view
 * @description 3D constellation view using react-three-fiber.
 *   Concentric ring layout from deriveConstellationData().
 *   Must be loaded via dynamic import with ssr:false (WebGL cannot SSR).
 * @consumes ProjectGraph from Zustand store
 * @emits selectArtifact via store
 * @diffAware false
 * @tiltEnabled false
 */

import { useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls, Text } from "@react-three/drei";
import { useStore } from "~/lib/store.js";
import { deriveConstellationData } from "~/lib/derived/constellationView.js";
import { ParticleRelationLine } from "./ParticleRelationLine.js";
import type { ConstellationNode, ConstellationEdge } from "~/lib/types.js";

// TODO: add bloom (drei EffectComposer + Bloom)
// for constellation glow effect in future enhancement

// ---------------------------------------------------------------------------
// Sphere mesh for a single artifact
// ---------------------------------------------------------------------------

function ArtifactSphere({ node }: { node: ConstellationNode }) {
  const selectArtifact = useStore((s) => s.selectArtifact);

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          selectArtifact(node.artifact.id);
        }}
      >
        <sphereGeometry args={[node.radius, 32, 32]} />
        <meshStandardMaterial color={node.color} />
      </mesh>
      <Text
        position={[0, node.radius + 0.2, 0]}
        fontSize={0.22}
        color="white"
        anchorX="center"
        anchorY="bottom"
      >
        {node.artifact.title}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Inner scene (must be inside <Canvas>)
// ---------------------------------------------------------------------------

function ConstellationScene() {
  const projectGraph = useStore((s) => s.projectGraph);

  const data = useMemo(() => {
    if (!projectGraph) return null;
    return deriveConstellationData(projectGraph);
  }, [projectGraph]);

  if (!data) return null;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* Background */}
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

      {/* Artifact spheres */}
      {data.nodes.map((node) => (
        <ArtifactSphere key={node.artifact.id} node={node} />
      ))}

      {/* Relation lines */}
      {data.edges.map((edge, i) => (
        <ParticleRelationLine
          key={i}
          from={edge.from}
          to={edge.to}
          color={edge.relationType.color}
          animated={edge.relationType.animated}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component (wraps R3F Canvas)
// ---------------------------------------------------------------------------

export function ConstellationView() {
  return (
    <div className="h-full w-full" style={{ background: "var(--canvas-bg)" }}>
      <Canvas camera={{ position: [0, 4, 14], fov: 50 }}>
        <Suspense fallback={null}>
          <ConstellationScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
