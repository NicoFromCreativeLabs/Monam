import type { Content } from "@/lib/content";
import { Button } from "./Button";

export function LocationHours({ content }: { content: Content }) {
  const { location } = content;
  return (
    <section
      id="visit"
      data-snap-section
      className="flex min-h-screen flex-col justify-center bg-ciruela px-8 py-24 text-center text-hueso min-[860px]:py-[110px]"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-hueso/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/monam-monogram.svg" alt="" aria-hidden="true" className="h-8 w-8 invert" />
        </div>

        <h2 className="mt-6 font-display text-3xl text-hueso min-[860px]:text-4xl">
          {location.heading}
        </h2>
        <p className="mt-2 font-body text-sm text-hueso/80">{location.hours}</p>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 min-[860px]:grid-cols-2">
          {location.locations.map((loc) => (
            <div key={loc.name} className="rounded-[20px] border border-hueso/25 px-6 py-6">
              <p className="font-accent text-lg text-hueso">{loc.name}</p>
              <p className="mt-2 font-body text-xs text-hueso/70">{loc.address}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-center gap-4 min-[860px]:flex-row">
          <Button href="#" variant="outline" inverted>
            {location.ctaDirections}
          </Button>
          <Button href="#booking" inverted>
            {location.ctaVisit}
          </Button>
        </div>
      </div>
    </section>
  );
}
