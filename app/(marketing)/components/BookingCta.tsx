import type { Content } from "@/lib/content";
import { Button } from "./Button";
import { whatsappBookingLink } from "@/lib/whatsapp";

export function BookingCta({ content }: { content: Content }) {
  const { booking } = content;
  const card = booking.skinIdCard;

  return (
    <section
      id="booking"
      data-snap-section
      className="flex min-h-screen flex-col justify-center bg-crepe px-8 py-24 text-ciruela min-[860px]:py-[110px]"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 min-[860px]:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl text-ciruela min-[860px]:text-4xl">
            {booking.heading}
          </h2>
          <p className="mt-4 max-w-md font-body text-sm text-ciruela/80">
            {booking.body}
          </p>
          <div className="mt-8 flex flex-col gap-4 min-[860px]:flex-row">
            <Button href={whatsappBookingLink("Hola, me gustaría reservar una cita en MONÂM.")}>
              {booking.ctaWhatsapp}
            </Button>
            <Button href="/login" variant="outline">
              {booking.ctaOnline}
            </Button>
          </div>
        </div>

        <div className="rounded-[24px] bg-hueso px-8 py-8 shadow-none">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-ciruela/60">
            {card.label}
          </p>
          <dl className="mt-4 space-y-3 font-body text-sm text-ciruela">
            <div className="flex justify-between border-b border-ciruela/10 pb-2">
              <dt className="text-ciruela/60">Skin type</dt>
              <dd>{card.skinType}</dd>
            </div>
            <div className="flex justify-between border-b border-ciruela/10 pb-2">
              <dt className="text-ciruela/60">Allergies</dt>
              <dd>{card.allergies}</dd>
            </div>
            <div className="flex justify-between border-b border-ciruela/10 pb-2">
              <dt className="text-ciruela/60">Preferences</dt>
              <dd>{card.preferences}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ciruela/60">Last treatment</dt>
              <dd>{card.lastTreatment}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
