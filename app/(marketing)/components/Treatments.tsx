import type { Content } from "@/lib/content";
import { Button } from "./Button";

export function Treatments({ content }: { content: Content }) {
  const { treatments } = content;
  return (
    <section
      id="treatments"
      data-snap-section
      className="relative flex min-h-screen flex-col justify-center px-8 py-24 min-[860px]:py-[110px]"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em] text-ciruela/70">
            {treatments.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl text-ciruela min-[860px]:text-4xl">
            {treatments.heading}
          </h2>
          <p className="font-accent mt-3 text-lg italic text-ciruela/70">
            {treatments.tagline}
          </p>
          <p className="mx-auto mt-3 max-w-md font-body text-xs text-ciruela/50">
            {treatments.note}
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-x-12 gap-y-2 min-[860px]:grid-cols-2">
          {treatments.items.map((item) => (
            <div
              key={item.name}
              className="flex items-baseline justify-between gap-4 border-b border-ciruela/10 py-4"
            >
              <div>
                <dt className="font-accent text-lg text-ciruela">
                  {item.name}
                  <span className="ml-2 font-body text-[11px] uppercase tracking-wide text-ciruela/50">
                    {item.tier} · {item.duration}
                  </span>
                </dt>
                <dd className="mt-1 max-w-sm font-body text-xs text-ciruela/50">
                  {item.description}
                </dd>
              </div>
              <span className="whitespace-nowrap font-body text-sm text-ciruela">
                ${item.price} {treatments.currency}
              </span>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex justify-center">
          <Button href="#booking">{treatments.cta}</Button>
        </div>
      </div>
    </section>
  );
}
