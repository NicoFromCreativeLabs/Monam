"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { homeForRole } from "@/lib/auth/dal";

export type ActionState = { error?: string; message?: string } | undefined;

export async function signIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ingresa tu correo y contraseña." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const appUser = await prisma.appUser.findUnique({ where: { id: data.user.id } });
  if (appUser) redirect(homeForRole(appUser.role));

  const client = await prisma.client.findUnique({ where: { authUserId: data.user.id } });
  if (client) redirect("/my");

  // Authenticated with Supabase but no matching AppUser/Client row — should
  // never happen via our own sign-up/invite flows. Sign out rather than
  // leave the browser holding a session that maps to nothing in our data.
  await supabase.auth.signOut();
  return { error: "Esta cuenta no está vinculada a ningún perfil. Contacta a soporte." };
}

// Deliberately returns the same message whether or not an account exists
// for the given email — Supabase itself never reveals this either, to
// prevent an attacker from using this form to enumerate real client emails.
export async function requestPasswordReset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Ingresa tu correo." };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." };
  }

  return {
    message: "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Used by /auth/update-password — reached only after clicking a Supabase
// invite or password-reset email link, which /auth/confirm has already
// exchanged for a real session (verifyOtp). Requires that active session;
// the page itself redirects to /login if there isn't one.
export async function updatePassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "No se pudo actualizar la contraseña. Intenta de nuevo." };
  }

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const appUser = userId ? await prisma.appUser.findUnique({ where: { id: userId } }) : null;
  redirect(appUser ? homeForRole(appUser.role) : "/my");
}

// Current version of the bundled Términos y Condiciones / Aviso de
// Privacidad doc every new client must accept at signup (spec §5.1/§8.1).
// Bumping this to a new version means anyone who accepted the old one shows
// as needing to re-accept — same pattern /my/consent already displays
// per-version, just not yet wired to a real signup-time acceptance until now.
const SIGNUP_CONSENT_VERSION = "v1.0";

export async function signUpClient(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("acceptTerms") === "on";

  if (!name || !phone || !email || !password) {
    return { error: "Completa todos los campos." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!acceptedTerms) {
    return { error: "Debes aceptar los Términos y Condiciones y el Aviso de Privacidad." };
  }

  const existingPhone = await prisma.client.findUnique({ where: { phone } });
  if (existingPhone) {
    return { error: "Ya existe una cuenta con este número de WhatsApp." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // user_metadata only — app_metadata (used for anything trust-sensitive)
    // can only be set server-side via the admin client, never from signUp().
    options: { data: { name } },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      // Supabase's default built-in email service caps at 2 emails/hour per
      // project — real launch traffic will hit this. Needs a custom SMTP
      // provider configured in the Supabase dashboard before go-live.
      return { error: "Demasiadas cuentas creadas en poco tiempo. Intenta de nuevo en unos minutos." };
    }
    return {
      error: error.message.toLowerCase().includes("already registered")
        ? "Ya existe una cuenta con este correo."
        : "No se pudo crear la cuenta. Intenta de nuevo.",
    };
  }
  if (!data.user) {
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  const client = await prisma.client.create({
    data: { authUserId: data.user.id, name, phone, email },
  });

  // Records the acceptance as a real Consent row (spec §5.1/§8.1) instead of
  // just gating the submit button — /my/consent already displays this as if
  // it were accepted at signup, but nothing ever actually wrote it.
  const consentDoc = await prisma.consentDocumentVersion.upsert({
    where: { type_version: { type: "PRIVACY_NOTICE", version: SIGNUP_CONSENT_VERSION } },
    create: {
      type: "PRIVACY_NOTICE",
      version: SIGNUP_CONSENT_VERSION,
      bodyUrl: "/legal/terminos-y-privacidad",
    },
    update: {},
  });
  await prisma.consent.create({
    data: { clientId: client.id, documentId: consentDoc.id },
  });

  // Hosted Supabase projects require email confirmation by default — signUp()
  // won't return a session yet, so there's nothing to log the client into.
  if (!data.session) {
    return {
      message: "Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
    };
  }

  redirect("/my");
}
