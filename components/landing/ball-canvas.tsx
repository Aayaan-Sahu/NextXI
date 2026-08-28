"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import { Box3, Vector3, type Group } from "three";

/**
 * Meshopt-compressed. The source model was a 1.89 MB Sketchfab export whose
 * seam stitching alone was 104k triangles — it landed seconds after the rest
 * of the hero and popped in. Reproduce with:
 *
 *   gltf-transform weld     in.glb welded.glb
 *   gltf-transform simplify welded.glb s.glb --ratio 0.35 --error 0.0005
 *   gltf-transform meshopt  s.glb cricket-ball.glb
 *
 * 1.89 MB → 528 KB, with 0.6% of rendered pixels differing from the original.
 * The uncompressed source is in git history if it ever needs redoing.
 */
const BALL_MODEL = "/cricket-ball.glb";

// Draco off, meshopt on. drei bundles the meshopt decoder locally but points
// DRACOLoader at a gstatic CDN, and the file carries no Draco — so leaving it
// enabled only risks an off-site request for nothing. Must match `preload`.
const USE_DRACO = false;
const USE_MESHOPT = true;

type BallProps = {
  progress: MotionValue<number>;
  reduced: boolean;
  /** Fires once the model has decoded *and* its first frame is on screen, so
      the hero can fade the ball in rather than letting it appear mid-scene. */
  onReady?: () => void;
};

function CricketBall({ progress, reduced, onReady }: BallProps) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(BALL_MODEL, USE_DRACO, USE_MESHOPT);
  const invalidate = useThree((state) => state.invalidate);

  // Demand-driven frameloop: render only when scroll moves the ball (plus one
  // frame on mount). While the video section covers the hero, progress is
  // clamped and the canvas goes fully idle instead of contending for the GPU.
  useEffect(() => {
    invalidate();
    return progress.on("change", () => invalidate());
  }, [progress, invalidate]);

  // This component only mounts once useGLTF has resolved, so reaching here
  // means the geometry exists. Two rAFs then guarantee the demand-loop frame
  // requested above has actually painted — announcing readiness any earlier
  // fades in a canvas that is still blank.
  useEffect(() => {
    if (!onReady) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [onReady]);

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
    // The delivery: past 82% the ball accelerates into the camera so its
    // leather fills the frame for the red wipe into the next section.
    const launch = reduced ? 0 : Math.max(0, (p - 0.82) / 0.18);
    ball.rotation.y = p * Math.PI * 4 + launch * Math.PI;
    ball.scale.setScalar(0.6 + p * 1.8 + launch * launch * 7);
  });

  return (
    <group ref={group}>
      <group scale={fit}>
        <primitive object={scene} position={[-center.x, -center.y, -center.z]} />
      </group>
    </group>
  );
}

useGLTF.preload(BALL_MODEL, USE_DRACO, USE_MESHOPT);

export default function BallCanvas(props: BallProps) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      // The hero scales this canvas's wrapper 0.94 → 1 as the ball fades in.
      // Fiber sizes the canvas from getBoundingClientRect(), which reports the
      // *transformed* box — measured mid-entrance, the canvas came out at 94 %
      // of the frame, pinned top-left, and the ball sat up and to the left of
      // centre until the first scroll made the container re-measure.
      // offsetWidth/offsetHeight ignore transforms.
      resize={{ offsetSize: true }}
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
