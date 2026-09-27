import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedClaims } from "@/lib/auth/dal";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

// Reached via a Supabase invite/password-reset email link — accessible only
// to an authenticated user, per Supabase's own guidance for this page.
// Supabase's default "Reset Password" template links straight here (no
// /auth/confirm hop) and can arrive either with the session already
// established, or with a `?code=` param still needing exchange — handle
// both rather than assume one dashboard email-template configuration.
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const claims = await getVerifiedClaims();
  if (!claims) redirect("/login");

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl tracking-[0.1em] text-ciruela">MONÂM</h1>
          <p className="mt-1 font-body text-sm text-ciruela/60">Elige tu contraseña</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
