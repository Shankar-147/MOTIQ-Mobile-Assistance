# apps/mobile — Customer & Provider Apps

React Native (Expo managed workflow) — resolves ADR 0008's open framework question via **ADR 0018**. One codebase hosts both the Customer app (Ch71) and the Provider app (Ch72) as separate navigation stacks selected post-login by the authenticated user's role; `apps/web` remains the separate internal Admin & Operations Console (ADR 0008), not part of this app.

## What's built (Phase 5)

- **Auth** (Ch33/Ch50, `src/features/auth/`): phone entry -> OTP verify, covering both login and new-account registration for Customer/Provider, matching the backend's single `/auth/otp/verify` endpoint.
- **API layer** (Ch66, `src/api/`): a shared axios client with a request interceptor for the bearer token and a response interceptor that transparently refreshes an expired access token (deduping concurrent refreshes, since ADR 0011's refresh tokens are single-use).
- **Offline-first request queuing** (Ch67, `src/api/offlineQueue.ts`): `CreateRequestScreen` always queues a request locally first; if the device is online the queued copy is submitted immediately, otherwise `App.tsx`'s connectivity watcher flushes the queue automatically on the next reconnect.
- **Real-time tracking client** (Ch69, `src/realtime/trackingSocket.ts`): a Socket.IO client matching the exact `/tracking` namespace protocol documented in `docs/api-conventions.md` (`subscribe:request`, `location:update`, `presence:heartbeat`).
- **Push notifications** (Ch70, `src/notifications/`): Android device-token registration against the backend's FCM adapter (ADR 0017); tapping a notification hands its payload to `pendingOfferStore` so `GoOnlineScreen` can deep-link a provider straight to `JobOfferScreen`.
- **Foreground location tracking** (Ch68, `src/features/provider/locationTracking.ts`): `expo-location`'s `watchPositionAsync`, streamed over the tracking socket while a provider is online and the app is foregrounded.
- **Customer app** (Ch71): create a request, track a provider live, rate a completed job.
- **Provider app** (Ch72, built to equal depth per Ch72's own named correction of a V0 gap): go online/offline, accept/decline a job offer, advance job status through the same state machine the backend enforces.
- **Accessibility constants** (Ch73, `src/accessibility/a11y.ts`): a shared minimum touch-target size and semantic labels, applied on every interactive element in every screen above.

## What's explicitly not built yet

- **Never run through Metro, never bundled, never opened in Expo Go or a simulator/device.** Only `tsc --noEmit` and ESLint have validated this code in this session — no Xcode/Android Studio/Expo Go available in this environment. See ADR 0018 and `docs/roadmap.md`'s Reconciliation Notes.
- **Background location** (Ch68's actual named subject): tracking here stops as soon as the app backgrounds. True background tracking needs `expo-task-manager` + `Location.startLocationUpdatesAsync`'s background task registration — not built.
- **iOS push**: the backend's push adapter (ADR 0017) only speaks FCM; iOS needs a separate APNs adapter that doesn't exist yet. `registerForPushNotifications()` intentionally no-ops on iOS rather than registering a token that would go nowhere.
- **SMS-based SOS fallback** (Ch67's other non-negotiable requirement): not built, because the backend has no SOS endpoint yet either (Ch55) — there's nothing for it to fall back to.
- **No "list Service Areas" or "my pending offer" endpoints exist yet** for an authenticated mobile user, so `CreateRequestScreen` and provider registration take a Service Area ID as free text, and a provider only learns about a new offer via a tapped push notification (no in-app recovery if that notification is missed).
- **In-app chat** (Ch78) and **deep offline caching of request/job history** (beyond the request-creation queue above) are out of scope for this phase.

## Running this (once verified on a machine with Expo tooling)

```bash
npm install
cp .env.example apps/api/.env  # EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_WS_URL — point at your dev machine's LAN IP for a physical device
npm run --workspace apps/mobile start
```
