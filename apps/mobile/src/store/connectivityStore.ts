import { create } from "zustand";

/**
 * Ch67 — a global connectivity flag so any screen can show an offline
 * banner, independent of whichever screen happens to own the NetInfo
 * subscription (see offlineQueue.ts's watchConnectivityAndFlush, wired once
 * at the App.tsx root).
 */
interface ConnectivityState {
  isConnected: boolean;
  setConnected: (isConnected: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isConnected: true,
  setConnected: (isConnected) => set({ isConnected }),
}));
