import { RequestOtpRequest, TokenPairResponse, VerifyOtpRequest } from "@motiq/types";
import { apiClient } from "./client";

// Only sent by demo builds, to a server that has DEMO_KEY set (see apps/api auth.service.ts).
const DEMO_KEY = process.env.EXPO_PUBLIC_DEMO_KEY;

export const authApi = {
  requestOtp: (phone: string, email: string) =>
    apiClient.post<void>("/auth/otp/request", { phone, email } satisfies RequestOtpRequest),

  verifyOtp: (dto: VerifyOtpRequest) => apiClient.post<TokenPairResponse>("/auth/otp/verify", dto),

  /** Demo-only sign-in (the server returns 404 unless DEMO_MODE=true). */
  demoLogin: (role: "CUSTOMER" | "PROVIDER") =>
    apiClient.post<TokenPairResponse>(
      "/auth/demo-login",
      { role },
      DEMO_KEY ? { headers: { "x-demo-key": DEMO_KEY } } : undefined,
    ),
};
