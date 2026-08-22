import { RequestOtpRequest, TokenPairResponse, VerifyOtpRequest } from "@motiq/types";
import { apiClient } from "./client";

export const authApi = {
  requestOtp: (phone: string) =>
    apiClient.post<void>("/auth/otp/request", { phone } satisfies RequestOtpRequest),

  verifyOtp: (dto: VerifyOtpRequest) => apiClient.post<TokenPairResponse>("/auth/otp/verify", dto),
};
