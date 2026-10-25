import { AdminService } from "./admin.service";

describe("AdminService — refundPayment / updateUserStatus audit trail (Ch61)", () => {
  function buildService() {
    const prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) } };
    const providerService = { countProvidersByDay: jest.fn() };
    const requestService = { countRequestsByDay: jest.fn() };
    const matchingService = {};
    const paymentService = {
      refundPayment: jest.fn().mockResolvedValue({ id: "pay-1", status: "REFUNDED" }),
    };
    const identityService = {
      findUserById: jest.fn().mockResolvedValue({ id: "user-1", isActive: true }),
      updateUserStatus: jest.fn().mockResolvedValue({ id: "user-1", isActive: false }),
    };
    const sosService = { countAlertsByDay: jest.fn() };

    const service = new AdminService(
      prisma as never,
      providerService as never,
      requestService as never,
      matchingService as never,
      paymentService as never,
      identityService as never,
      sosService as never,
    );
    return { service, prisma, paymentService, identityService, requestService, sosService, providerService };
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

  describe("getMetricsOverview", () => {
    it("assembles all three series by delegating to their owning services", async () => {
      const { service, requestService, sosService, providerService } = buildService();
      requestService.countRequestsByDay.mockResolvedValue([{ date: "2026-01-01", count: 2 }]);
      sosService.countAlertsByDay.mockResolvedValue([{ date: "2026-01-01", count: 0 }]);
      providerService.countProvidersByDay.mockResolvedValue([{ date: "2026-01-01", cumulative: 5 }]);

      const result = await service.getMetricsOverview(30);

      expect(requestService.countRequestsByDay).toHaveBeenCalledWith(30);
      expect(sosService.countAlertsByDay).toHaveBeenCalledWith(30);
      expect(providerService.countProvidersByDay).toHaveBeenCalledWith(30);
      expect(result).toEqual({
        requestsByDay: [{ date: "2026-01-01", count: 2 }],
        sosAlertsByDay: [{ date: "2026-01-01", count: 0 }],
        providerGrowth: [{ date: "2026-01-01", cumulative: 5 }],
      });
    });
  });
});
