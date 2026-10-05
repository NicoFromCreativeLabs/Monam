import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { AppUser, Client, Role } from "@/lib/generated/prisma/client";

// The Data Access Layer — the real authorization boundary (Next.js's own
// auth guide: "the majority of security checks should be performed as
// close as possible to your data source"). Proxy (lib/supabase/proxy.ts)
// only does an optimistic "is there a session at all" check; every Server
// Component/Action/Route Handler that touches real data calls into here,
// which cross-references Postgres — AppUser/Client, not the JWT — as the
// authoritative source of role and status (architecture plan principle #7).

// getClaims() verifies the JWT's signature on every call (unlike
// getSession(), which just reads the cookie unverified) — cached per
// request via React's cache() so multiple calls in one render pass don't
// re-verify redundantly.
export const getVerifiedClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return data.claims;
});

export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const claims = await getVerifiedClaims();
  if (!claims?.sub) return null;
  return prisma.appUser.findUnique({ where: { id: claims.sub } });
});

export const getCurrentClient = cache(async (): Promise<Client | null> => {
  const claims = await getVerifiedClaims();
  if (!claims?.sub) return null;
  return prisma.client.findUnique({ where: { authUserId: claims.sub } });
});

// Where a signed-in AppUser lands — used both right after login and to
// redirect someone who's authenticated but hit the wrong panel (e.g. a
// Front Desk login opening /admin directly).
export function homeForRole(role: Role): string {
  return role === "FRONT_DESK" || role === "ESTHETICIAN" ? "/staff" : "/admin";
}

// The one Spanish label per Role, shared by the navbar identity (TopBar via
// CurrentAppUserContext) and anywhere else a role needs to read as a title
// instead of the enum constant.
const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Admin",
  CLINIC_MANAGER: "Gerente de clínica",
  FRONT_DESK: "Recepción",
  ESTHETICIAN: "Esteticista",
};
export function roleLabel(role: Role): string {
  return ROLE_LABEL[role];
}

// Call at the top of a panel layout/page/Server Action. Redirects to
// /login if there's no session, or to the caller's own correct panel if
// they're signed in but hold the wrong role — never silently renders
// nothing (spec §9's permission boundaries are enforced here, not by
// hiding UI on the client).
export async function requireStaffRole(allowed: Role[]): Promise<AppUser> {
  const claims = await getVerifiedClaims();
  if (!claims) redirect("/login");

  const appUser = await getCurrentAppUser();
  if (!appUser) redirect("/login");
  if (appUser.status === "INACTIVE") redirect("/login");
  if (!allowed.includes(appUser.role)) redirect(homeForRole(appUser.role));

  return appUser;
}

export async function requireClient(): Promise<Client> {
  const claims = await getVerifiedClaims();
  if (!claims) redirect("/login");

  const client = await getCurrentClient();
  if (!client) redirect("/login");

  return client;
}

// Lets Owner/Clinic Manager open /my from the navbar's view switcher even
// though they're an AppUser, not a Client — same "preview, no real auth
// change" precedent as StaffRoleContext's RoleToggle. Falls back to the
// earliest real client record so the preview reads live data instead of a
// mock. Any other signed-in user with no Client row still bounces to /login.
export async function requireClientOrPreview(): Promise<{ client: Client; isPreview: boolean }> {
  const claims = await getVerifiedClaims();
  if (!claims) redirect("/login");

  const client = await getCurrentClient();
  if (client) return { client, isPreview: false };

  const appUser = await getCurrentAppUser();
  if (appUser && (appUser.role === "OWNER" || appUser.role === "CLINIC_MANAGER")) {
    const preview = await prisma.client.findFirst({
      where: { anonymizedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (preview) return { client: preview, isPreview: true };
  }

  redirect("/login");
}
