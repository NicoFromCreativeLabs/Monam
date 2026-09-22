"use client";

import { useEffect, useRef } from "react";
import type { Content } from "@/lib/content";

const SIZE = 380;
const CENTER = SIZE / 2;
const OUTER_R = 168;
const INNER_R = 6;
const STEPS = 260;

const ROTATION_SPEED = 4; // deg/sec — slow, constant spin, independent of the mouse
const TURNS_RANGE: [number, number] = [1.2, 4.2]; // mouse X: how many coils
const ROUGH_RANGE: [number, number] = [0.02, 0.26]; // mouse Y: how rough the noise is (bottom = smooth, top = rough)
const EASE = 0.05;

const DEFAULT_TURNS = 2.5;
const DEFAULT_ROUGH = 0.09;

// Deterministic pseudo-noise (layered sines, fixed seed-like phases) — never
// Math.random(), which would compute a different path on the server than on
// the client and break hydration.
function noise(angle: number) {
  return (
    Math.sin(angle * 2.3 + 1.1) * 0.5 +
    Math.sin(angle * 5.7 + 3.4) * 0.3 +
    Math.sin(angle * 11.3 + 0.7) * 0.2
  );
}

// Organic spiral — like a nautilus/coil, not a closed blob — so the text
// winds inward from the outer edge toward the center, alive and hand-drawn
// in feel rather than a geometric ring. The radius wobbles proportionally
// (noise scales with the current radius), so the tight inner turns stay
// calm while the outer turns wander more, like an imperfect hand-drawn line.
function buildSpiralPath(turns: number, roughness: number) {
  const startAngle = -Math.PI / 2;
  const points: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const angle = startAngle + t * turns * 2 * Math.PI;
    const baseR = OUTER_R - t * (OUTER_R - INNER_R);
    const r = baseR * (1 + roughness * noise(angle));
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function CircleStatement({ content }: { content: Content }) {
  const { circle } = content;
  const sectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);

  const rotation = useRef(0);
  const turns = useRef(DEFAULT_TURNS);
  const roughness = useRef(DEFAULT_ROUGH);
  const targetTurns = useRef(DEFAULT_TURNS);
  const targetRoughness = useRef(DEFAULT_ROUGH);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      // Always spinning, slowly and constantly — never tied to the mouse.
      rotation.current += ROTATION_SPEED * dt;
      ringRef.current?.setAttribute(
        "transform",
        `rotate(${rotation.current.toFixed(2)} ${CENTER} ${CENTER})`
      );

      // The mouse only reshapes the spiral (turns, roughness), eased in.
      turns.current += (targetTurns.current - turns.current) * EASE;
      roughness.current += (targetRoughness.current - roughness.current) * EASE;

      if (pathRef.current) {
        pathRef.current.setAttribute("d", buildSpiralPath(turns.current, roughness.current));
        if (textPathRef.current) {
          const length = pathRef.current.getTotalLength();
          textPathRef.current.setAttribute("textLength", String(length * 0.95));
        }
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    targetTurns.current = TURNS_RANGE[0] + nx * (TURNS_RANGE[1] - TURNS_RANGE[0]);
    targetRoughness.current = ROUGH_RANGE[0] + (1 - ny) * (ROUGH_RANGE[1] - ROUGH_RANGE[0]);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      data-snap-section
      className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-oliva px-6 py-24 min-[860px]:py-32"
    >
      <p className="absolute left-6 top-8 max-w-[200px] font-body text-xs leading-relaxed text-hueso/90 min-[640px]:left-10 min-[640px]:top-10 min-[860px]:left-16 min-[860px]:top-14 min-[860px]:max-w-[240px]">
        {circle.corner1}
      </p>

      <div className="relative mx-auto flex w-full justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-[240px] w-[240px] min-[640px]:h-[360px] min-[640px]:w-[360px]"
          aria-hidden="true"
        >
          <defs>
            <path
              ref={pathRef}
              id="circle-ring-path"
              fill="none"
              d={buildSpiralPath(DEFAULT_TURNS, DEFAULT_ROUGH)}
            />
          </defs>
          <g ref={ringRef}>
            <text className="fill-hueso font-body text-[12px] uppercase tracking-[0.2em]">
              <textPath
                ref={textPathRef}
                href="#circle-ring-path"
                startOffset="0"
                lengthAdjust="spacingAndGlyphs"
              >
                {circle.ring}
              </textPath>
            </text>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <p className="max-w-[62%] font-display text-xl leading-[1.05] text-ciruela min-[640px]:text-3xl min-[860px]:text-4xl">
            {circle.heading1}
          </p>
          <p className="max-w-[62%] font-display text-xl leading-[1.05] text-ciruela min-[640px]:text-3xl min-[860px]:text-4xl">
            {circle.heading2}
          </p>
        </div>
      </div>

      <p className="absolute bottom-8 right-6 max-w-[200px] text-right font-body text-xs leading-relaxed text-hueso/90 min-[640px]:bottom-10 min-[640px]:right-10 min-[860px]:bottom-14 min-[860px]:right-16 min-[860px]:max-w-[240px]">
        {circle.corner2}
      </p>
    </section>
  );
}
