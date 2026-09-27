import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl tracking-[0.1em] text-ciruela">MONÂM</h1>
        <p className="mt-4 font-body text-sm text-ciruela/70">
          Este enlace ya no es válido o expiró. Solicita uno nuevo o inicia sesión de nuevo.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
