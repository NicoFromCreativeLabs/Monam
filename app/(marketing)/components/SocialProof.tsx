import type { Content } from "@/lib/content";

const CARD_COLORS = ["bg-hueso-deep", "bg-pastel", "bg-neutro"];

export function SocialProof({ content }: { content: Content }) {
  const { social } = content;
  return (
    <section
      data-snap-section
      className="flex min-h-screen flex-col justify-center px-8 py-24 min-[860px]:py-[110px]"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 flex flex-col items-center gap-2 text-center">
          <h2 className="font-accent text-2xl text-ciruela">{social.handle}</h2>
          <a href="#" className="font-body text-sm text-ciruela/70 underline">
            {social.cta}
          </a>
        </div>
        <div className="grid grid-cols-1 gap-6 min-[860px]:grid-cols-3">
          {social.quotes.map((quote, i) => (
            <div
              key={quote}
              className={`${CARD_COLORS[i % CARD_COLORS.length]} rounded-[22px] px-8 py-10`}
            >
              <p className="font-body text-sm text-ciruela/85">&ldquo;{quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
