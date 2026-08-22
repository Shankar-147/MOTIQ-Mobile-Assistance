import { NotificationChannel, NotificationDeliveryTier } from "@motiq/types";

export interface NotificationPreferenceLike {
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStartHour: number | null;
  quietHoursEndHour: number | null;
}

const CHANNEL_ENABLED_FIELD: Record<NotificationChannel, keyof NotificationPreferenceLike> = {
  [NotificationChannel.SMS]: "smsEnabled",
  [NotificationChannel.PUSH]: "pushEnabled",
  [NotificationChannel.EMAIL]: "emailEnabled",
};

/**
 * Ch79's non-negotiable carve-out: CRITICAL (SOS/safety, OTP) notifications
 * are never suppressed by channel opt-out or quiet hours, no matter what the
 * user has configured. Only BEST_EFFORT notifications can be suppressed.
 */
export function isSuppressedByPreference(
  preference: NotificationPreferenceLike,
  channel: NotificationChannel,
  deliveryTier: NotificationDeliveryTier,
  nowLocalHour: number,
): boolean {
  if (deliveryTier === NotificationDeliveryTier.CRITICAL) {
    return false;
  }

  const channelEnabledField = CHANNEL_ENABLED_FIELD[channel];
  if (!preference[channelEnabledField]) {
    return true;
  }

  return isWithinQuietHours(preference, nowLocalHour);
}

function isWithinQuietHours(preference: NotificationPreferenceLike, nowLocalHour: number): boolean {
  const { quietHoursStartHour: start, quietHoursEndHour: end } = preference;
  if (start === null || end === null) {
    return false;
  }
  if (start === end) {
    return false;
  }
  // Wraps past midnight when start > end (e.g. 22 -> 7).
  if (start < end) {
    return nowLocalHour >= start && nowLocalHour < end;
  }
  return nowLocalHour >= start || nowLocalHour < end;
}
