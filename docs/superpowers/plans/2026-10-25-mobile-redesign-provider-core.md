# Mobile Redesign — Provider Core Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Redesign the Provider app (3 tabs, offer and active-job screens, Profile sub-screens, sign-up form) in the dark "Midnight & Signal Green" system, on top of the foundation and primitives built for the Customer flow. No backend changes.

**Architecture:** Add one new JS-only primitive (`SlideToConfirm`) and two shared cards (`JobCard`, KYC checklist row built from `SettingsRow`), then rebuild each provider screen's layout while leaving its data calls, presence/heartbeat/location logic and navigation untouched.

**Tech Stack:** React Native (Expo SDK 54 dev client), `@gluestack-ui/themed`, Reanimated 4, `lucide-react-native`.

**Spec:** `docs/superpowers/specs/2026-10-25-mobile-redesign-provider-core-design.md` (binding; its "What the data supports" section overrides any mockup).

## Global Constraints

- **No new native dependencies; no backend/API changes.** Same endpoints (`providerApi`, `providerFleetVehicleApi`, `assignments`), same `trackingSocket`/`locationTracking`/`pendingOfferStore` behavior.
- **Reuse, don't re-invent:** `BottomSheet`, `SheetModal`, `MapBackdrop`, `FloatingBackButton`, `OfflineBanner`, `StatBlock`, `PulseDot`, `Skeleton`, `StepIndicator`, `StatusTimeline`, `SettingsRow`/`SettingsGroup`, `RequestCard` pattern, `KeyboardScreen`, `useDeviceLocation`, `Chip`, `Badge`, `Button`, `Input`, `EmptyState`, and `COLORS`/`FONTS`/`ISSUE_ICONS`/`ISSUE_LABELS`.
- **Palette/scale as the Customer spec:** bg `#0B0B0F`, surface `#17171C`, surfaceRaised `#1F2026`, border `#2A2B33`, accent `#22E58B`, accentInk `#04210F`, danger `#FF4D4D`, warning `#FFB84D`. CTAs 56pt/radius 16, cards radius 22, touch targets ≥48, Sora titles, Jakarta body, 20pt page padding.
- **Honest data:** no per-job amount, no offer countdown, no phone number. Job cards show issue, status, distance, time.
- **Accessibility:** keep existing `A11Y_LABELS`/accessibility labels (`acceptOfferButton`, `rejectOfferButton`, etc.); every new animation honors reduce-motion (`useReducedMotion`); `SlideToConfirm` must be operable without a drag (accessible activation).
- **Commits carry no AI-attribution lines** (no `Co-Authored-By`, no "Generated with") — standing user instruction.
- **No automated test runs** (standing user instruction for UI work). Verification per task: `npm run --workspace apps/mobile typecheck` (must print no errors) plus an on-device screenshot where reachable.

## Device verification

Same workflow as the Customer plan: Metro (`preview_start mobile`), API running, `adb reverse tcp:8081/3001`, screenshots via `adb exec-out screencap -p`, displayed coordinates ×1.17 for taps. The phone is logged in as a provider for this plan; never read or request OTP codes. Screens needing a live job (offer, active job) are verified only if the same-device customer/provider swap reaches them; otherwise list them as unverified in the final message.

## Review Focus

- **Presence/location side effects unchanged:** going online/offline must still start/stop location tracking, connect/disconnect the socket, send heartbeats and call `updatePresence` exactly as before; no leaked intervals or watchers after the redesign (Tasks 2, 3).
- **Slide control safety:** a drag must not trigger an unintended job-status advance or presence change; double-confirm must not fire `onConfirm` twice (Tasks 1, 2, 4).
- **Pending offer hand-off:** `pendingOfferStore` navigation to `JobOffer` must still work from the redesigned Home (Task 2).
- **Large font scale and small screens:** hero numerals and the sheet content must not clip at 130–200% font size (Tasks 2, 5).
- **Legacy readability:** no provider screen left with unreadable text after the restyle (Task 9).

---

### Task 1: `SlideToConfirm` primitive

**Files:**
- Create: `apps/mobile/src/components/ui/SlideToConfirm.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Interfaces:**
- Produces: `SlideToConfirm({ label: string; onConfirm: () => void; disabled?: boolean; loading?: boolean; tone?: "accent" | "danger" })` — a 56pt rounded track (surfaceRaised, hairline border) with a 48pt thumb; dragging the thumb right past ~85% of the track width calls `onConfirm` once and the thumb snaps to the end until `loading` clears, otherwise springs back. Implemented with `PanResponder` + Reanimated shared values (same approach as `BottomSheet`). Reduce-motion: no spring (instant reset). Accessibility: the track is an `accessibilityRole="button"` with `accessibilityLabel={label}` and an `accessibilityActions`/`onAccessibilityAction` "activate" that calls `onConfirm`, so screen-reader users never need to drag. Guard against re-entry (`confirmedRef`).

- [ ] **Step 1:** Implement the component as specified; export from `index.ts`.
- [ ] **Step 2:** `npm run --workspace apps/mobile typecheck` — Expected: no errors.
- [ ] **Step 3:** Commit `feat(mobile): add SlideToConfirm primitive`.

---

### Task 2: Provider Home (map + Go online)

**Files:**
- Modify: `apps/mobile/src/features/provider/GoOnlineScreen.tsx`, `StatChip.tsx`, `RecentJobRow.tsx` (restyle only)
- Create: `apps/mobile/src/components/JobCard.tsx`
- Modify: `apps/mobile/src/navigation/ProviderTabNavigator.tsx` (hide native header on Home, Jobs, Profile)
- Retire if unused after this task: `OnlineStatusHero.tsx` (delete the file only when nothing imports it)

**Interfaces:**
- Produces: `JobCard({ issueType, status: AssignmentStatus, requestStatus?: RequestStatus, distanceMeters?: number | null, timeLabel: string, onPress?: () => void })` — same visual language as `RequestCard` (issue icon circle, issue label, status `Badge` from `ASSIGNMENT_STATUS_TONE`, distance as "x.x km" when present, time). Exported for reuse by Task 3.
- Consumes: `MapBackdrop`, `BottomSheet`, `SlideToConfirm`, `PulseDot`, `Badge`, `OfflineBanner`, `SosButton`, `useDeviceLocation`.

- [ ] **Step 1: Rebuild the layout only.** `MapBackdrop` (position from `useDeviceLocation`), floating SOS top-right, `OfflineBanner`. `BottomSheet` (snaps ≈ 360 / 640) holds: business name + verification `Badge` (existing `verificationBadgeTone`), a status line (Offline, or Online — waiting for jobs with `PulseDot`), the `SlideToConfirm` ("Slide to go online" / "Slide to go offline", `tone` danger when going offline) wired to the existing `handleToggle`, the three stats (Rating, Jobs done, This week/total earnings — existing values and sources) as `StatBlock`/compact tiles, the existing fleet-vehicle nudge/`Add` behavior if it exists today, and the recent jobs as `JobCard`s.
- [ ] **Step 2: Do not touch** the logic in `handleToggle`, the heartbeat effect, `registerForPushNotifications`, the `pendingOffer` effect, or the data loading in `useFocusEffect`; `error` text still renders.
- [ ] **Step 3:** In `ProviderTabNavigator`, set `headerShown: false` for Home/Jobs/Profile.
- [ ] **Step 4: Verify.** typecheck — no errors. On device (provider logged in): map visible, sheet drags, slide control toggles presence (watch the status line change), SOS alert prompt appears (cancel it). Capture screenshots.
- [ ] **Step 5:** Commit `feat(mobile): map-first provider home`.

---

### Task 3: Provider Jobs tab

**Files:**
- Modify: `apps/mobile/src/features/provider/ProviderJobsScreen.tsx`

**Interfaces:**
- Consumes: `JobCard` (Task 2), `StatBlock`, `Chip`, `Skeleton`, `EmptyState`, `providerApi.getEarnings()`/`listOwnJobs`.

- [ ] **Step 1: Rebuild.** Large title; earnings summary card (hero `StatBlock` "Total earnings" `₹{Number(totalEarnings).toFixed(2)}`, "N paid jobs · ₹X pending" from `getEarnings`; renders "₹0.00" honestly when nothing is captured); horizontally scrolling filter chips (All, Active, Completed, Declined/missed — map `AssignmentStatus` values to these groups, documenting the mapping in a comment); `SectionList` grouped Today / Yesterday / This week / Earlier with `JobCard`s (group/time helpers matching the customer History screen — extract a shared `dateGroups` helper only if copying would duplicate more than ~20 lines); pull-to-refresh; Load more via the existing cursor; skeletons while loading; empty state.
- [ ] **Step 2: Verify.** typecheck — no errors. On device: list renders, filter chips scroll and filter, pull-to-refresh works. Capture a screenshot.
- [ ] **Step 3:** Commit `feat(mobile): provider jobs tab with earnings summary`.

---

### Task 4: Offer and active-job screens

**Files:**
- Modify: `apps/mobile/src/features/provider/JobOfferScreen.tsx`, `ActiveJobScreen.tsx`

**Interfaces:**
- Consumes: `SlideToConfirm`, `MapBackdrop`, `BottomSheet`, `StatusTimeline`, `FloatingBackButton`, `SosButton`, `ISSUE_ICONS`/`ISSUE_LABELS`.

- [ ] **Step 1: Offer screen.** Dark full-screen: issue icon in an accent circle, issue label (Sora), distance and vehicle only if the screen already receives/fetches them (today it loads the request; keep that), the note "Respond soon — offers expire.", a 56pt Accept button (`acceptOfferButton` label) and a quieter Decline (`rejectOfferButton` label). Keep `acceptOffer`/`rejectOffer` calls, navigation and error text exactly.
- [ ] **Step 2: Active job screen.** `MapBackdrop` with pickup (`pickupLocation`) and the provider's own marker as `moving` (existing `watchPositionAsync` marker logic), floating back and `SosButton`, a `BottomSheet` with the issue, current status text, `StatusTimeline`, and a `SlideToConfirm` whose label is derived from the existing `STEP_LABEL` ("Slide: Start heading to the customer", etc.). `NEXT_STATUS`, `advanceJobStatus` and the COMPLETED handling stay unchanged; hide the slide control when no next step exists.
- [ ] **Step 3: Verify.** typecheck — no errors. On device if reachable (via the same-device swap); otherwise record as unverified.
- [ ] **Step 4:** Commit `feat(mobile): redesigned job offer and active job screens`.

---

### Task 5: Provider Profile

**Files:**
- Modify: `apps/mobile/src/features/provider/ProviderProfileScreen.tsx`

**Interfaces:**
- Consumes: `SettingsRow`/`SettingsGroup`, `SheetModal`, `Badge`, `verificationBadgeTone`, `providerApi.getOwnProfile()`/`listVerificationDocuments()`, `providerFleetVehicleApi`.

- [ ] **Step 1: Rebuild.** Hero (avatar initial, business name, star rating "4.9 · N jobs", verification `Badge`); KYC checklist group built from `listVerificationDocuments` — one `SettingsRow` per `VerificationDocumentType` with state text ("Approved", "Pending", "Rejected", "Not submitted") and a state-colored icon, tapping navigates to `KycUpload`; settings group (Earnings → `Earnings`, Ratings → `MyRatings`); fleet vehicles as plate cards with a "⋯" `SheetModal` (Edit → `AddFleetVehicle`, Remove with an `Alert` confirmation, existing delete call); dashed "Add a vehicle" → `AddFleetVehicle`; Log out row. Preserve all existing accessibility labels and the fleet delete error text.
- [ ] **Step 2: Verify.** typecheck — no errors. On device: hero, checklist, rows and the vehicle menu render; navigation to Earnings/Ratings works. Capture screenshots.
- [ ] **Step 3:** Commit `feat(mobile): trust-first provider profile`.

---

### Task 6: Earnings and Ratings

**Files:**
- Modify: `apps/mobile/src/features/provider/EarningsScreen.tsx`, `MyRatingsScreen.tsx`

- [ ] **Step 1: Earnings.** Hero `StatBlock` (total earnings, accent), paid-job count and pending amount, a grouped card list of `recentPayments` (amount `₹x.xx`, status `Badge`, friendly date), skeleton while loading, empty state "No payments yet."
- [ ] **Step 2: Ratings.** Restyle to dark cards: average rating hero, per-rating rows with star row (accent/warning fill), comment text, friendly date; skeleton and empty state; keep cursor pagination.
- [ ] **Step 3: Verify.** typecheck — no errors; on-device screenshots of both.
- [ ] **Step 4:** Commit `feat(mobile): redesigned earnings and ratings screens`.

---

### Task 7: KYC upload and Fleet vehicle form

**Files:**
- Modify: `apps/mobile/src/features/provider/KycUploadScreen.tsx`, `AddEditFleetVehicleScreen.tsx`

- [ ] **Step 1: KYC.** Document-type picker as `Chip`s, a dark upload form, and the submitted-documents list as cards with state `Badge`s; the screen currently renders its inputs in a `FlatList` header — make it keyboard-safe (use `KeyboardScreen` around a non-virtualized list, or pad/scroll the list the same way). Keep `submitVerificationDocument`/`listVerificationDocuments` calls and `documentBadgeTone`.
- [ ] **Step 2: Fleet form.** Already inside `KeyboardScreen`; restyle headings/labels, vehicle-type `Chip`s, and the Save button; keep the API calls.
- [ ] **Step 3: Verify.** typecheck — no errors; on-device screenshots where reachable.
- [ ] **Step 4:** Commit `feat(mobile): redesigned KYC and fleet vehicle screens`.

---

### Task 8: Sign-up form (provider branch of OtpVerify)

**Files:**
- Modify: `apps/mobile/src/features/auth/OtpVerifyScreen.tsx` (provider branch styling only; customer branch must not regress)

- [ ] **Step 1:** Restyle on dark: heading and helper text ("New accounts only: your business name and service area"), business-name `Input`, service-area `Chip`s, error text in `COLORS.warning`/danger, Verify button. Keep `verifyOtp` payload, error extraction and `KeyboardScreen`.
- [ ] **Step 2: Verify.** typecheck — no errors. A fresh sign-up cannot be exercised without a new account; verify by reading and, if the user logs out, via the login path screenshot.
- [ ] **Step 3:** Commit `feat(mobile): restyled provider sign-up form`.

---

### Task 9: Readability pass and full walkthrough

**Files:**
- Modify (only if needed, mechanical edits): any remaining provider file under `apps/mobile/src/features/provider/**` or `components/**` found unreadable.

- [ ] **Step 1:** Remove dead code left by the redesign (unused imports/files such as `OnlineStatusHero.tsx` if nothing imports it) and confirm `grep -rn 'COLORS.primaryDeep\|"#4F46E5"\|"#C7D2FE"' apps/mobile/src/features/provider` returns nothing that renders on a dark background incorrectly.
- [ ] **Step 2:** Walk every reachable provider screen on the device, one screenshot each, fix unreadable items with the smallest edit; run `npm run --workspace apps/mobile typecheck` one last time — Expected: no errors.
- [ ] **Step 3:** Commit `fix(mobile): readability pass on remaining provider screens`.
