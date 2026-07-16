"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import { Box3, Vector3, type Group } from "three";

const BALL_MODEL = "/cricket-ball.glb";

type BallProps = {
  progress: MotionValue<number>;
  reduced: boolean;
};

function CricketBall({ progress, reduced }: BallProps) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(BALL_MODEL);

  // Normalize whatever size/origin the model ships with to a centered,
  // radius-1 ball so the scroll-driven scale below stays predictable.
  const { center, fit } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { center: box.getCenter(new Vector3()), fit: 2 / maxDim };
  }, [scene]);

  useFrame(() => {
    const ball = group.current;
    if (!ball) return;
    const p = reduced ? 1 : progress.get();
    ball.rotation.y = p * Math.PI * 4;
    ball.scale.setScalar(0.6 + p * 1.8);
  });

  return (
    <group ref={group}>
      <group scale={fit}>
        <primitive object={scene} position={[-center.x, -center.y, -center.z]} />
      </group>
    </group>
  );
}

useGLTF.preload(BALL_MODEL);

export default function BallCanvas(props: BallProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 4, 5]} intensity={2} />
      <pointLight position={[-5, -2, -4]} intensity={30} color="#f0c8a0" />
      <Suspense fallback={null}>
        <CricketBall {...props} />
      </Suspense>
    </Canvas>
  );
}
