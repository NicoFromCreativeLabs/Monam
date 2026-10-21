-- Account-bound discounts: given at signup or claimed in the client's account,
-- used once per account. Purely additive; existing codes stay CHECKOUT codes.

-- CreateEnum
CREATE TYPE "DiscountMode" AS ENUM ('CHECKOUT', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "AccountGrant" AS ENUM ('SIGNUP', 'CLAIM');

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "accountGrant" "AccountGrant",
ADD COLUMN     "claimUntil" TIMESTAMP(3),
ADD COLUMN     "mode" "DiscountMode" NOT NULL DEFAULT 'CHECKOUT';

-- CreateTable
CREATE TABLE "client_discounts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "saleId" TEXT,

    CONSTRAINT "client_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_discounts_saleId_key" ON "client_discounts"("saleId");

-- CreateIndex
CREATE INDEX "client_discounts_codeId_idx" ON "client_discounts"("codeId");

-- CreateIndex
CREATE UNIQUE INDEX "client_discounts_clientId_codeId_key" ON "client_discounts"("clientId", "codeId");

-- AddForeignKey
ALTER TABLE "client_discounts" ADD CONSTRAINT "client_discounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_discounts" ADD CONSTRAINT "client_discounts_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny, like every other table (the app reaches it through Prisma).
ALTER TABLE "client_discounts" ENABLE ROW LEVEL SECURITY;
