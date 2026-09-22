"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { Button } from "./Button";

const MASK_GRADIENT =
  "radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, #000 64%, transparent 100%)";
const MOBILE_REVEAL_DELAY_MS = 1500;

export function Hero({ content }: { content: Content }) {
  const { hero } = content;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Hover doesn't exist on touch — reveal it on its own after a beat
    // instead of leaving it permanently hidden on mobile.
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const timer = setTimeout(() => setRevealed(true), MOBILE_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Full-bleed dark opener — wordmark-led, per the redesign reference. */}
      <section
        id="top"
        data-snap-section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ciruela px-6"
      >
        {/* Hidden until the wordmark is hovered, then a feathered elliptical
            mask grows from the center to reveal it, fast at first and
            settling to a stop (ease-out-expo), and stays open once opened. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/monam-swirl.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[85vmin] w-[85vmin] -translate-x-1/2 -translate-y-1/2 object-cover opacity-[0.16]"
          style={{
            maskImage: MASK_GRADIENT,
            WebkitMaskImage: MASK_GRADIENT,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: revealed ? "130% 130%" : "0% 0%",
            WebkitMaskSize: revealed ? "130% 130%" : "0% 0%",
            transition:
              "mask-size 3s cubic-bezier(0.15,0.65,0.25,1), -webkit-mask-size 3s cubic-bezier(0.15,0.65,0.25,1)",
          }}
        />

        <div
          className="relative flex flex-col items-center text-center"
          onMouseEnter={() => setRevealed(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/monam-wordmark.svg"
            alt="MONÂM"
            className="w-[70vw] max-w-[620px] min-[700px]:max-w-[720px]"
          />
          <p className="mt-5 font-body text-xs uppercase tracking-[0.4em] text-hueso/70">
            {hero.subtitle}
          </p>
        </div>

        {/* Decorative rotated tagline, bottom-right — echoes the reference's
            small vertical marginalia without pretending to be a real counter. */}
        <p className="pointer-events-none absolute bottom-10 right-6 hidden origin-bottom-right rotate-90 whitespace-nowrap font-body text-[10px] uppercase tracking-[0.3em] text-hueso/40 min-[860px]:block">
          {hero.subtitle} · CDMX
        </p>

        <a
          href="#intro"
          aria-label="Desplázate para continuar"
          className="absolute bottom-8 left-1/2 flex h-10 w-6 -translate-x-1/2 items-start justify-center rounded-full border border-hueso/30 p-1.5"
        >
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-hueso/70" />
        </a>
      </section>

      {/* Warm intro strip — the brand copy that used to open the page now
          follows the bold wordmark opener, easing into the rest of the site. */}
      <section
        id="intro"
        data-snap-section
        className="flex min-h-screen flex-col justify-center px-8 py-24 min-[860px]:py-[110px]"
      >
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em] text-ciruela/70">
            {hero.eyebrow}
          </p>
          <h2 className="max-w-2xl font-display text-4xl leading-tight text-ciruela min-[860px]:text-6xl">
            {hero.headline}
          </h2>
          <p className="font-script text-3xl text-ciruela/80">{hero.script}</p>
          <p className="max-w-xl font-body text-base text-ciruela/70">{hero.body}</p>
          <div className="mt-4 flex flex-col gap-4 min-[860px]:flex-row">
            <Button href="#booking">{hero.ctaPrimary}</Button>
            <Button href="#treatments" variant="outline">
              {hero.ctaSecondary}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
