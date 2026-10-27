import { PrismaClient } from "@prisma/client";

/**
 * Demo accounts for a freshly seeded hosted database (apps/api/prisma/seed.ts must have run
 * first, for the service area, fare and commission). Creates one customer with a car and one
 * PROVISIONAL provider so a live demo can run immediately. Idempotent: safe to re-run.
 *
 * The phone numbers come from the same DEMO_CUSTOMER_PHONE / DEMO_PROVIDER_PHONE variables the
 * API's demo sign-in uses, so no personal number is hard-coded in the repository.
 */
const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example.`);
  }
  return value;
}

async function main() {
  const serviceArea = await prisma.serviceArea.findFirst({ orderBy: { createdAt: "asc" } });
  if (!serviceArea) {
    throw new Error("No service area found — run the main seed (prisma:seed) first.");
  }

  const customerPhone = requireEnv("DEMO_CUSTOMER_PHONE");
  const providerPhone = requireEnv("DEMO_PROVIDER_PHONE");

  const customerUser = await prisma.user.upsert({
    where: { phone: customerPhone },
    update: { isActive: true },
    create: {
      phone: customerPhone,
      role: "CUSTOMER",
      customerProfile: {
        create: { displayName: process.env.DEMO_CUSTOMER_NAME ?? "Demo Customer", defaultServiceAreaId: serviceArea.id },
      },
    },
    include: { customerProfile: true },
  });
  if (customerUser.customerProfile) {
    const hasVehicle = await prisma.vehicle.count({ where: { customerProfileId: customerUser.customerProfile.id } });
    if (hasVehicle === 0) {
      await prisma.vehicle.create({
        data: {
          customerProfileId: customerUser.customerProfile.id,
          vehicleType: "CAR",
          make: "Datsun",
          model: "Go Plus",
          year: 2016,
          plateNumber: "TN01BA7221",
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { phone: providerPhone },
    update: { isActive: true },
    create: {
      phone: providerPhone,
      role: "PROVIDER",
      providerProfile: {
        create: {
          businessName: process.env.DEMO_PROVIDER_NAME ?? "Demo Roadside Services",
          serviceAreaId: serviceArea.id,
          verificationStatus: "PROVISIONAL",
          lastVerifiedAt: new Date(),
        },
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Demo accounts ready in service area "${serviceArea.name}".`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
