-- P&L manual values and month close. Purely additive: two new empty tables,
-- nothing existing changes behavior.

-- CreateTable
CREATE TABLE "pnl_overrides" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "valueMxn" INTEGER NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pnl_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pnl_month_closes" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByUserId" TEXT,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "pnl_month_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pnl_overrides_locationId_month_field_key" ON "pnl_overrides"("locationId", "month", "field");

-- CreateIndex
CREATE UNIQUE INDEX "pnl_month_closes_locationId_month_key" ON "pnl_month_closes"("locationId", "month");

-- AddForeignKey
ALTER TABLE "pnl_overrides" ADD CONSTRAINT "pnl_overrides_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnl_month_closes" ADD CONSTRAINT "pnl_month_closes_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny, like every other table (see enable_rls_default_deny).
ALTER TABLE "pnl_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pnl_month_closes" ENABLE ROW LEVEL SECURITY;
