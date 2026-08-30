import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? "http://localhost:3001";

export interface EtaEstimate {
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  distanceMeters: number;
}

export interface LocationUpdateEvent {
  providerProfileId: string;
  latitude: number;
  longitude: number;
  eta: EtaEstimate | null;
}

let socket: Socket | null = null;

/**
 * Ch69's WebSocket client lifecycle — one shared socket for the app session,
 * authenticated once at connect time (matches the server's handshake-time
 * JWT check, ADR 0015) rather than per-event. socket.io's own
 * reconnection/backoff (Ch69) is used as-is rather than hand-rolled.
 */
export function connectTrackingSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }
  const { accessToken } = useAuthStore.getState();
  socket = io(`${WS_URL}/tracking`, {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    transports: ["websocket"],
  });
  return socket;
}

export function subscribeToRequest(serviceRequestId: string): void {
  socket?.emit("subscribe:request", { serviceRequestId });
}

export function sendLocationUpdate(latitude: number, longitude: number): void {
  socket?.emit("location:update", { latitude, longitude });
}

export function sendPresenceHeartbeat(): void {
  socket?.emit("presence:heartbeat");
}

export function onLocationUpdate(handler: (event: LocationUpdateEvent) => void): () => void {
  socket?.on("location:update", handler);
  return () => socket?.off("location:update", handler);
}

export interface RequestMatchedEvent {
  assignmentId: string;
}

/** Ch71's mobile Customer app Matching screen — pushed the instant
 * MatchingService offers a provider, via TrackingGateway's bridge from the
 * ProviderAssigned domain event onto this request's Socket.IO room. */
export function onRequestMatched(handler: (event: RequestMatchedEvent) => void): () => void {
  socket?.on("request:matched", handler);
  return () => socket?.off("request:matched", handler);
}

/** Pushed when dispatch() finds zero available providers and the request
 * expires — see TrackingGateway's MatchingFailed bridge. */
export function onMatchingFailed(handler: () => void): () => void {
  socket?.on("request:matching-failed", handler);
  return () => socket?.off("request:matching-failed", handler);
}

export function disconnectTrackingSocket(): void {
  socket?.disconnect();
  socket = null;
}
