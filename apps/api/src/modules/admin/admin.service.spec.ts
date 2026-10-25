import { AdminService } from "./admin.service";

describe("AdminService — refundPayment / updateUserStatus audit trail (Ch61)", () => {
  function buildService() {
    const prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) } };
    const providerService = {};
    const requestService = {};
    const matchingService = {};
    const paymentService = {
      refundPayment: jest.fn().mockResolvedValue({ id: "pay-1", status: "REFUNDED" }),
    };
    const identityService = {
      findUserById: jest.fn().mockResolvedValue({ id: "user-1", isActive: true }),
      updateUserStatus: jest.fn().mockResolvedValue({ id: "user-1", isActive: false }),
    };

    const service = new AdminService(
      prisma as never,
      providerService as never,
      requestService as never,
      matchingService as never,
      paymentService as never,
      identityService as never,
    );
    return { service, prisma, paymentService, identityService };
  }

  it("refunds the payment and records an audit log entry", async () => {
    const { service, prisma, paymentService } = buildService();

    const result = await service.refundPayment("req-1", "admin-1", "customer requested");

    expect(paymentService.refundPayment).toHaveBeenCalledWith("req-1");
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "PAYMENT_REFUNDED",
        entityType: "Payment",
        entityId: "pay-1",
      }),
    });
    expect(result).toEqual({ id: "pay-1", status: "REFUNDED" });
  });

  it("suspends a user and records an audit log entry with before/after status", async () => {
    const { service, prisma, identityService } = buildService();

    await service.updateUserStatus("user-1", "admin-1", false);

    expect(identityService.updateUserStatus).toHaveBeenCalledWith("user-1", false);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin-1",
        action: "USER_SUSPENDED",
        entityType: "User",
        entityId: "user-1",
        metadata: { from: true, to: false },
      }),
    });
  });
});
