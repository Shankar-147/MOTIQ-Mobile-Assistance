import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/modules/identity/auth/password.util";

const prisma = new PrismaClient();

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

  // eslint-disable-next-line no-console
  console.log(`Seeded ServiceArea "${serviceArea.name}" (${serviceArea.id})`);
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
