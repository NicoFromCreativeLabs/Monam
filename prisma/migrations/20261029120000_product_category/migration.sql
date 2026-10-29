-- Category (categoría) of each product, shown in the inventory and filterable
-- there. Purely additive, same pattern as 20261020100000_product_brand —
-- nothing is backfilled, it starts empty and is filled in per product.

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" TEXT;
