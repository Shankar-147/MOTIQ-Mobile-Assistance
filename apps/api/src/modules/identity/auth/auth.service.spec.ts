import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UserRole } from "@motiq/types";
import { AuthService } from "./auth.service";
import { hashOtpCode } from "./otp.util";

describe("AuthService.verifyOtp (Ch33 — OTP vs. registration-data failure modes)", () => {
  const phone = "+919999999999";
  const code = "123456";

  function buildService(overrides: { serviceArea?: unknown } = {}) {
    const challenge = {
      id: "challenge-1",
      phone,
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      consumedAt: null,
    };

    const prisma = {
      otpChallenge: {
        findFirst: jest.fn().mockResolvedValue(challenge),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      providerProfile: {
        create: jest.fn().mockResolvedValue({ id: "profile-1" }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: "refresh-1" }),
      },
      serviceArea: {
        findUnique: jest.fn().mockResolvedValue(
          "serviceArea" in overrides ? overrides.serviceArea : { id: "area-1", name: "Bengaluru (Pilot)" },
        ),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

    const jwtService = { sign: jest.fn().mockReturnValue("signed-jwt") };
    const config = { get: jest.fn().mockReturnValue("30d") };
    const notifications = { sendOtpSms: jest.fn() };

    const service = new AuthService(prisma as never, jwtService as never, config as never, notifications as never);
    return { service, prisma };
  }

  it("does NOT consume the OTP challenge when a provider registration is missing serviceAreaId", async () => {
    const { service, prisma } = buildService();

    await expect(
      service.verifyOtp({
        phone,
        code,
        role: UserRole.PROVIDER,
        businessName: "Joe's Garage",
        // serviceAreaId deliberately omitted
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.otpChallenge.update).not.toHaveBeenCalled();
  });

  it("does NOT consume the OTP challenge when serviceAreaId doesn't reference a real ServiceArea", async () => {
    const { service, prisma } = buildService({ serviceArea: null });

    await expect(
      service.verifyOtp({
        phone,
        code,
        role: UserRole.PROVIDER,
        businessName: "Joe's Garage",
        serviceAreaId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.otpChallenge.update).not.toHaveBeenCalled();
  });

  it("consumes the OTP challenge once a provider registration is actually valid", async () => {
    const { service, prisma } = buildService();

    await service.verifyOtp({
      phone,
      code,
      role: UserRole.PROVIDER,
      businessName: "Joe's Garage",
      serviceAreaId: "area-1",
    });

    expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
      where: { id: "challenge-1" },
      data: { consumedAt: expect.any(Date) },
    });
  });
});
