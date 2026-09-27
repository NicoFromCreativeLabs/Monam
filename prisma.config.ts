import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// This project follows Next.js's own convention (.env.local for real,
// gitignored values), not plain dotenv's default of a bare ".env" — load
// that file explicitly rather than relying on the package's default.
config({ path: ".env.local" });

// Prisma 7: the CLI (migrate/introspect/studio) reads its connection from
// here, not from schema.prisma. This must be the DIRECT (non-pooled, port
// 5432) Supabase connection — migrations run DDL, and Supavisor's pooled
// connection (port 6543, used by the app at runtime via lib/prisma.ts)
// can't reliably run CREATE EXTENSION/ALTER TABLE.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
