import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AuthenticatedUser } from "@motiq/types";
import { decodeAccessTokenPayload } from "../api/jwt";

const ACCESS_TOKEN_KEY = "motiq.accessToken";
const REFRESH_TOKEN_KEY = "motiq.refreshToken";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUser | null;
  hydrated: boolean;
  /** Reads any previously-persisted session from SecureStore on cold start (Ch66). */
  hydrate: () => Promise<void>;
  setSession: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
  setAccessToken: (accessToken: string) => void;
  logout: () => Promise<void>;
}

function userFromAccessToken(accessToken: string): AuthenticatedUser {
  const decoded = decodeAccessTokenPayload(accessToken);
  return { userId: decoded.sub, role: decoded.role, profileId: decoded.profileId };
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    // The stored access token may already be expired (15-minute TTL) — that's
    // fine for routing purposes (decode doesn't check exp); the first
    // authenticated request will trigger the refresh-token interceptor.
    const user = accessToken ? userFromAccessToken(accessToken) : null;
    set({ accessToken, refreshToken, user, hydrated: true });
  },

  setSession: async ({ accessToken, refreshToken }) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken, user: userFromAccessToken(accessToken) });
  },

  setAccessToken: (accessToken) => {
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken).catch(() => undefined);
    set({ accessToken, user: userFromAccessToken(accessToken) });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
