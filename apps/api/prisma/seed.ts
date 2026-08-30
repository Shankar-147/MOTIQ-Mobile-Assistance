import { MaintenanceServiceType, PrismaClient, VehicleType } from "@prisma/client";
import { hashPassword } from "../src/modules/identity/auth/password.util";

const prisma = new PrismaClient();

/**
 * Rule-of-thumb preventive-maintenance intervals per (vehicleType,
 * serviceType) — illustrative v1 defaults (Ch71's Vehicle Health screen),
 * not hand-tuned automotive engineering. A config table, never a code
 * constant (CLAUDE.md) — same precedent as CommissionRate/FareConfig.
 * `null` means that interval dimension doesn't apply (e.g. no km-based
 * check for a battery check).
 */
const MAINTENANCE_INTERVAL_SEEDS: {
  vehicleType: VehicleType;
  serviceType: MaintenanceServiceType;
  intervalKm: number | null;
  intervalMonths: number | null;
}[] = [
  { vehicleType: "CAR", serviceType: "OIL_CHANGE", intervalKm: 8000, intervalMonths: 6 },
  { vehicleType: "CAR", serviceType: "TIRE_ROTATION", intervalKm: 10000, intervalMonths: null },
  { vehicleType: "CAR", serviceType: "BRAKE_SERVICE", intervalKm: 20000, intervalMonths: 12 },
  { vehicleType: "CAR", serviceType: "BATTERY_CHECK", intervalKm: null, intervalMonths: 12 },
  { vehicleType: "CAR", serviceType: "GENERAL_SERVICE", intervalKm: 10000, intervalMonths: 12 },

  { vehicleType: "TWO_WHEELER", serviceType: "OIL_CHANGE", intervalKm: 3000, intervalMonths: 3 },
  { vehicleType: "TWO_WHEELER", serviceType: "TIRE_ROTATION", intervalKm: 6000, intervalMonths: null },
  { vehicleType: "TWO_WHEELER", serviceType: "BRAKE_SERVICE", intervalKm: 10000, intervalMonths: 8 },
  { vehicleType: "TWO_WHEELER", serviceType: "BATTERY_CHECK", intervalKm: null, intervalMonths: 8 },
  { vehicleType: "TWO_WHEELER", serviceType: "GENERAL_SERVICE", intervalKm: 5000, intervalMonths: 6 },

  { vehicleType: "COMMERCIAL", serviceType: "OIL_CHANGE", intervalKm: 5000, intervalMonths: 4 },
  { vehicleType: "COMMERCIAL", serviceType: "TIRE_ROTATION", intervalKm: 8000, intervalMonths: null },
  { vehicleType: "COMMERCIAL", serviceType: "BRAKE_SERVICE", intervalKm: 15000, intervalMonths: 9 },
  { vehicleType: "COMMERCIAL", serviceType: "BATTERY_CHECK", intervalKm: null, intervalMonths: 9 },
  { vehicleType: "COMMERCIAL", serviceType: "GENERAL_SERVICE", intervalKm: 8000, intervalMonths: 9 },

  { vehicleType: "CAR", serviceType: "ENGINE_CHECK", intervalKm: 10000, intervalMonths: 12 },
  { vehicleType: "CAR", serviceType: "COOLANT_CHECK", intervalKm: null, intervalMonths: 12 },
  { vehicleType: "CAR", serviceType: "AIR_FILTER", intervalKm: 15000, intervalMonths: 12 },
  { vehicleType: "CAR", serviceType: "LIGHTS_CHECK", intervalKm: null, intervalMonths: 6 },
  { vehicleType: "CAR", serviceType: "OVERALL_HEALTH_CHECK", intervalKm: null, intervalMonths: 12 },

  { vehicleType: "TWO_WHEELER", serviceType: "ENGINE_CHECK", intervalKm: 6000, intervalMonths: 8 },
  { vehicleType: "TWO_WHEELER", serviceType: "COOLANT_CHECK", intervalKm: null, intervalMonths: 8 },
  { vehicleType: "TWO_WHEELER", serviceType: "AIR_FILTER", intervalKm: 8000, intervalMonths: 8 },
  { vehicleType: "TWO_WHEELER", serviceType: "LIGHTS_CHECK", intervalKm: null, intervalMonths: 6 },
  { vehicleType: "TWO_WHEELER", serviceType: "OVERALL_HEALTH_CHECK", intervalKm: null, intervalMonths: 12 },

  { vehicleType: "COMMERCIAL", serviceType: "ENGINE_CHECK", intervalKm: 8000, intervalMonths: 6 },
  { vehicleType: "COMMERCIAL", serviceType: "COOLANT_CHECK", intervalKm: null, intervalMonths: 6 },
  { vehicleType: "COMMERCIAL", serviceType: "AIR_FILTER", intervalKm: 10000, intervalMonths: 6 },
  { vehicleType: "COMMERCIAL", serviceType: "LIGHTS_CHECK", intervalKm: null, intervalMonths: 4 },
  { vehicleType: "COMMERCIAL", serviceType: "OVERALL_HEALTH_CHECK", intervalKm: null, intervalMonths: 9 },
];

/**
 * Minimal seed: one ServiceArea in Ch7's SUPPLY_SEEDING phase with the
 * illustrative 15% commission rate from Ch6 §6.3.4 (marked provisional there,
 * and provisional here too — see docs/decisions/0003-*.md), plus one Admin
 * account — Admin/Support accounts are provisioned out of band (Ch33), never
 * via public self-registration, so seeding is the dev-environment stand-in
 * for that provisioning process.
 */
async function main() {
  const serviceArea = await prisma.serviceArea.upsert({
    where: { name: "Bengaluru (Pilot)" },
    update: {},
    create: {
      name: "Bengaluru (Pilot)",
      launchPhase: "SUPPLY_SEEDING",
    },
  });

  await prisma.commissionRate.upsert({
    where: { id: `${serviceArea.id}-seed-rate` },
    update: {},
    create: {
      id: `${serviceArea.id}-seed-rate`,
      serviceAreaId: serviceArea.id,
      ratePercentage: process.env.DEFAULT_COMMISSION_RATE_PERCENT ?? "15",
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    },
  });

  await prisma.fareConfig.upsert({
    where: { id: `${serviceArea.id}-seed-fare` },
    update: {},
    create: {
      id: `${serviceArea.id}-seed-fare`,
      serviceAreaId: serviceArea.id,
      baseFare: process.env.DEFAULT_BASE_FARE ?? "50.00",
      perKmRate: process.env.DEFAULT_PER_KM_RATE ?? "10.00",
      maxSurgeMultiplier: "1.00",
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
    },
  });

  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "ADMIN_SEED_PASSWORD is not set — see .env.example. Refusing to seed an admin " +
        "account with a guessable default password.",
    );
  }
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@motiq.dev" },
    update: {},
    create: {
      phone: "+910000000000",
      email: "admin@motiq.dev",
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      adminProfile: { create: { department: "Founding Ops" } },
    },
  });

  for (const rule of MAINTENANCE_INTERVAL_SEEDS) {
    await prisma.maintenanceIntervalRule.upsert({
      where: { vehicleType_serviceType: { vehicleType: rule.vehicleType, serviceType: rule.serviceType } },
      update: {},
      create: rule,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ServiceArea "${serviceArea.name}" (${serviceArea.id})`);
  // eslint-disable-next-line no-console
  console.log(`Seeded ${MAINTENANCE_INTERVAL_SEEDS.length} MaintenanceIntervalRule rows`);
  // eslint-disable-next-line no-console
  console.log(`Seeded Admin user "${adminUser.email}" (log in via POST /api/v1/auth/admin/login)`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
