import type { Content } from "@/lib/content";
import { BalanceIcon, OrganicoIcon, SerenidadIcon } from "./icons";

const ICONS = {
  organico: OrganicoIcon,
  serenidad: SerenidadIcon,
  balance: BalanceIcon,
};

export function Philosophy({ content }: { content: Content }) {
  const { philosophy } = content;
  return (
    <section
      id="philosophy"
      data-snap-section
      className="flex min-h-screen flex-col justify-center bg-hueso-deep px-8 py-24 min-[860px]:py-[110px]"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-14 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em] text-ciruela/70">
            {philosophy.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl text-ciruela min-[860px]:text-4xl">
            {philosophy.heading}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 min-[860px]:grid-cols-3">
          {philosophy.pillars.map((pillar) => {
            const Icon = ICONS[pillar.icon];
            return (
              <div
                key={pillar.title}
                className="rounded-[22px] bg-hueso px-8 py-10 text-center"
              >
                <Icon className="mx-auto h-20 w-20 text-ciruela" />
                <h3 className="mt-5 font-accent text-xl text-ciruela">{pillar.title}</h3>
                <p className="mt-3 font-body text-sm text-ciruela/70">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
