import { AssignmentStatus, Prisma } from "@prisma/client";
import { ProviderVerificationStatus, RequestStatus } from "@motiq/types";
import { BadRequestException } from "@nestjs/common";
import { MatchingService } from "./matching.service";

describe("MatchingService.dispatch (ML training-data instrumentation)", () => {
  const serviceRequestId = "request-1";
  const candidate = { id: "provider-1", distanceMeters: 500, trustScore: 3.67 };
  const providerProfile = {
    id: "provider-1",
    verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED,
    trustScore: new Prisma.Decimal("3.67"),
  };

  function buildService() {
    const prisma = {
      assignment: { create: jest.fn().mockResolvedValue({ id: "assignment-1" }) },
    };
    const providerService = {
      findNearestAvailableProvidersForRequest: jest.fn().mockResolvedValue([candidate]),
      findById: jest.fn().mockResolvedValue(providerProfile),
    };
    const requestService = {
      findById: jest.fn().mockResolvedValue({ status: RequestStatus.REQUESTED }),
      transition: jest.fn().mockResolvedValue(undefined),
    };
    const config = { get: jest.fn().mockReturnValue(10_000) };
    const events = { emit: jest.fn() };
    // No network call — rankProviders throws, exercising the same hard
    // distance-sort fallback ADR 0007 mandates (see rankCandidatesWithFallback).
    const aiService = { rankProviders: jest.fn().mockRejectedValue(new Error("no network in test")) };

    const service = new MatchingService(
      prisma as never,
      providerService as never,
      requestService as never,
      config as never,
      events as never,
      aiService as never,
    );
    return { service, prisma };
  }

  it("snapshots the candidate's trustScore onto the new Assignment at offer time", async () => {
    const { service, prisma } = buildService();

    await service.dispatch(serviceRequestId);

    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerTrustScoreAtOffer: providerProfile.trustScore,
      }),
    });
  });
});

describe("MatchingService.getActiveAssignmentForProvider (Ch54's live-tracking room lookup)", () => {
  it("excludes terminal-status requests so a finished job's stale ACCEPTED assignment is never matched", async () => {
    const prisma = {
      assignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new MatchingService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.getActiveAssignmentForProvider("provider-1");

    expect(prisma.assignment.findFirst).toHaveBeenCalledWith({
      where: {
        providerProfileId: "provider-1",
        status: AssignmentStatus.ACCEPTED,
        serviceRequest: {
          status: {
            notIn: ["COMPLETED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_PROVIDER", "FAILED"],
          },
        },
      },
      orderBy: { offeredAt: "desc" },
    });
  });
});

describe("MatchingService.adminOverrideDispatch (Ch61's admin manual dispatch override)", () => {
  const serviceRequestId = "request-1";
  const providerProfileId = "provider-1";
  const serviceAreaId = "area-1";

  function buildService(options: {
    requestStatus?: RequestStatus;
    providerServiceAreaId?: string;
    providerVerificationStatus?: ProviderVerificationStatus;
  }) {
    const prisma = {
      assignment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: "assignment-2" }),
      },
    };
    const providerService = {
      findById: jest.fn().mockResolvedValue({
        id: providerProfileId,
        serviceAreaId: options.providerServiceAreaId ?? serviceAreaId,
        verificationStatus: options.providerVerificationStatus ?? ProviderVerificationStatus.FULLY_VERIFIED,
        trustScore: new Prisma.Decimal("3.00"),
      }),
      getDistanceToServiceRequestPickup: jest.fn().mockResolvedValue(750),
    };
    const requestService = {
      findById: jest.fn().mockResolvedValue({
        id: serviceRequestId,
        serviceAreaId,
        status: options.requestStatus ?? RequestStatus.EXPIRED,
      }),
      transition: jest.fn().mockResolvedValue(undefined),
    };
    const config = { get: jest.fn() };
    const events = { emit: jest.fn() };
    const aiService = { rankProviders: jest.fn() };

    const service = new MatchingService(
      prisma as never,
      providerService as never,
      requestService as never,
      config as never,
      events as never,
      aiService as never,
    );
    return { service, prisma, providerService, requestService, events };
  }

  it("supersedes any existing OFFERED assignment, creates an ACCEPTED one, and transitions the request", async () => {
    const { service, prisma, requestService, events } = buildService({});

    const result = await service.adminOverrideDispatch(serviceRequestId, providerProfileId);

    expect(prisma.assignment.updateMany).toHaveBeenCalledWith({
      where: { serviceRequestId, status: AssignmentStatus.OFFERED },
      data: expect.objectContaining({ status: AssignmentStatus.SUPERSEDED }),
    });
    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId,
        providerProfileId,
        status: AssignmentStatus.ACCEPTED,
        distanceMeters: 750,
      }),
    });
    expect(requestService.transition).toHaveBeenCalledWith(serviceRequestId, RequestStatus.PROVIDER_ACCEPTED);
    expect(events.emit).toHaveBeenCalledWith(
      "provider.assigned",
      expect.objectContaining({ serviceRequestId, providerProfileId }),
    );
    expect(result).toEqual({ id: "assignment-2" });
  });

  it("allows overriding a still-MATCHING request, not just an EXPIRED one", async () => {
    const { service } = buildService({ requestStatus: RequestStatus.MATCHING });
    await expect(service.adminOverrideDispatch(serviceRequestId, providerProfileId)).resolves.toBeDefined();
  });

  it("rejects a request that isn't MATCHING or EXPIRED", async () => {
    const { service } = buildService({ requestStatus: RequestStatus.COMPLETED });
    await expect(service.adminOverrideDispatch(serviceRequestId, providerProfileId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects a provider from a different ServiceArea (CLAUDE.md rule 8)", async () => {
    const { service } = buildService({ providerServiceAreaId: "a-different-area" });
    await expect(service.adminOverrideDispatch(serviceRequestId, providerProfileId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects a SUSPENDED provider even for a manual override", async () => {
    const { service } = buildService({
      providerVerificationStatus: ProviderVerificationStatus.SUSPENDED,
    });
    await expect(service.adminOverrideDispatch(serviceRequestId, providerProfileId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
