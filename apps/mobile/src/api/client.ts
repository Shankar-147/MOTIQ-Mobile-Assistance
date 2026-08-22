import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { RefreshTokenRequest, TokenPairResponse } from "@motiq/types";
import { useAuthStore } from "../store/authStore";

/**
 * Ch66's API integration layer. Base URL comes from an Expo public env var
 * (inlined at build time, never a secret — see .env.example's note) so a
 * physical device on the same LAN can point at a dev machine's IP instead of
 * localhost.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

// Refresh-token rotation (ADR 0011) means a token can only be redeemed once —
// concurrent 401s must share a single in-flight refresh, not each fire their
// own and race to invalidate one another.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }
  try {
    const response = await axios.post<TokenPairResponse>(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    } satisfies RefreshTokenRequest);
    setAccessToken(response.data.accessToken);
    return response.data.accessToken;
  } catch {
    await logout();
    return null;
  }
}

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  },
);
