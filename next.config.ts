import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The user's home directory holds an unrelated top-level git repo/lockfile;
  // pin Turbopack's workspace root to this project so it doesn't try to trace
  // up into it.
  turbopack: {
    root: path.join(__dirname),
  },
  // Drop the "X-Powered-By: Next.js" response header — free framework
  // fingerprinting removed for attackers, no functional cost.
  poweredByHeader: false,
  // Baseline security headers, flagged by the pentest pass as missing.
  // frame-ancestors 'none' matters most here — /admin and /staff hold real
  // revenue and client data, so clickjacking protection before launch isn't
  // optional. CSP is intentionally permissive on script/style/img/font
  // sources (self + the Google Fonts this app already loads) rather than
  // locked down further — tightening it more needs verifying against every
  // page's actual asset origins first, which is follow-up work, not this fix.
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    const csp = (stripe: boolean) => ({
      key: "Content-Security-Policy",
      value:
        "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; " +
        `script-src 'self' 'unsafe-inline' 'unsafe-eval'${stripe ? " https://js.stripe.com" : ""}; ` +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        `img-src 'self' data: blob:${stripe ? " https://*.stripe.com" : ""}; ` +
        `connect-src 'self' https://*.supabase.co wss://*.supabase.co${stripe ? " https://api.stripe.com https://m.stripe.network" : ""}` +
        (stripe ? "; frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network" : ""),
    });
    return [
      // The public counter-payment page (/pagar) embeds Stripe's Payment
      // Element (script + iframes + API calls straight to Stripe). Stripe is
      // allowed there only — /admin, /staff and /my keep the stricter policy.
      { source: "/pagar/:path*", headers: [...baseHeaders, csp(true)] },
      { source: "/((?!pagar).*)", headers: [...baseHeaders, csp(false)] },
    ];
  },
};

export default nextConfig;
