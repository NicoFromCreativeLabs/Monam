import type { Content } from "@/lib/content";
import { Button } from "./Button";

// Full-bleed vertical stripe pattern (Ciruela/Pastel) as a bold
// section-divider moment, per Landing Spec §6's third graphic device —
// previously reserved for social assets, used here as a page interlude.
export function StripeQuote({ content }: { content: Content }) {
  const { stripe } = content;

  return (
    <section
      data-snap-section
      className="flex min-h-screen items-center justify-center px-6 py-20 min-[860px]:py-28"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--monam-ciruela) 0px, var(--monam-ciruela) 44px, var(--monam-pastel) 44px, var(--monam-pastel) 88px)",
      }}
    >
      <div className="w-full max-w-md rounded-[28px] bg-hueso px-10 py-12 text-center shadow-xl">
        <p className="font-display text-sm tracking-[0.3em] text-ciruela/50">MONÂM</p>
        <p className="mt-6 font-accent text-2xl italic leading-snug text-ciruela">
          &ldquo;{stripe.quote}&rdquo;
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="#booking" className="!px-8 !text-xs !uppercase !tracking-[0.2em]">
            {stripe.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
