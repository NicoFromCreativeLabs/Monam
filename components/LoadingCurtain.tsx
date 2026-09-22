"use client";

import { useEffect, useState } from "react";

// Brief branded intro shown on every full page load (spec-neutral polish, not
// a route transition) — a plum curtain with the monogram that fades in, holds
// briefly, then wipes out and unmounts for good.
const HOLD_MS = 550;
const TRANSITION_MS = 650;

type Phase = "enter" | "visible" | "exit";

export function LoadingCurtain() {
  const [phase, setPhase] = useState<Phase>("enter");
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const toVisible = requestAnimationFrame(() => setPhase("visible"));
    const toExit = setTimeout(() => setPhase("exit"), TRANSITION_MS + HOLD_MS);
    const unmount = setTimeout(() => setMounted(false), TRANSITION_MS * 2 + HOLD_MS);
    return () => {
      cancelAnimationFrame(toVisible);
      clearTimeout(toExit);
      clearTimeout(unmount);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ciruela transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)] ${
        phase === "exit" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        style={{
          transitionDuration: `${TRANSITION_MS}ms`,
          maskImage: "url(/brand/monam-monogram.svg)",
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: "url(/brand/monam-monogram.svg)",
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
        className={`h-16 w-16 bg-hueso transition-all ease-[cubic-bezier(0.4,0,0.2,1)] min-[640px]:h-24 min-[640px]:w-24 ${
          phase === "enter" ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
      />
    </div>
  );
}
