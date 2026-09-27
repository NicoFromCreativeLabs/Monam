import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Runtime connection — the pooled Supavisor URL (port 6543), separate from
// DIRECT_URL, which only prisma.config.ts (migrations) uses. Driver adapters
// are mandatory in Prisma 7; there is no engine-binary fallback.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Next.js dev-mode hot reload re-evaluates this module on every edit; without
// caching on `globalThis` each reload would open a fresh pool of connections
// against Supavisor until it's exhausted.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
