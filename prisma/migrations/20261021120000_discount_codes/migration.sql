-- Discount codes with QR (Admin → Descuentos) and the redemptions made at checkout.
-- Purely additive.

-- CreateEnum
CREATE TYPE "DiscountCodeKind" AS ENUM ('PERCENT', 'AMOUNT', 'FREE_ADD_ON', 'FREE_PRODUCT');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'SERVICES', 'PRODUCTS');

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DiscountCodeKind" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "scope" "DiscountScope" NOT NULL DEFAULT 'ALL',
    "addOnId" TEXT,
    "productSku" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "onePerClient" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_redemptions" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "clientId" TEXT,
    "amountMxn" INTEGER NOT NULL,
    "redeemedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_redemptions_saleId_key" ON "discount_redemptions"("saleId");

-- CreateIndex
CREATE INDEX "discount_redemptions_codeId_idx" ON "discount_redemptions"("codeId");

-- CreateIndex
CREATE INDEX "discount_redemptions_clientId_idx" ON "discount_redemptions"("clientId");

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny, like every other table (the app reaches it through Prisma).
ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discount_redemptions" ENABLE ROW LEVEL SECURITY;
