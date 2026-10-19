-- Front desk check-in / check-out: the same shift table now also holds the
-- vendedor's day (sede + cash register), with no cabina. Purely additive.

-- CreateEnum
CREATE TYPE "ShiftKind" AS ENUM ('ESTHETICIAN', 'FRONT_DESK');

-- AlterTable
ALTER TABLE "staff_shifts" ALTER COLUMN "roomId" DROP NOT NULL,
ADD COLUMN     "cashCountedMxn" INTEGER,
ADD COLUMN     "cashExpectedMxn" INTEGER,
ADD COLUMN     "cashSessionId" TEXT,
ADD COLUMN     "kind" "ShiftKind" NOT NULL DEFAULT 'ESTHETICIAN';

-- AddForeignKey
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_register_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
