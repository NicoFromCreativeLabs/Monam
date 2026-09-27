-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CLINIC_MANAGER', 'FRONT_DESK', 'ESTHETICIAN', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ProtocolTier" AS ENUM ('TARGETED', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REGISTERED', 'WAITING', 'LATE', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TREATMENT', 'PHOTO_USE', 'PRIVACY_NOTICE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "Ledger" AS ENUM ('RETAIL', 'BACKBAR');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('RECEIVE', 'SALE_DEDUCTION', 'BACKBAR_USAGE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'CREDITED', 'FORFEITED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'SPEI');

-- CreateEnum
CREATE TYPE "SaleLineType" AS ENUM ('SERVICE', 'ADD_ON', 'RETAIL', 'PACKAGE');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CfdiStatus" AS ENUM ('PENDING', 'STAMPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('DISCOUNT', 'REFUND', 'COMP', 'INVENTORY_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('SERVICE', 'ADD_ON', 'PACKAGE', 'RETAIL');

-- CreateEnum
CREATE TYPE "CommissionCalcType" AS ENUM ('FLAT_MXN', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING');

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rentCostMxn" INTEGER NOT NULL DEFAULT 0,
    "maintenanceCostMxn" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "salaryMxn" INTEGER,
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_location_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staff_location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "locationId" TEXT,
    "metadata" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_flags" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "relatedEntity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "anomaly_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocols" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "ProtocolTier" NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceMxn" INTEGER NOT NULL,
    "costMxn" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_ingredients" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "ingredient" TEXT NOT NULL,
    "dosageMl" DOUBLE PRECISION,
    "allergyTag" TEXT,

    CONSTRAINT "protocol_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_ons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "extraMinutes" INTEGER NOT NULL,

    CONSTRAINT "add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_on_protocols" (
    "addOnId" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,

    CONSTRAINT "add_on_protocols_pkey" PRIMARY KEY ("addOnId","protocolId")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "estheticianId" TEXT NOT NULL,
    "deviceId" TEXT,
    "protocolId" TEXT,
    "durationTier" "ProtocolTier" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REGISTERED',
    "depositId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymizedAt" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_skin_ids" (
    "clientId" TEXT NOT NULL,
    "skinType" TEXT,
    "allergies" TEXT[],
    "medications" TEXT[],
    "pregnancyOrBreastfeeding" BOOLEAN NOT NULL DEFAULT false,
    "isotretinoinOrRetinoid" BOOLEAN NOT NULL DEFAULT false,
    "recentProcedures" TEXT,
    "sunExposure" TEXT,
    "visitObjective" TEXT,
    "clinicalNotes" TEXT,

    CONSTRAINT "client_skin_ids_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "client_preferences" (
    "clientId" TEXT NOT NULL,
    "preferredEstheticianId" TEXT,
    "beverage" TEXT,
    "music" TEXT,
    "aromatherapy" TEXT,
    "conversationStyle" TEXT,
    "productsOwned" TEXT[],
    "wishlist" TEXT[],

    CONSTRAINT "client_preferences_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "client_photos" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentId" TEXT,

    CONSTRAINT "client_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_document_versions" (
    "id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "bodyUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_records" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "estheticianId" TEXT NOT NULL,
    "notes" TEXT,
    "recommendedRevisitDays" INTEGER,
    "safetyOverrideReason" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_recommendation_tags" (
    "id" TEXT NOT NULL,
    "treatmentRecordId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "taggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_recommendation_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_incidents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "treatmentRecordId" TEXT,
    "type" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "clinical_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ledger" "Ledger" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_retail_links" (
    "protocolId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "protocol_retail_links_pkey" PRIMARY KEY ("protocolId","productId")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "par" INTEGER NOT NULL DEFAULT 0,
    "priceMxn" INTEGER,
    "costMxn" INTEGER,
    "expiresOn" TIMESTAMP(3),
    "openedOn" TIMESTAMP(3),
    "paoDays" INTEGER,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryTxnType" NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "reason" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "tier" "ProtocolTier" NOT NULL,
    "listPriceMxn" INTEGER NOT NULL,
    "priceMxn" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "package_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_purchases" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "packageOptionId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresOn" TIMESTAMP(3),
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_redemptions" (
    "id" TEXT NOT NULL,
    "packagePurchaseId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountMxn" INTEGER NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditedSaleId" TEXT,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "closedByUserId" TEXT NOT NULL,
    "cashRegisterSessionId" TEXT,
    "subtotalMxn" INTEGER NOT NULL,
    "discountMxn" INTEGER NOT NULL DEFAULT 0,
    "depositCreditMxn" INTEGER NOT NULL DEFAULT 0,
    "tipMxn" INTEGER NOT NULL DEFAULT 0,
    "totalMxn" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "SaleLineType" NOT NULL,
    "productId" TEXT,
    "protocolId" TEXT,
    "addOnId" TEXT,
    "packageOptionId" TEXT,
    "recommendationTagId" TEXT,
    "performedByUserId" TEXT,
    "priceMxn" INTEGER NOT NULL,

    CONSTRAINT "sale_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_sessions" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "openingFloatMxn" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closingCountedMxn" INTEGER,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdi_requests" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "status" "CfdiStatus" NOT NULL DEFAULT 'PENDING',
    "pacReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stampedAt" TIMESTAMP(3),

    CONSTRAINT "cfdi_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "saleId" TEXT,
    "clientId" TEXT,
    "amountMxn" INTEGER,
    "reason" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "basis" "CommissionBasis" NOT NULL,
    "calcType" "CommissionCalcType" NOT NULL,
    "rateOrAmount" DOUBLE PRECISION NOT NULL,
    "role" "Role",
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleLineItemId" TEXT,
    "basis" "CommissionBasis" NOT NULL,
    "baseAmountMxn" INTEGER NOT NULL,
    "ratePct" DOUBLE PRECISION,
    "commissionMxn" INTEGER NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "overriddenFromUserId" TEXT,
    "overrideReason" TEXT,
    "payoutPeriodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleId" TEXT,

    CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payout_periods" (
    "id" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "commission_payout_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "kpi_targets" (
    "id" TEXT NOT NULL,
    "kpi" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetUnit" TEXT NOT NULL,
    "vigenciaYear" INTEGER NOT NULL,

    CONSTRAINT "kpi_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_location_assignments_userId_locationId_key" ON "staff_location_assignments"("userId", "locationId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_idx" ON "audit_log"("actorUserId");

-- CreateIndex
CREATE INDEX "anomaly_flags_status_idx" ON "anomaly_flags"("status");

-- CreateIndex
CREATE UNIQUE INDEX "protocols_name_key" ON "protocols"("name");

-- CreateIndex
CREATE INDEX "protocol_ingredients_protocolId_idx" ON "protocol_ingredients"("protocolId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_depositId_key" ON "appointments"("depositId");

-- CreateIndex
CREATE INDEX "appointments_locationId_startAt_idx" ON "appointments"("locationId", "startAt");

-- CreateIndex
CREATE INDEX "appointments_clientId_idx" ON "appointments"("clientId");

-- CreateIndex
CREATE INDEX "appointments_estheticianId_startAt_idx" ON "appointments"("estheticianId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "clients_authUserId_key" ON "clients"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "client_photos_clientId_idx" ON "client_photos"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_document_versions_type_version_key" ON "consent_document_versions"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "consents_clientId_documentId_key" ON "consents"("clientId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_records_appointmentId_key" ON "treatment_records"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_productId_locationId_key" ON "inventory_items"("productId", "locationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_inventoryItemId_idx" ON "inventory_transactions"("inventoryItemId");

-- CreateIndex
CREATE INDEX "package_purchases_clientId_idx" ON "package_purchases"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "package_redemptions_appointmentId_key" ON "package_redemptions"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_creditedSaleId_key" ON "deposits"("creditedSaleId");

-- CreateIndex
CREATE INDEX "sales_locationId_createdAt_idx" ON "sales"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_clientId_idx" ON "sales"("clientId");

-- CreateIndex
CREATE INDEX "sale_line_items_saleId_idx" ON "sale_line_items"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_requests_saleId_key" ON "cfdi_requests"("saleId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "commission_entries_saleLineItemId_key" ON "commission_entries"("saleLineItemId");

-- CreateIndex
CREATE INDEX "commission_entries_userId_payoutPeriodId_idx" ON "commission_entries"("userId", "payoutPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_targets_kpi_key" ON "kpi_targets"("kpi");

-- AddForeignKey
ALTER TABLE "staff_location_assignments" ADD CONSTRAINT "staff_location_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_location_assignments" ADD CONSTRAINT "staff_location_assignments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_ingredients" ADD CONSTRAINT "protocol_ingredients_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_protocols" ADD CONSTRAINT "add_on_protocols_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "add_ons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_protocols" ADD CONSTRAINT "add_on_protocols_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_estheticianId_fkey" FOREIGN KEY ("estheticianId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_skin_ids" ADD CONSTRAINT "client_skin_ids_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_preferredEstheticianId_fkey" FOREIGN KEY ("preferredEstheticianId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "consent_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_estheticianId_fkey" FOREIGN KEY ("estheticianId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_recommendation_tags" ADD CONSTRAINT "retail_recommendation_tags_treatmentRecordId_fkey" FOREIGN KEY ("treatmentRecordId") REFERENCES "treatment_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_recommendation_tags" ADD CONSTRAINT "retail_recommendation_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_incidents" ADD CONSTRAINT "clinical_incidents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_incidents" ADD CONSTRAINT "clinical_incidents_treatmentRecordId_fkey" FOREIGN KEY ("treatmentRecordId") REFERENCES "treatment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_retail_links" ADD CONSTRAINT "protocol_retail_links_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_retail_links" ADD CONSTRAINT "protocol_retail_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_packageOptionId_fkey" FOREIGN KEY ("packageOptionId") REFERENCES "package_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_packagePurchaseId_fkey" FOREIGN KEY ("packagePurchaseId") REFERENCES "package_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_creditedSaleId_fkey" FOREIGN KEY ("creditedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashRegisterSessionId_fkey" FOREIGN KEY ("cashRegisterSessionId") REFERENCES "cash_register_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "add_ons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_packageOptionId_fkey" FOREIGN KEY ("packageOptionId") REFERENCES "package_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_recommendationTagId_fkey" FOREIGN KEY ("recommendationTagId") REFERENCES "retail_recommendation_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdi_requests" ADD CONSTRAINT "cfdi_requests_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_saleLineItemId_fkey" FOREIGN KEY ("saleLineItemId") REFERENCES "sale_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_payoutPeriodId_fkey" FOREIGN KEY ("payoutPeriodId") REFERENCES "commission_payout_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Booking conflict check as a database constraint, not application logic
-- (spec §13: "the single highest-risk piece of business logic in the
-- system"). Prisma's schema language cannot express Postgres EXCLUDE
-- constraints, so this block is hand-written — see prisma/schema.prisma's
-- comment above the Appointment model for the full rationale. Any future
-- `prisma migrate dev` diff against this table must be checked for whether
-- Prisma proposed dropping these (it doesn't understand them).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "no_room_overlap"
  EXCLUDE USING gist ("roomId" WITH =, tsrange("startAt", "endAt") WITH &&)
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));

ALTER TABLE "appointments" ADD CONSTRAINT "no_esthetician_overlap"
  EXCLUDE USING gist ("estheticianId" WITH =, tsrange("startAt", "endAt") WITH &&)
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));

-- deviceId is nullable; Postgres EXCLUDE constraints skip rows where any
-- constrained column is NULL, so appointments with no device simply aren't
-- checked against each other here.
ALTER TABLE "appointments" ADD CONSTRAINT "no_device_overlap"
  EXCLUDE USING gist ("deviceId" WITH =, tsrange("startAt", "endAt") WITH &&)
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));
