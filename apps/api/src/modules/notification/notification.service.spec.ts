import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { NotificationService } from "./notification.service";

describe("NotificationService.send (push data payload forwarding)", () => {
  const userId = "user-1";

  function buildService() {
    const preference = {
      smsEnabled: true,
      pushEnabled: true,
      emailEnabled: true,
      quietHoursStartHour: null,
      quietHoursEndHour: null,
    };
    const prisma = {
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue(preference),
      },
      pushDeviceToken: {
        findMany: jest.fn().mockResolvedValue([{ id: "device-1", token: "fcm-token-1" }]),
      },
      notification: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    const smsGateway = { isConfigured: jest.fn().mockReturnValue(false) };
    const pushGateway = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendPush: jest.fn().mockResolvedValue(undefined),
    };
    const emailGateway = { isConfigured: jest.fn().mockReturnValue(false) };
    const service = new NotificationService(prisma as never, smsGateway as never, pushGateway as never, emailGateway as never);
    return { service, pushGateway };
  }

  it("forwards the payload to the push gateway's data field, stringified", async () => {
    const { service, pushGateway } = buildService();

    await service.send({
      userId,
      channel: NotificationChannel.PUSH,
      category: "job_offer",
      deliveryTier: NotificationDeliveryTier.CRITICAL,
      title: "New job offer",
      body: "A new job is available",
      payload: { assignmentId: "assignment-1", serviceRequestId: "request-1" },
    });

    // This was previously dropped entirely — a tapped notification had no
    // assignmentId/serviceRequestId to deep-link with (see
    // pushRegistration.ts's addNotificationTapListener), so tapping it did
    // nothing at all.
    expect(pushGateway.sendPush).toHaveBeenCalledWith({
      token: "fcm-token-1",
      title: "New job offer",
      body: "A new job is available",
      data: { assignmentId: "assignment-1", serviceRequestId: "request-1" },
    });
  });

  it("sends undefined data when no payload is given, rather than crashing", async () => {
    const { service, pushGateway } = buildService();

    await service.send({
      userId,
      channel: NotificationChannel.PUSH,
      category: "generic",
      deliveryTier: NotificationDeliveryTier.BEST_EFFORT,
      title: "Hello",
      body: "World",
    });

    expect(pushGateway.sendPush).toHaveBeenCalledWith({
      token: "fcm-token-1",
      title: "Hello",
      body: "World",
      data: undefined,
    });
  });
});
