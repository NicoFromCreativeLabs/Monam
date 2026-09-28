import Link from "next/link";

// Placeholder legal text — MONÂM needs to supply the actual, lawyer-reviewed
// Términos y Condiciones and Aviso de Privacidad copy before launch (spec
// §14 open item). This page exists so the signup checkbox links somewhere
// real instead of nowhere; do not treat the body text below as binding.
export default function TermsAndPrivacyPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-display text-lg tracking-[0.12em] text-ciruela">
          MONÂM
        </Link>

        <div className="mt-6 rounded-lg border border-crepe bg-crepe/10 px-4 py-3">
          <p className="font-body text-xs text-ciruela">
            Texto legal pendiente — esta página es un marcador de posición hasta que MONÂM
            proporcione el texto final revisado por un abogado. No representa términos ni un
            aviso de privacidad vinculantes todavía.
          </p>
        </div>

        <h1 className="mt-8 font-display text-2xl text-ciruela">Términos y condiciones</h1>
        <p className="mt-3 font-body text-sm text-ciruela/70">
          Al crear una cuenta y reservar tratamientos en MONÂM Skin Studio, aceptas nuestras
          políticas de reservación, cancelación y uso del servicio. El detalle completo de estos
          términos se publicará aquí antes del lanzamiento.
        </p>

        <h2 className="mt-8 font-display text-xl text-ciruela">Aviso de privacidad</h2>
        <p className="mt-3 font-body text-sm text-ciruela/70">
          MONÂM recopila y trata tus datos personales (nombre, contacto, historial clínico y de
          tratamientos) para operar el servicio, conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares. El aviso de privacidad completo, incluidos
          tus derechos ARCO y cómo ejercerlos, se publicará aquí antes del lanzamiento.
        </p>

        <Link
          href="/signup"
          className="mt-10 inline-block font-body text-xs text-ciruela underline underline-offset-2"
        >
          ← Volver a crear cuenta
        </Link>
      </div>
    </main>
  );
}
