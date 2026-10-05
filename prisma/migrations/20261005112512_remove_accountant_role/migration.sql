-- Removes the unused ACCOUNTANT value from the Role enum. Postgres can't
-- drop a single enum value directly, so this recreates the type without it
-- and repoints every column that uses it. Confirmed before writing this
-- migration that no app_users/audit_log/commission_rules row uses
-- ACCOUNTANT (all counts were 0).

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('OWNER', 'CLINIC_MANAGER', 'FRONT_DESK', 'ESTHETICIAN');

ALTER TABLE "app_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "app_users" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");

ALTER TABLE "audit_log" ALTER COLUMN "actorRole" TYPE "Role" USING ("actorRole"::text::"Role");
ALTER TABLE "commission_rules" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");

DROP TYPE "Role_old";
