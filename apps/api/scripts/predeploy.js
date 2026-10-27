// Runs before `prisma migrate deploy` on a hosted database: PostGIS is a prerequisite of the
// schema but is not created by the migrations themselves. Safe to run on every deploy.
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS postgis");
    console.log("PostGIS extension is available.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Could not enable PostGIS:", error.message);
  process.exit(1);
});
