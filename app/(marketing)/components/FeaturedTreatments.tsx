import type { Content } from "@/lib/content";
import { FeaturedIcon } from "./icons";

// Three-column, alternating-color showcase of signature protocols —
// redesigned per reference: full-bleed panels (Hueso / Ciruela / Pastel),
// a single line-art mark centered, treatment name pinned bottom-left. This
// sits above the full price list (§9.1) as a visual highlight, not a
// replacement for it.
const PANEL_STYLE = [
  { bg: "bg-hueso-deep", ink: "text-ciruela", sub: "text-ciruela/50" },
  { bg: "bg-ciruela", ink: "text-hueso", sub: "text-hueso/60" },
  { bg: "bg-pastel", ink: "text-ciruela", sub: "text-ciruela/50" },
];

export function FeaturedTreatments({ content }: { content: Content }) {
  const { featured, treatments } = content;

  return (
    <section
      data-snap-section
      className="flex min-h-screen flex-col justify-center px-6 py-20 min-[860px]:px-10 min-[860px]:py-28"
    >
      <div className="mx-auto flex max-w-[1300px] flex-col gap-10 min-[860px]:flex-row min-[860px]:items-end min-[860px]:justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.22em] text-ciruela/60">
            {featured.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-4xl text-ciruela min-[860px]:text-5xl">
            {featured.heading}
          </h2>
        </div>
        <p className="max-w-sm font-body text-sm text-ciruela/60 min-[860px]:text-right">
          {featured.description}
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-[1300px] grid-cols-1 overflow-hidden rounded-[28px] min-[860px]:grid-cols-3">
        {featured.items.map((item, i) => {
          const style = PANEL_STYLE[i % PANEL_STYLE.length];
          const protocol = treatments.items.find((t) => t.name === item.protocol);
          return (
            <a
              key={item.protocol}
              href="#treatments"
              className={`group relative flex aspect-[4/5] flex-col justify-between p-8 transition-opacity hover:opacity-90 min-[860px]:aspect-auto min-[860px]:min-h-[420px] ${style.bg}`}
            >
              <span className={`font-body text-xs uppercase tracking-[0.2em] ${style.sub}`}>
                {protocol ? `${protocol.tier} · ${protocol.duration}` : ""}
              </span>

              <FeaturedIcon
                icon={item.icon}
                className={`absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-110 min-[860px]:h-44 min-[860px]:w-44 ${style.ink}`}
              />

              <div>
                <p className={`font-accent text-xl ${style.ink}`}>{item.label}</p>
                {protocol && (
                  <p className={`mt-1 font-body text-sm ${style.sub}`}>
                    ${protocol.price} {treatments.currency}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
