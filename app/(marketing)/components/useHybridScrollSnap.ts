"use client";

import { useEffect } from "react";

// Hybrid scroll snap — smooth eased scrolling everywhere inside a section;
// only at the exact top/bottom edge of a section do we take over, and only
// for as long as the user keeps pushing in that direction:
//
//   1. Free scroll: wheel input feeds a target position that the page
//      continuously glides toward (eased, not a raw native jump per wheel
//      notch) — this is what makes it feel smooth instead of clicky.
//   2. Wall: once the edge is reached, further input in that direction stops
//      moving the target and instead pulls the section a few px (rubber
//      band) — no scroll happens while this is going on.
//   3. Breakout: if enough force accumulates within a short rolling window,
//      the pull releases and the page glides to the next/previous section's
//      flush edge via a springy eased scroll animation.
//   4. Idle: if the user stops pushing before breaking through, the pull
//      eases back to zero (bounce-back) and normal free scroll resumes.
//
// Disabled entirely under prefers-reduced-motion — this is a scroll-jacking
// effect, and that preference means "don't".

type Boundary = { top: number; bottom: number; el: HTMLElement };
type Wall = "up" | "down" | null;

const SCROLL_LERP = 0.16; // how fast the page catches up to wheel input — lower = smoother/floatier
const MAX_PULL_PX = 57; // elastic stretch amount
const PULL_SCALE = 128; // lower = pull ramps up faster for the same push
const FORCE_WINDOW_MS = 180; // rolling window used to measure push force
const WHEEL_FORCE_THRESHOLD = 150; // summed |deltaY| within the window to break through
const TOUCH_FORCE_THRESHOLD = 70; // touch deltas are real px, smaller than wheel deltaY
const IDLE_RESET_MS = 160; // no new wheel input within this window => let go
const SNAP_DURATION_MS = 600;
const RELEASE_TRANSITION = "transform 240ms cubic-bezier(0.28, 1.38, 0.5, 1)";
const BOUNCE_TRANSITION = "transform 470ms cubic-bezier(0.51, 0.48, 0.48, 1.3)";

// Overshoots past the target then settles back onto it exactly — a visibly
// springy landing rather than a flat ease-out.
function easeOutBackOvershoot(t: number, overshoot = 0.95) {
  const c3 = overshoot + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + overshoot * p * p;
}

export function useHybridScrollSnap(selector = "[data-snap-section]") {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const boundaries: Boundary[] = [];
    let currentIndex = 0;
    let wall: Wall = null;
    let pull = 0;
    let animating = false; // locked during the breakout snap tween
    let touchY: number | null = null;
    const forceBuffer: { t: number; d: number }[] = [];
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    // `current` is the actual applied scroll position; `target` is where
    // wheel input wants it to be. The drive loop eases current toward
    // target every frame, which is what turns raw wheel notches into a
    // smooth glide instead of native scrolling's discrete per-notch jumps.
    let current = window.scrollY;
    let target = current;
    let driveRaf: number | null = null;

    function maxScrollY() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function driveScroll() {
      current += (target - current) * SCROLL_LERP;
      if (Math.abs(target - current) < 0.4) {
        current = target;
        window.scrollTo({ top: current, left: 0, behavior: "auto" });
        driveRaf = null;
        return;
      }
      window.scrollTo({ top: current, left: 0, behavior: "auto" });
      driveRaf = requestAnimationFrame(driveScroll);
    }
    function ensureDrive() {
      if (driveRaf === null) driveRaf = requestAnimationFrame(driveScroll);
    }

    function measure() {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const scrollY = window.scrollY;
      boundaries.length = 0;
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        const top = rect.top + scrollY;
        boundaries.push({ top, bottom: top + rect.height, el });
      }
    }
    measure();
    window.addEventListener("load", measure);
    const settleTimer = setTimeout(measure, 500);

    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    }
    window.addEventListener("resize", onResize);

    function findIndex(y: number) {
      for (let i = boundaries.length - 1; i >= 0; i--) {
        if (y >= boundaries[i].top - 1) return i;
      }
      return 0;
    }

    // Which section "owns" the viewport right now, biased toward the
    // section covering the viewport's center rather than just its top edge
    // — matters when a section is shorter than the viewport (the top edge
    // alone can sit inside the section before it).
    function currentSectionIndex() {
      const vh = window.innerHeight;
      return wall ? currentIndex : findIndex(target + vh / 2);
    }

    // A section's scrollable range, clamped so it's never inverted — a
    // section shorter than the viewport has zero free-scroll room, not a
    // negative one (which would otherwise happen because section.bottom -
    // vh can land below section.top for a short section).
    function sectionBounds(idx: number, section: Boundary) {
      const vh = window.innerHeight;
      const hasNext = idx < boundaries.length - 1;
      const hasPrev = idx > 0;
      const lowerBound = hasPrev ? section.top : 0;
      const rawUpper = hasNext ? section.bottom - vh : maxScrollY();
      const upperBound = Math.max(lowerBound, rawUpper);
      return { lowerBound, upperBound, hasNext, hasPrev };
    }

    function clearPull(el: HTMLElement, transition: string) {
      el.style.transition = transition;
      el.style.transform = "translateY(0px)";
      pull = 0;
      window.setTimeout(() => {
        el.style.transition = "";
      }, 460);
    }

    function releaseWall(broke: boolean) {
      const idx = currentIndex;
      const el = boundaries[idx]?.el;
      const dir = wall;
      wall = null;
      forceBuffer.length = 0;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (!el) return;

      if (!broke) {
        clearPull(el, BOUNCE_TRANSITION);
        return;
      }

      animating = true;
      clearPull(el, RELEASE_TRANSITION);

      const targetIdx = dir === "down" ? idx + 1 : idx - 1;
      const targetSection = boundaries[targetIdx];
      if (!targetSection) {
        animating = false;
        return;
      }
      const vh = window.innerHeight;
      const targetY = dir === "down" ? targetSection.top : targetSection.bottom - vh;
      const startY = current;
      const deltaY = targetY - startY;
      const startTime = performance.now();

      function tick(now: number) {
        const t = Math.min(1, (now - startTime) / SNAP_DURATION_MS);
        current = startY + deltaY * easeOutBackOvershoot(t);
        target = current;
        window.scrollTo({ top: current, left: 0, behavior: "auto" });
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          currentIndex = targetIdx;
          animating = false;
        }
      }
      requestAnimationFrame(tick);
    }

    function scheduleIdleCheck() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (wall) releaseWall(false);
      }, IDLE_RESET_MS);
    }

    function registerForce(delta: number, threshold: number) {
      const now = performance.now();
      forceBuffer.push({ t: now, d: delta });
      while (forceBuffer.length && now - forceBuffer[0].t > FORCE_WINDOW_MS) forceBuffer.shift();
      let force = 0;
      for (const e of forceBuffer) force += Math.abs(e.d);
      return force >= threshold;
    }

    function applyPull(el: HTMLElement, delta: number, dir: "up" | "down") {
      pull += Math.abs(delta);
      const eased = MAX_PULL_PX * Math.tanh(pull / PULL_SCALE);
      el.style.transition = "";
      el.style.transform = `translateY(${dir === "down" ? -eased : eased}px)`;
    }

    // Wheel: target-based, eased via the drive loop (free scroll), pinned
    // at the boundary while pushing against a wall.
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey) return; // let pinch-zoom-via-wheel through untouched
      if (animating) {
        e.preventDefault();
        return;
      }
      if (!boundaries.length) return;
      e.preventDefault();

      const idx = currentSectionIndex();
      const section = boundaries[idx];
      if (!section) return;

      const movingDown = e.deltaY > 0;
      const movingUp = e.deltaY < 0;
      const { lowerBound, upperBound, hasNext, hasPrev } = sectionBounds(idx, section);
      const atBottomWall = movingDown && hasNext && target >= upperBound - 0.5;
      const atTopWall = movingUp && hasPrev && target <= lowerBound + 0.5;

      if (wall === "down" || (!wall && atBottomWall)) {
        if (!movingDown) {
          releaseWall(false);
          return;
        }
        currentIndex = idx;
        wall = "down";
        target = upperBound;
        applyPull(section.el, e.deltaY, "down");
        scheduleIdleCheck();
        if (registerForce(e.deltaY, WHEEL_FORCE_THRESHOLD)) releaseWall(true);
        ensureDrive();
        return;
      }

      if (wall === "up" || (!wall && atTopWall)) {
        if (!movingUp) {
          releaseWall(false);
          return;
        }
        currentIndex = idx;
        wall = "up";
        target = lowerBound;
        applyPull(section.el, e.deltaY, "up");
        scheduleIdleCheck();
        if (registerForce(e.deltaY, WHEEL_FORCE_THRESHOLD)) releaseWall(true);
        ensureDrive();
        return;
      }

      currentIndex = idx;
      target = Math.min(upperBound, Math.max(lowerBound, target + e.deltaY));
      ensureDrive();
    }

    // Touch: direct 1:1 drag tracking (already smooth on real devices) —
    // same wall/pull logic, just driven by drag distance instead of wheel
    // delta, and applied immediately rather than eased.
    function onTouchStart(e: TouchEvent) {
      touchY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (animating) {
        e.preventDefault();
        return;
      }
      if (touchY === null || !boundaries.length) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const delta = touchY - y; // finger moving up (y decreasing) = scrolling down
      touchY = y;

      const idx = currentSectionIndex();
      const section = boundaries[idx];
      if (!section) return;

      const movingDown = delta > 0;
      const movingUp = delta < 0;
      const { lowerBound, upperBound, hasNext, hasPrev } = sectionBounds(idx, section);
      const atBottomWall = movingDown && hasNext && target >= upperBound - 0.5;
      const atTopWall = movingUp && hasPrev && target <= lowerBound + 0.5;

      if (wall === "down" || (!wall && atBottomWall)) {
        if (!movingDown) {
          releaseWall(false);
          return;
        }
        currentIndex = idx;
        wall = "down";
        applyPull(section.el, delta, "down");
        scheduleIdleCheck();
        if (registerForce(delta, TOUCH_FORCE_THRESHOLD)) releaseWall(true);
        return;
      }

      if (wall === "up" || (!wall && atTopWall)) {
        if (!movingUp) {
          releaseWall(false);
          return;
        }
        currentIndex = idx;
        wall = "up";
        applyPull(section.el, delta, "up");
        scheduleIdleCheck();
        if (registerForce(delta, TOUCH_FORCE_THRESHOLD)) releaseWall(true);
        return;
      }

      currentIndex = idx;
      target = Math.min(upperBound, Math.max(lowerBound, target + delta));
      current = target;
      window.scrollTo({ top: current, left: 0, behavior: "auto" });
    }
    function onTouchEnd() {
      touchY = null;
      if (wall && !animating) releaseWall(false);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("load", measure);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      clearTimeout(settleTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (idleTimer) clearTimeout(idleTimer);
      if (driveRaf !== null) cancelAnimationFrame(driveRaf);
    };
  }, [selector]);
}
