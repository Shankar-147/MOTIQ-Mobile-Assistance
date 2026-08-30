-- CreateEnum
CREATE TYPE "MaintenanceServiceType" AS ENUM ('OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'BATTERY_CHECK', 'GENERAL_SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "vehicle_maintenance_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "servicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_interval_rules" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "serviceType" "MaintenanceServiceType" NOT NULL,
    "intervalKm" INTEGER,
    "intervalMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_interval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_maintenance_records_vehicleId_servicedAt_idx" ON "vehicle_maintenance_records"("vehicleId", "servicedAt");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_interval_rules_vehicleType_serviceType_key" ON "maintenance_interval_rules"("vehicleType", "serviceType");

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_records" ADD CONSTRAINT "vehicle_maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

