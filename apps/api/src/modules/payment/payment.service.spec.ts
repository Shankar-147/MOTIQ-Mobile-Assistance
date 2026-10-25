import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma, PaymentStatus } from "@prisma/client";
import { PaymentService } from "./payment.service";

describe("PaymentService.refundPayment (Ch61 — admin-initiated full refund)", () => {
  function buildService(payment: Record<string, unknown> | null, gatewayConfigured = true) {
    const prisma = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
          ...payment,
          ...data,
        })),
      },
    };

    const gateway = {
      isConfigured: jest.fn().mockReturnValue(gatewayConfigured),
      refundPayment: jest.fn().mockResolvedValue({ refundId: "rfnd_1" }),
    };

    const events = { emit: jest.fn() };

    const service = new PaymentService(
      prisma as never,
      {} as never,
      {} as never,
      events as never,
      gateway as never,
    );
    return { service, prisma, gateway, events };
  }

  it("throws NotFoundException when no Payment exists for the ServiceRequest", async () => {
    const { service } = buildService(null);
    await expect(service.refundPayment("req-1")).rejects.toThrow(NotFoundException);
  });

  it("is idempotent — refunding an already-REFUNDED payment is a no-op", async () => {
    const { service, gateway, prisma } = buildService({
      id: "pay-1",
      status: PaymentStatus.REFUNDED,
    });

    const result = await service.refundPayment("req-1");

    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(gateway.refundPayment).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("rejects refunding a payment that isn't CAPTURED yet", async () => {
    const { service } = buildService({ id: "pay-1", status: PaymentStatus.PENDING });
    await expect(service.refundPayment("req-1")).rejects.toThrow(BadRequestException);
  });

  it("rejects a gateway refund when the payment has no recorded gatewayPaymentId", async () => {
    const { service } = buildService({
      id: "pay-1",
      status: PaymentStatus.CAPTURED,
      gatewayPaymentId: null,
      totalAmount: new Prisma.Decimal("500.00"),
    });
    await expect(service.refundPayment("req-1")).rejects.toThrow(BadRequestException);
  });

  it("calls the gateway with the full amount and marks the payment REFUNDED", async () => {
    const { service, gateway, prisma, events } = buildService({
      id: "pay-1",
      status: PaymentStatus.CAPTURED,
      gatewayPaymentId: "pay_razorpay_1",
      totalAmount: new Prisma.Decimal("500.00"),
    });

    const result = await service.refundPayment("req-1");

    expect(gateway.refundPayment).toHaveBeenCalledWith({
      gatewayPaymentId: "pay_razorpay_1",
      amount: new Prisma.Decimal("500.00"),
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { status: PaymentStatus.REFUNDED },
    });
    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(events.emit).toHaveBeenCalledWith(
      "payment.refunded",
      expect.objectContaining({ serviceRequestId: "req-1", paymentId: "pay-1" }),
    );
  });

  it("degrades to a logged, no-gateway-call refund when no gateway is configured", async () => {
    const { service, gateway, prisma } = buildService(
      {
        id: "pay-1",
        status: PaymentStatus.CAPTURED,
        gatewayPaymentId: null,
        totalAmount: new Prisma.Decimal("500.00"),
      },
      false,
    );

    const result = await service.refundPayment("req-1");

    expect(gateway.refundPayment).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "pay-1" },
      data: { status: PaymentStatus.REFUNDED },
    });
    expect(result.status).toBe(PaymentStatus.REFUNDED);
  });
});
