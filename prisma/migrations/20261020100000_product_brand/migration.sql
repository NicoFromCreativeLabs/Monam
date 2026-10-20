-- Brand (marca) of each product, shown in the inventory and its spreadsheets.
-- Purely additive; the known brands are filled in from the product names.

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT;

-- Backfill: only rows with no brand yet, only names that start with a known brand.
UPDATE "products" SET "brand" = 'Anua' WHERE "brand" IS NULL AND "name" ILIKE 'Anua %';
UPDATE "products" SET "brand" = 'Beauty of Joseon' WHERE "brand" IS NULL AND "name" ILIKE 'Beauty of Joseon %';
UPDATE "products" SET "brand" = 'SKIN1004' WHERE "brand" IS NULL AND "name" ILIKE 'SKIN1004 %';
UPDATE "products" SET "brand" = 'Purito' WHERE "brand" IS NULL AND "name" ILIKE 'Purito %';
