"use client";

import { useState } from "react";
import { getContent, type Lang } from "@/lib/content";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { FeaturedTreatments } from "./FeaturedTreatments";
import { Philosophy } from "./Philosophy";
import { CircleStatement } from "./CircleStatement";
import { Treatments } from "./Treatments";
import { BookingCta } from "./BookingCta";
import { SocialProof } from "./SocialProof";
import { StripeQuote } from "./StripeQuote";
import { LocationHours } from "./LocationHours";
import { Footer } from "./Footer";
import { Reveal } from "@/components/Reveal";
import { useHybridScrollSnap } from "./useHybridScrollSnap";

export function LandingPage() {
  const [lang, setLang] = useState<Lang>("es");
  const content = getContent(lang);
  useHybridScrollSnap();

  return (
    <>
      <Nav content={content} lang={lang} onLangChange={setLang} />
      <main className="flex-1">
        <Hero content={content} />
        <Reveal>
          <FeaturedTreatments content={content} />
        </Reveal>
        <Reveal>
          <Philosophy content={content} />
        </Reveal>
        <Reveal>
          <CircleStatement content={content} />
        </Reveal>
        <Reveal>
          <Treatments content={content} />
        </Reveal>
        <Reveal>
          <BookingCta content={content} />
        </Reveal>
        <Reveal>
          <SocialProof content={content} />
        </Reveal>
        <Reveal>
          <StripeQuote content={content} />
        </Reveal>
        <Reveal>
          <LocationHours content={content} />
        </Reveal>
      </main>
      <Footer content={content} />
    </>
  );
}
