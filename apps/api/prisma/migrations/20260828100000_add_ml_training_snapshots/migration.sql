-- CreateEnum
CREATE TYPE "TrustSnapshotReason" AS ENUM ('RATING_SUBMITTED', 'VERIFICATION_TRANSITION');

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "providerTrustScoreAtOffer" DECIMAL(3,2);

-- CreateTable
CREATE TABLE "provider_trust_snapshots" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "ratingAverage" DECIMAL(3,2) NOT NULL,
    "completedJobCount" INTEGER NOT NULL,
    "verificationStatus" "ProviderVerificationStatus" NOT NULL,
    "trustScore" DECIMAL(3,2) NOT NULL,
    "reason" "TrustSnapshotReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_trust_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_trust_snapshots_providerProfileId_createdAt_idx" ON "provider_trust_snapshots"("providerProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "provider_trust_snapshots" ADD CONSTRAINT "provider_trust_snapshots_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

