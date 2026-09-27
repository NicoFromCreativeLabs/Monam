import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public — no session required. Everything else (/admin, /staff, /my)
// requires a signed-in user; the panel-specific role check happens in each
// panel's layout (lib/auth/dal.ts), not here — this is the coarse,
// optimistic check the Next.js/Supabase docs both call out as the right
// scope for Proxy: read the verified session, redirect if there isn't one,
// never do the real authorization check against Postgres here.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password"];
const PUBLIC_PREFIXES = ["/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake here can make it very hard to debug users getting
  // randomly signed out. getClaims() verifies the token's signature (unlike
  // getSession(), which just reads the cookie unverified) and refreshes it
  // if it's close to expiring — that refresh is what keeps a server-rendered
  // session alive.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: you must return the supabaseResponse object as-is. If you
  // need a different response, copy its cookies onto the new one first, or
  // the browser and server session state fall out of sync.
  return supabaseResponse;
}
