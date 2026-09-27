import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed middleware.ts -> proxy.ts (same runtime behavior).
// Without this file, Supabase's session cookie is never refreshed on the
// server and users get randomly signed out.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization — running Supabase's
    // session-refresh logic on every CSS/JS/image request wastes a round
    // trip for no benefit.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
