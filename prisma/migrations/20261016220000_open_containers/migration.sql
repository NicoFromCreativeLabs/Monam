-- Backbar containers: ml per container, shared-per-cabina vs individual, and
-- the opened containers with the ml taken from them. Purely additive.

-- CreateEnum
CREATE TYPE "ContainerScope" AS ENUM ('COMMUNAL', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('OPEN', 'FINISHED', 'DISCARDED');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "contentMl" INTEGER,
ADD COLUMN     "scope" "ContainerScope" NOT NULL DEFAULT 'COMMUNAL';

-- CreateTable
CREATE TABLE "open_containers" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "scope" "ContainerScope" NOT NULL,
    "roomId" TEXT,
    "ownerUserId" TEXT,
    "openedByUserId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentMl" INTEGER NOT NULL,
    "remainingMl" INTEGER NOT NULL,
    "expiresOn" TIMESTAMP(3) NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "open_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container_usages" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "userId" TEXT NOT NULL,
    "ml" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "container_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "open_containers_inventoryItemId_status_idx" ON "open_containers"("inventoryItemId", "status");

-- CreateIndex
CREATE INDEX "container_usages_containerId_idx" ON "container_usages"("containerId");

-- CreateIndex
CREATE INDEX "container_usages_userId_createdAt_idx" ON "container_usages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "open_containers" ADD CONSTRAINT "open_containers_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_usages" ADD CONSTRAINT "container_usages_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "open_containers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny, like every other table (see enable_rls_default_deny).
ALTER TABLE "open_containers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "container_usages" ENABLE ROW LEVEL SECURITY;
