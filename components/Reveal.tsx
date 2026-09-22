"use client";

import { useEffect, useRef, useState } from "react";

// Fades a section up into place the first time it enters the viewport while
// scrolling — a subtle, one-shot reveal (not sticky/pinned), so it never
// hides content, just eases it in.
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    // Wait a frame before observing — starting on the same frame as mount
    // can catch layout mid-reflow (fonts/images still settling) and report
    // a false "intersecting" for elements nowhere near the viewport yet.
    const raf = requestAnimationFrame(() => observer.observe(el));
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      {children}
    </div>
  );
}
