// vitest alias target for "server-only" (see vitest.config.ts) — that
// package only exists as a bundler-resolved sentinel inside Next.js
// (webpack/Turbopack error if a client component imports it), so it isn't
// resolvable under plain Node/vitest. Stubbed to a no-op here so modules
// that import it (a correct guard in the real app) can still be unit tested.
export {};
