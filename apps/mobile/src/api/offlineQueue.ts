import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { CreateServiceRequestDto } from "@motiq/types";
import { requestApi } from "./requestApi";
import { consentApi } from "./consentApi";

const QUEUE_STORAGE_KEY = "motiq.offlineRequestQueue";

interface QueuedRequest {
  localId: string;
  dto: CreateServiceRequestDto;
  queuedAt: string;
}

async function readQueue(): Promise<QueuedRequest[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
}

async function writeQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Ch67's non-negotiable guarantee: a customer mid-breakdown must be able to
 * submit a request attempt even mid-connectivity-loss. This never blocks on
 * live connectivity — it always queues locally first, and the caller decides
 * whether to also attempt an immediate send (see CreateRequestScreen).
 */
export async function enqueueServiceRequest(dto: CreateServiceRequestDto): Promise<string> {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const queue = await readQueue();
  queue.push({ localId, dto, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
  return localId;
}

export async function flushOfflineQueue(): Promise<{ succeeded: string[]; failed: string[] }> {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { succeeded: [], failed: [] };
  }

  const remaining: QueuedRequest[] = [];
  const succeeded: string[] = [];
  const failed: string[] = [];

  // Ch128 — a request queued while offline was queued before this device
  // could have granted consent to the server; grant it once up front rather
  // than per-item, since it's the same consent for every queued request.
  try {
    await consentApi.grantLocationTracking();
  } catch {
    // If this fails, each create() below will fail too and stay queued —
    // no need to special-case it here.
  }

  for (const item of queue) {
    try {
      await requestApi.create(item.dto);
      succeeded.push(item.localId);
    } catch {
      // Keep it queued — a transient failure (server error, still offline)
      // should retry on the next flush, not silently drop the request.
      remaining.push(item);
      failed.push(item.localId);
    }
  }

  await writeQueue(remaining);
  return { succeeded, failed };
}

export async function countQueuedRequests(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Wires a flush to the reconnect edge (offline -> online), not to every
 * connectivity event, so a flaky connection doesn't hammer the API with
 * repeated flush attempts while still offline. Call once near the app root
 * (see App.tsx); returns the NetInfo unsubscribe function.
 */
export function watchConnectivityAndFlush(
  onConnectivityChange: (isConnected: boolean) => void,
  onFlushed: (result: { succeeded: string[]; failed: string[] }) => void,
): () => void {
  let wasConnected = true;
  return NetInfo.addEventListener((state) => {
    const isConnected = !!state.isConnected;
    onConnectivityChange(isConnected);
    if (isConnected && !wasConnected) {
      flushOfflineQueue().then(onFlushed).catch(() => undefined);
    }
    wasConnected = isConnected;
  });
}
