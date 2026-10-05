-- Prepares the database for the real WhatsApp booking bot and a real Stripe
-- deposit processor. Both features stay fully backward-compatible until
-- their env vars are set (see lib/feature-flags.ts) — this migration only
-- adds columns/tables/enum values, nothing existing changes behavior.

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "WhatsAppBookingStep" AS ENUM ('GREETING', 'AWAITING_LOCATION', 'AWAITING_TIER', 'AWAITING_PROTOCOL', 'AWAITING_DATE', 'AWAITING_TIME', 'AWAITING_NAME', 'AWAITING_CONFIRM', 'DONE');

-- AlterEnum
ALTER TYPE "DepositStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "deposits_externalRef_idx" ON "deposits"("externalRef");

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "phone" TEXT NOT NULL,
    "step" "WhatsAppBookingStep" NOT NULL DEFAULT 'GREETING',
    "draft" JSONB NOT NULL,
    "clientId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("phone")
);

-- Pre-existing drift unrelated to this feature (confirmed via `prisma
-- migrate dev`'s drift detector, and that neither constraint already
-- existed) — two foreign keys the schema has declared since the Commerce
-- phase but a hand-edited migration along the way never added. Fixed here
-- since this is the next migration touching the database anyway.
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_overriddenFromUserId_fkey" FOREIGN KEY ("overriddenFromUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
