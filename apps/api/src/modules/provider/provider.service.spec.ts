import { Prisma } from "@prisma/client";
import { ProviderVerificationStatus, TrustSnapshotReason } from "@motiq/types";
import { ProviderService } from "./provider.service";

describe("ProviderService.recomputeTrustScore (ML training-data instrumentation)", () => {
  const providerProfileId = "provider-1";
  const provider = {
    id: providerProfileId,
    ratingAverage: new Prisma.Decimal("4.50"),
    completedJobCount: 20,
    verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    trustScore: new Prisma.Decimal("0.00"),
  };

  function buildService() {
    const updatedProvider = { ...provider };
    const prisma = {
      providerProfile: {
        findUnique: jest.fn().mockResolvedValue(provider),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(updatedProvider, data);
          return Promise.resolve(updatedProvider);
        }),
      },
      providerTrustSnapshot: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const config = { get: jest.fn() };
    const service = new ProviderService(prisma as never, config as never);
    return { service, prisma };
  }

  it("writes a ProviderTrustSnapshot row with the given reason after recomputing", async () => {
    const { service, prisma } = buildService();

    await service.recomputeTrustScore(providerProfileId, TrustSnapshotReason.RATING_SUBMITTED);

    expect(prisma.providerTrustSnapshot.create).toHaveBeenCalledTimes(1);
    const [{ data }] = prisma.providerTrustSnapshot.create.mock.calls[0];
    expect(data.providerProfileId).toBe(providerProfileId);
    expect(data.reason).toBe(TrustSnapshotReason.RATING_SUBMITTED);
    expect(data.ratingAverage).toBe(provider.ratingAverage);
    expect(data.completedJobCount).toBe(provider.completedJobCount);
    expect(data.verificationStatus).toBe(provider.verificationStatus);
  });

  it("records a different reason for a verification-status transition", async () => {
    const { service, prisma } = buildService();

    await service.recomputeTrustScore(providerProfileId, TrustSnapshotReason.VERIFICATION_TRANSITION);

    const [{ data }] = prisma.providerTrustSnapshot.create.mock.calls[0];
    expect(data.reason).toBe(TrustSnapshotReason.VERIFICATION_TRANSITION);
  });

  it("snapshots the post-update trustScore, not a stale pre-update value", async () => {
    const { service, prisma } = buildService();

    await service.recomputeTrustScore(providerProfileId, TrustSnapshotReason.RATING_SUBMITTED);

    const [{ data: updateData }] = prisma.providerProfile.update.mock.calls[0];
    const [{ data: snapshotData }] = prisma.providerTrustSnapshot.create.mock.calls[0];
    expect(snapshotData.trustScore.toString()).toBe(updateData.trustScore.toString());
  });
});

describe("ProviderService.countProvidersByDay", () => {
  it("includes providers created before the range in the first day's baseline", async () => {
    const prisma = {
      providerProfile: {
        count: jest.fn().mockResolvedValue(5), // baseline, created before `since`
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date() }]), // one created within range
      },
    };
    const service = new ProviderService(prisma as never, {} as never);

    const result = await service.countProvidersByDay(3);

    expect(prisma.providerProfile.count).toHaveBeenCalledWith({
      where: { verificationStatus: "FULLY_VERIFIED", createdAt: { lt: expect.any(Date) } },
    });
    expect(result[0].cumulative).toBe(5);
    expect(result[result.length - 1].cumulative).toBe(6);
  });
});
