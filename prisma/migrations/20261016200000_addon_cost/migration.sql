-- Product cost per add-on use, for the P&L's "Insumos de add-ons" line.
-- Purely additive: existing add-ons default to 0.

-- AlterTable
ALTER TABLE "add_ons" ADD COLUMN     "costMxn" INTEGER NOT NULL DEFAULT 0;
