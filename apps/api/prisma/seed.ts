import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Minimal seed: one ServiceArea in Ch7's SUPPLY_SEEDING phase with the
 * illustrative 15% commission rate from Ch6 §6.3.4 (marked provisional there,
 * and provisional here too — see docs/decisions/0003-*.md).
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

  // eslint-disable-next-line no-console
  console.log(`Seeded ServiceArea "${serviceArea.name}" (${serviceArea.id})`);
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
