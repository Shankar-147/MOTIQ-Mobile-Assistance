-- CreateEnum
CREATE TYPE "MaintenanceDueStatus" AS ENUM ('NOT_TRACKED', 'OK', 'DUE_SOON', 'OVERDUE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceServiceType" ADD VALUE 'ENGINE_CHECK';
ALTER TYPE "MaintenanceServiceType" ADD VALUE 'COOLANT_CHECK';
ALTER TYPE "MaintenanceServiceType" ADD VALUE 'AIR_FILTER';
ALTER TYPE "MaintenanceServiceType" ADD VALUE 'LIGHTS_CHECK';
ALTER TYPE "MaintenanceServiceType" ADD VALUE 'OVERALL_HEALTH_CHECK';

-- CreateTable
CREATE TABLE "vehicle_reminder_preferences" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_reminder_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_reminder_settings" (
    "customerProfileId" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_reminder_settings_pkey" PRIMARY KEY ("customerProfileId")
);

-- CreateTable
CREATE TABLE "vehicle_maintenance_reminder_logs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "status" "MaintenanceDueStatus" NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenance_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_reminder_preferences_customerProfileId_serviceType_key" ON "vehicle_reminder_preferences"("customerProfileId", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_maintenance_reminder_logs_vehicleId_serviceType_key" ON "vehicle_maintenance_reminder_logs"("vehicleId", "serviceType");

-- AddForeignKey
ALTER TABLE "vehicle_reminder_preferences" ADD CONSTRAINT "vehicle_reminder_preferences_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_reminder_settings" ADD CONSTRAINT "vehicle_reminder_settings_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_reminder_logs" ADD CONSTRAINT "vehicle_maintenance_reminder_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

