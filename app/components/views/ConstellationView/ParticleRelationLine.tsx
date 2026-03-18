/**
 * @layer view
 * @description R3F relation line renderer using TubeGeometry + custom ShaderMaterial.
 *   Renders a thin tube along a CatmullRomCurve3 between two 3D positions.
 *   Fragment shader pulses opacity using sin() for a flowing energy effect.
 * @consumes RelationLineData (3D variant with z coordinates)
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

// TODO: replace with particle system
// Intended: Points geometry sampled along the
// curve, each point displaced by sin(time + offset)
// to create an emission/energy field appearance.
// Use THREE.Points with custom ShaderMaterial.
// Particle count: ~60 per line segment.
// Size attenuation: true, size 0.04.
// Blend mode: AdditiveBlending for glow effect.

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type ParticleRelationLineProps = {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  color: string;
  animated?: boolean;
};

// ---------------------------------------------------------------------------
// Vertex shader
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Fragment shader — sin() pulse along the tube for flowing energy effect
// ---------------------------------------------------------------------------

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uAnimated;
  varying vec2 vUv;

  void main() {
    // Base opacity
    float alpha = 0.6;

    // When animated, pulse opacity along the tube using sin()
    // sin(uv.x * 6.28 - uTime * 2.0) creates a single wavelength
    // flowing from source to target
    if (uAnimated > 0.5) {
      float pulse = sin(vUv.x * 6.28 - uTime * 2.0);
      alpha = 0.3 + 0.5 * (0.5 + 0.5 * pulse);
    }

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParticleRelationLine({
  from,
  to,
  color,
  animated = false,
}: ParticleRelationLineProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // Build CatmullRomCurve3 between the two positions
  const { geometry, uniforms } = useMemo(() => {
    const fromVec = new THREE.Vector3(from.x, from.y, from.z);
    const toVec = new THREE.Vector3(to.x, to.y, to.z);
    // Midpoint with slight Y lift for curve
    const mid = fromVec.clone().lerp(toVec, 0.5);
    mid.y += 0.5;

    const curve = new THREE.CatmullRomCurve3([fromVec, mid, toVec]);

    // TubeGeometry: thin tube along the curve
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.02, 8, false);

    // Parse color string to vec3
    const parsedColor = new THREE.Color(color);

    const shaderUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(parsedColor.r, parsedColor.g, parsedColor.b) },
      uAnimated: { value: animated ? 1.0 : 0.0 },
    };

    return { geometry: tubeGeometry, uniforms: shaderUniforms };
  }, [from, to, color, animated]);

  // Animate uTime uniform
  useFrame((_, delta) => {
    if (materialRef.current && animated) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
