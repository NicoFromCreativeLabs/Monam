-- Claimable account discounts can be private: not listed in every account, only
-- claimed with their QR or code. Existing codes become private. Purely additive.

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "listed" BOOLEAN NOT NULL DEFAULT false;
