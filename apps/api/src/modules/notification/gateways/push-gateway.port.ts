/**
 * Ch32/Ch70: every third-party call goes through an internal adapter.
 * NotificationService depends on this interface, not on FCM directly — see
 * FcmPushGatewayAdapter and the PUSH_GATEWAY injection token.
 */
export interface PushGatewayPort {
  /** False when no server key is configured — see FcmPushGatewayAdapter's constructor. */
  isConfigured(): boolean;
  sendPush(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void>;
}

export const PUSH_GATEWAY = Symbol("PUSH_GATEWAY");
