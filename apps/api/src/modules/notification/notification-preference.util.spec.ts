import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";
import { isSuppressedByPreference, NotificationPreferenceLike } from "./notification-preference.util";

function preference(overrides: Partial<NotificationPreferenceLike> = {}): NotificationPreferenceLike {
  return {
    smsEnabled: true,
    pushEnabled: true,
    emailEnabled: true,
    quietHoursStartHour: null,
    quietHoursEndHour: null,
    ...overrides,
  };
}

describe("isSuppressedByPreference", () => {
  it("never suppresses CRITICAL tier, even with the channel disabled", () => {
    const pref = preference({ smsEnabled: false });
    expect(
      isSuppressedByPreference(pref, NotificationChannel.SMS, NotificationDeliveryTier.CRITICAL, 3),
    ).toBe(false);
  });

  it("suppresses BEST_EFFORT when the channel is disabled", () => {
    const pref = preference({ pushEnabled: false });
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 12),
    ).toBe(true);
  });

  it("does not suppress BEST_EFFORT with no quiet hours configured", () => {
    const pref = preference();
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 2),
    ).toBe(false);
  });

  it("suppresses BEST_EFFORT inside a same-day quiet-hours window", () => {
    const pref = preference({ quietHoursStartHour: 13, quietHoursEndHour: 15 });
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 14),
    ).toBe(true);
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 16),
    ).toBe(false);
  });

  it("suppresses BEST_EFFORT inside a quiet-hours window that wraps past midnight", () => {
    const pref = preference({ quietHoursStartHour: 22, quietHoursEndHour: 7 });
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 23),
    ).toBe(true);
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 5),
    ).toBe(true);
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 12),
    ).toBe(false);
  });

  it("treats an equal start/end hour as no quiet hours (not a full-day block)", () => {
    const pref = preference({ quietHoursStartHour: 9, quietHoursEndHour: 9 });
    expect(
      isSuppressedByPreference(pref, NotificationChannel.PUSH, NotificationDeliveryTier.BEST_EFFORT, 9),
    ).toBe(false);
  });
});
