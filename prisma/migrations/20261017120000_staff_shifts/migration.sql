-- Esthetician check-in / check-out: the cabina she works in each day and the
-- clean-station sign-off at the end. Purely additive.

-- CreateTable
CREATE TABLE "staff_shifts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "cleanSignoff" BOOLEAN NOT NULL DEFAULT false,
    "checkOutNote" TEXT,
    "autoClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_shifts_userId_checkInAt_idx" ON "staff_shifts"("userId", "checkInAt");

-- CreateIndex
CREATE INDEX "staff_shifts_roomId_checkOutAt_idx" ON "staff_shifts"("roomId", "checkOutAt");

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One open shift per person and one per cabina, enforced by the database so two
-- check-ins at the same moment cannot both win.
CREATE UNIQUE INDEX "staff_shifts_one_open_per_user" ON "staff_shifts"("userId") WHERE "checkOutAt" IS NULL AND NOT "autoClosed";
CREATE UNIQUE INDEX "staff_shifts_one_open_per_room" ON "staff_shifts"("roomId") WHERE "checkOutAt" IS NULL AND NOT "autoClosed";

-- Default-deny, like every other table (the app reaches it through Prisma).
ALTER TABLE "staff_shifts" ENABLE ROW LEVEL SECURITY;
