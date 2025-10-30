'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { sparkleVertexShader, sparkleFragmentShader } from './sparkles-shaders';

type Density = 'subtle' | 'moderate' | 'festive';

function getCountForDensity(density: Density) {
  switch (density) {
    case 'subtle':
      return 450;
    case 'moderate':
      return 1000;
    case 'festive':
    default:
      return 1800;
  }
}

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function SparkleBackground({ color, density = 'festive' }: { color: string; density?: Density }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [glFailed, setGlFailed] = useState(false);

  const reducedMotion = prefersReducedMotion();
  const baseColor = useMemo(() => hexToRgb(color), [color]);

  useEffect(() => {
    if (reducedMotion) {
      return; // fallback handled by JSX
    }
    const canvas = canvasRef.current;
    const container = containerRef.current as HTMLDivElement | null;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer) {
      setGlFailed(true);
      return;
    }
    // Test that a context exists
    const gl = renderer.getContext();
    if (!gl) {
      setGlFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 100);
    camera.position.z = 10;

    const clock = new THREE.Clock();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    // Geometry: use Points with custom point sprite shaders for performance
    const particleCountBase = getCountForDensity(density);
    let particleCount = particleCountBase;

    let positions = new Float32Array(particleCount * 3);
    let sizes = new Float32Array(particleCount);
    let speeds = new Float32Array(particleCount);
    let phases = new Float32Array(particleCount);
    let drifts = new Float32Array(particleCount);
    let spins = new Float32Array(particleCount);

    const geometry = new THREE.BufferGeometry();

    function seedParticle(i: number, w: number, h: number, initialSpreadY = true) {
      positions[i * 3 + 0] = THREE.MathUtils.randFloat(-w / 2, w / 2);
      positions[i * 3 + 1] = initialSpreadY
        ? THREE.MathUtils.randFloat(-h / 2, h / 2)
        : h / 2 + THREE.MathUtils.randFloat(20, 200);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-1, 1);

      sizes[i] = THREE.MathUtils.randFloat(8.0, 20.0);
      speeds[i] = THREE.MathUtils.randFloat(40.0, 140.0); // px/sec
      phases[i] = Math.random();
      drifts[i] = THREE.MathUtils.randFloat(-3.14, 3.14);
      spins[i] = THREE.MathUtils.randFloat(0.6, 1.4);
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: sparkleVertexShader,
      fragmentShader: sparkleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uViewport: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: dpr },
        uBaseColor: { value: new THREE.Color(baseColor) },
        uAlpha: { value: 0.55 },
        uMetallic: { value: 1.0 },
        uGloss: { value: 0.9 }
      }
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Resize handling
    function resize() {
      const { clientWidth, clientHeight } = container as HTMLDivElement;
      if (!clientWidth || !clientHeight) return;
      const w = clientWidth;
      const h = clientHeight;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      material.uniforms.uViewport.value.set(w, h);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // FPS monitor and auto-throttle
    let frames = 0;
    let lastFpsCheck = performance.now();
    let reducedOnce = false;

    // Initial seed after we know viewport
    {
      const { x: w, y: h } = material.uniforms.uViewport.value as THREE.Vector2;
      for (let i = 0; i < particleCount; i++) seedParticle(i, w, h, true);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 1));
      geometry.setAttribute('aSpin', new THREE.BufferAttribute(spins, 1));
    }

    function animate() {
      const t = clock.getElapsedTime();
      material.uniforms.uTime.value = t;

      // Update positions for wrapping
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
      const speedAttr = geometry.getAttribute('aSpeed') as THREE.BufferAttribute;
      const viewport = material.uniforms.uViewport.value as THREE.Vector2;
      const top = viewport.y / 2 + 100;
      const bottom = -viewport.y / 2 - 100;
      for (let i = 0; i < particleCount; i++) {
        let y = pos.getY(i);
        y -= speedAttr.getX(i) * 0.016; // roughly per-frame at 60fps
        if (y < bottom) {
          pos.setX(i, THREE.MathUtils.randFloat(-viewport.x / 2, viewport.x / 2));
          pos.setY(i, top);
          pos.setZ(i, THREE.MathUtils.randFloat(-1, 1));
        } else {
          pos.setY(i, y);
        }
      }
      pos.needsUpdate = true;

      renderer.render(scene, camera);

      // FPS check each ~1s
      frames++;
      const now = performance.now();
      if (now - lastFpsCheck > 1000) {
        const fps = (frames * 1000) / (now - lastFpsCheck);
        frames = 0;
        lastFpsCheck = now;
        if (fps < 45 && !reducedOnce) {
          // halve count once to preserve readability
          const newCount = Math.max(Math.floor(particleCount * 0.5), 500);
          if (newCount < particleCount) {
            particleCount = newCount;
            positions = new Float32Array(particleCount * 3);
            sizes = new Float32Array(particleCount);
            speeds = new Float32Array(particleCount);
            phases = new Float32Array(particleCount);
            drifts = new Float32Array(particleCount);
            spins = new Float32Array(particleCount);
            const viewport = material.uniforms.uViewport.value as THREE.Vector2;
            for (let i = 0; i < particleCount; i++) seedParticle(i, viewport.x, viewport.y, true);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
            geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
            geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 1));
            geometry.setAttribute('aSpin', new THREE.BufferAttribute(spins, 1));
            reducedOnce = true;
          }
        }
      }

      raf = requestAnimationFrame(animate);
    }

    let raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [baseColor, density, reducedMotion]);

  // Fallback: CSS gradient if reduced motion or WebGL failure
  if (reducedMotion || glFailed) {
    return (
      <div
        ref={containerRef}
        className="fixed top-0 left-0 w-full h-dvh z-0 pointer-events-none"
        style={{
          background: `radial-gradient(1200px 600px at 20% 20%, ${color}22 0%, transparent 60%), radial-gradient(1000px 500px at 80% 60%, ${color}18 0%, transparent 60%)`
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div ref={containerRef} className="fixed top-0 left-0 w-full h-dvh z-0 pointer-events-none" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}


