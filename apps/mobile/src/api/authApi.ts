import { RequestOtpRequest, TokenPairResponse, VerifyOtpRequest } from "@motiq/types";
import { apiClient } from "./client";

export const authApi = {
  requestOtp: (phone: string, email: string) =>
    apiClient.post<void>("/auth/otp/request", { phone, email } satisfies RequestOtpRequest),

  verifyOtp: (dto: VerifyOtpRequest) => apiClient.post<TokenPairResponse>("/auth/otp/verify", dto),
};
