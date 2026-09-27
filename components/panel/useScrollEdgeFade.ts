"use client";

import { useEffect, useRef, useState } from "react";

// A horizontally-scrolling strip with zero visual hint reads as "that's all
// there is" — a real first-time-user pass found exactly this on the client
// nav tabs and the booking day-picker (content cut off at the screen edge,
// no arrow, no partial next item peeking). Tracks whether there's more
// content past each edge so the caller can render a fade there.
export function useScrollEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowLeft(el.scrollLeft > 4);
      setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, showLeft, showRight };
}
