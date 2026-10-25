# Mobile Redesign — Foundation + Customer Core Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `apps/mobile` a dark, Uber/Bolt-style design foundation ("Midnight & Signal Green") and rebuild the Customer core journey (Home → Request → Matching → Tracking → Pay → Rate) on top of it, with no backend changes.

**Architecture:** Retheme gluestack in place (global dark config + a compatibility remap of legacy light tokens), restyle the `components/ui/` wrappers, add four JS-only primitives (`BottomSheet`, `StepIndicator`, `StatBlock`, `Skeleton`) plus a dark map treatment, then rebuild each Customer screen's layout while keeping its existing hooks, API calls and navigation untouched.

**Tech Stack:** React Native (Expo SDK 54, dev-client), `@gluestack-ui/themed`, Reanimated 4, `lucide-react-native`, `react-native-webview` (Leaflet map, Razorpay checkout).

**Spec:** `docs/superpowers/specs/2026-10-25-mobile-redesign-foundation-customer-core-design.md`

## Global Constraints

- **No new native dependencies** (nothing that needs a dev-client rebuild). Use only what `apps/mobile/package.json` already has: Reanimated, `react-native-svg`, `expo-linear-gradient`, `expo-location`, `react-native-webview`, RN core (`PanResponder`, `Share`, `Vibration`, `Animated`).
- **gluestack component-first** (CLAUDE.md): new UI goes through `components/ui/` wrappers over gluestack; no second UI library.
- **No backend/API changes.** Screens keep calling the same `requestApi` / `providerApi` / `vehicleApi` / `customerApi` / `consentApi` methods and the same `trackingSocket` helpers.
- **Dark only.** Palette exactly: bg `#0B0B0F`, surface `#17171C`, surfaceRaised `#1F2026`, border `#2A2B33`, text `#FFFFFF`, textSecondary `#A1A3AD`, textMuted `#6B6E7A`, accent `#22E58B`, accentInk `#04210F`, danger `#FF4D4D`, warning `#FFB84D`.
- **Fonts/scale:** Sora (display/numerals/titles) + Plus Jakarta Sans (body). Hero numerals 40–48pt, titles 24–28pt, body 15–16pt. CTAs 56pt tall, radius 16; cards/sheets radius 22–24, flat surface + hairline border, no shadows. 4pt grid, 16–20pt page padding.
- **Accessibility:** touch targets ≥ `MIN_TOUCH_TARGET_SIZE` (48); keep every existing `A11Y_LABELS` / `accessibilityLabel`; every new animation checks reduce-motion (`useReducedMotion` from `react-native-reanimated`).
- **Preserve behavior:** offline request queueing (`enqueueServiceRequest`), consent-before-create order (`consentApi.grantLocationTracking()` then `requestApi.create`), the REST-snapshot-then-socket pattern in Matching/Tracking, socket cleanup on unmount, persistent `SosButton`.
- **Commits carry no AI-attribution lines** (no `Co-Authored-By`, no "Generated with") — standing user instruction.
- **No automated test runs** (standing user instruction for UI work). Verification per task is: `npm run --workspace apps/mobile typecheck` (compile sanity, must print no errors) plus an on-device screenshot check (see "Device verification"). Run no other test commands unless debugging a real failure.

## Device verification (used by every task)

Prerequisites once per sitting: API running (`npm run --workspace apps/api start:dev`), Metro running (`npm run --workspace apps/mobile start -- --dev-client`), phone attached, then `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:3001 tcp:3001`. Metro fast-refreshes on save.
- Screenshot: `adb exec-out screencap -p > <scratch>/shot.png`, then Read the PNG. The image is shown at 923×2000 for a 1080×2340 device: multiply coordinates by 1.17 before `adb shell input tap X Y`.
- Find real tap bounds: `MSYS_NO_PATHCONV=1 adb shell uiautomator dump //sdcard/ui.xml` then `adb pull` it and grep `bounds=`.
- Screenshots can lag one frame behind a tap; wait ~1s before capturing.
- The device is logged in as the existing customer account; do not request or read OTP codes — if the session has expired, stop and ask the user to log in.

## Review Focus

- **Legacy screens left unreadable by the dark remap** (white-on-white, dark-on-dark, invisible icons from hard-coded hex) on Auth, Provider and secondary Customer screens. Covered by Tasks 1 and 12.
- **Bottom sheet vs. keyboard:** the Request step's description field must stay visible and tappable with the keyboard open, on a small screen. Covered by Tasks 3 and 7.
- **Order and offline behavior of request submission:** consent must still precede `requestApi.create`, the offline and server-error paths must still enqueue, and a double-tap on the confirm CTA must not submit twice. Covered by Task 7.
- **Socket lifecycle and the match race:** Matching and Tracking must still do the REST snapshot first, then subscribe, and must still disconnect and unsubscribe on unmount (no leaked listeners after redesign). Covered by Tasks 8 and 9.
- **Large accessibility font scale:** hero numerals (ETA, total) must not clip or overflow their containers at 130–200% system font size. Covered by Tasks 3, 9, 10.

---

### Task 1: Dark theme foundation and compatibility remap

**Files:**
- Modify: `apps/mobile/src/theme/colors.ts`
- Modify: `apps/mobile/src/theme/gluestackConfig.ts`
- Modify: `apps/mobile/App.tsx`

**Interfaces:**
- Produces: `COLORS` gains `bg, surface, surfaceRaised, border, text, textSecondary, textMuted, accent, accentInk, danger, warning` with the exact palette values; every pre-existing `COLORS` key is kept and re-pointed at its dark equivalent (`primary`→accent, `primaryDark`→accent shade, `primaryDeep`→surface, `bgTint`→surface, `textPrimary`→text, `textOnPrimary`→accentInk, `success`→accent, `electric`→accent). `FONTS` unchanged.
- Produces: gluestack config where `primary500–700` is a green ramp anchored on `accent` at `primary600`, and legacy light tokens are remapped for dark: `backgroundLight0/50/100`→bg/bg/surfaceRaised, `textLight900/800/700`→text, `textLight600/500`→textSecondary, `textLight400`→textMuted, `borderLight100–400`→border, `primary50/100/200`→a low-alpha accent tint, `primary700` (used as tint-text)→accent. `$white` is left white (it is used for text on colored fills).
- Produces: `NavigationContainer` uses a React Navigation dark theme built from the palette; `StatusBar style="light"`.

- [ ] **Step 1: Re-point `COLORS` and the gluestack tokens as specified above**, keeping `FONTS` and the existing font-token wiring intact.
- [ ] **Step 2: Set `StatusBar style="light"` and pass a `DarkTheme`-based `theme` (background `bg`, card `surface`, text `text`, border `border`, primary `accent`) to `NavigationContainer` in `App.tsx`.**
- [ ] **Step 3: Audit legacy hard-codes.** Run `grep -rnE 'bg="\$white"|"#[0-9A-Fa-f]{6}"|backgroundColor: ?"#' apps/mobile/src` and list screens outside Tasks 6–11 whose text/background would now collide. Fix only what is unreadable with the smallest mechanical edit (swap to a `COLORS.*` value or a remapped token); do not redesign them.
- [ ] **Step 4: Verify.** Run `npm run --workspace apps/mobile typecheck` — Expected: no output/errors. Then on device walk Welcome → Phone entry, Customer Home/History/Profile, Vehicle screens (VehicleHealth, AddVehicle, ReminderSettings), and capture one screenshot each. Expected: all text and controls readable (unpolished is fine, unreadable is not).
- [ ] **Step 5: Commit** `feat(mobile): dark theme foundation with legacy token remap`.

---

### Task 2: Restyle the UI kit and add Skeleton

**Files:**
- Modify: `apps/mobile/src/components/ui/{Button,Card,Chip,Badge,Input,Avatar,Toggle,EmptyState,LoadingScreen}.tsx`
- Create: `apps/mobile/src/components/ui/Skeleton.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Interfaces:**
- Consumes: `COLORS` from Task 1.
- Produces (props unchanged for existing components so no screen breaks): `Button` — same `label/onPress/variant/loading/disabled/accessibilityLabel/fullWidth/icon` props, variants `primary` (accent fill, `accentInk` text), `danger`, `success`, `outline` (surface fill + border), height 56, radius 16, press-scale to 0.98 (skipped under reduce-motion). `Chip` — same props, selected = accent border + tinted fill. `Card` — flat `surface`, 1px `border`, radius 22. `Input`, `Badge`, `InitialsAvatar`, `Toggle`, `EmptyState` restyled to the palette with unchanged props. New `Skeleton({ width?: number | string; height?: number; radius?: number })` — a shimmer block (static block under reduce-motion). `LoadingScreen` renders a few `Skeleton`s on `bg` instead of a spinner.

- [ ] **Step 1: Restyle each component to the spec's tokens** (icon tints currently hard-coded `#4F46E5`/`#FFFFFF` become `COLORS.accent`/`COLORS.accentInk` as appropriate).
- [ ] **Step 2: Implement `Skeleton` with a Reanimated shared value looping opacity 0.4↔0.8; export from `index.ts`.**
- [ ] **Step 3: Verify.** `npm run --workspace apps/mobile typecheck` — Expected: no errors. On device capture Customer Home (still the old layout) and one form screen (AddVehicle). Expected: buttons are green with dark text, chips/inputs/cards on dark, no clipped labels.
- [ ] **Step 4: Commit** `feat(mobile): restyle UI kit for dark theme, add Skeleton`.

---

### Task 3: Sheet and display primitives

**Files:**
- Create: `apps/mobile/src/components/ui/BottomSheet.tsx`, `StepIndicator.tsx`, `StatBlock.tsx`, `PulseDot.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Interfaces:**
- Produces: `BottomSheet({ snapPoints: number[]; initialSnap?: number; onSnapChange?: (index: number) => void; children })` — absolutely positioned bottom sheet; `snapPoints` are visible heights in dp, ascending; drag handle + `PanResponder` vertical drag with spring snap via Reanimated; content is bottom-padded by the safe-area inset and lifts above the keyboard (listen to `Keyboard` events) so inputs stay visible; renders without drag/animation under reduce-motion.
- Produces: `StepIndicator({ total: number; current: number })` (1-based `current`, segmented bar, accent for done/current). `StatBlock({ label: string; value: string; accent?: boolean })` (small label above a 40–48pt Sora numeral, `allowFontScaling` on with `adjustsFontSizeToFit` + `numberOfLines={1}` so it never clips). `PulseDot({ color?: string })` (the "live" dot, static under reduce-motion).

- [ ] **Step 1: Implement the four components as specified.**
- [ ] **Step 2: Verify the sheet in isolation.** Temporarily render `<BottomSheet snapPoints={[220, 480]}>` with an `Input` inside on the Home screen, check on device: drag snaps, keyboard open keeps the input visible, system font scale 200% does not clip `StatBlock`. Remove the temporary render.
- [ ] **Step 3: `npm run --workspace apps/mobile typecheck` — Expected: no errors. Commit** `feat(mobile): add BottomSheet, StepIndicator, StatBlock, PulseDot`.

---

### Task 4: Dark map and MapBackdrop

**Files:**
- Modify: `apps/mobile/src/components/LiveTrackingMap.tsx`
- Create: `apps/mobile/src/components/MapBackdrop.tsx`

**Interfaces:**
- Produces: `LiveTrackingMap` keeps its current props; in the embedded Leaflet HTML the tile pane gets a CSS filter (`invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)`) and the page background becomes `bg`; pickup marker, moving marker and route polyline use `COLORS.accent` (route 4px). Adds optional prop `showMoving?: boolean` (default true) — no behavior change for current callers.
- Produces: `MapBackdrop({ position: GeoPoint | null; moving?: GeoPoint | null; routeGeometry?: GeoPoint[] | null; bottomInset?: number; children?: ReactNode })` — fills its parent with `LiveTrackingMap` (pickup = `position`) and renders `children` (floating controls) above it inside a safe-area overlay. When `position` is null it shows a `bg`-colored placeholder with a `Skeleton`, not a map at 0,0.

- [ ] **Step 1: Apply the dark treatment and accent colors inside the WebView HTML; add `MapBackdrop`.**
- [ ] **Step 2: Verify.** On device open Track Request for an existing request (History → a request → Track) — Expected: dark map, green route/marker, recenter button readable. `npm run --workspace apps/mobile typecheck` — no errors.
- [ ] **Step 3: Commit** `feat(mobile): dark map treatment and MapBackdrop`.

---

### Task 5: Navigation chrome, SOS button, offline banner

**Files:**
- Modify: `apps/mobile/src/navigation/CustomerTabNavigator.tsx`, `CustomerNavigator.tsx`
- Modify: `apps/mobile/src/features/sos/SosButton.tsx`
- Create: `apps/mobile/src/components/FloatingBackButton.tsx`, `apps/mobile/src/components/OfflineBanner.tsx`

**Interfaces:**
- Produces: `FloatingBackButton({ onPress?: () => void; icon?: "back" | "close" })` — 44pt circular `surface` button with hairline border, `accessibilityLabel="Back"`/`"Close"`. `OfflineBanner()` — renders nothing when `useConnectivityStore` says connected, otherwise a slim warning-tinted bar "You're offline — requests are saved and sent when you reconnect".
- Modifies: tab bar uses `surface` background, `border` top hairline, `accent` active tint, `textMuted` inactive; native-stack `screenOptions` get dark header colors (`headerStyle.backgroundColor = bg`, `headerTintColor = text`, no header shadow) and `MainTabs`' Home tab header is hidden. `SosButton` keeps its props, behavior and `Alert` flow, restyled to `danger` pill with a light `Vibration.vibrate(30)` on press.

- [ ] **Step 1: Implement the two components and restyle tab bar / stack headers / `SosButton`.**
- [ ] **Step 2: Verify.** `npm run --workspace apps/mobile typecheck` — no errors; on device confirm tab bar and headers on History/Profile/Request detail are dark and readable, SOS still shows its confirmation alert (cancel it).
- [ ] **Step 3: Commit** `feat(mobile): dark navigation chrome, SOS restyle, offline banner`.

---

### Task 6: Home (map-first)

**Files:**
- Modify: `apps/mobile/src/features/customer/CustomerHomeScreen.tsx`
- Modify: `apps/mobile/src/navigation/types.ts`

**Interfaces:**
- Consumes: `MapBackdrop` (Task 4), `BottomSheet` (Task 3), `Chip`/`Button`/`Card`/`Badge`/`Skeleton` (Task 2), `FloatingBackButton`/`OfflineBanner`/`SosButton` (Task 5), `ISSUE_ICONS` (existing).
- Produces: `CustomerStackParamList["CreateRequest"]` becomes `{ vehicleId?: string; issueType?: IssueType } | undefined` — Task 7 reads `issueType` as the pre-selected issue.

- [ ] **Step 1: Add the `issueType` route param** in `types.ts`.
- [ ] **Step 2: Rebuild the layout.** `MapBackdrop` full screen using the device position (read with `expo-location`: if foreground permission is already granted use `getLastKnownPositionAsync()` falling back to `getCurrentPositionAsync({ accuracy: Balanced })`; if not granted show an "Enable location" row in the sheet that requests permission on tap — never block the screen on it). Floating `SosButton` top-right, `OfflineBanner` top. `BottomSheet` (snaps ≈ 260 / 520) holds: title "What's wrong?", a location row (`PulseDot` + "Using your current location" / "Enable location"), a 3×2 issue tile grid (one tile per `IssueType`, icon from `ISSUE_ICONS`, selected tile accent-bordered), the vehicle `Chip` row (selection state exactly as today, including the "Add your vehicle" card when `vehicles.length === 0`), a "Continue" `Button` (disabled until an issue is chosen) calling `navigation.navigate("CreateRequest", { vehicleId: selectedVehicleId, issueType })`. The active-request banner and recent-activity list move into the expanded sheet region with their current navigation targets (`TrackRequest`, `RequestDetail`). Keep the `useFocusEffect` data loading and `TERMINAL_STATUSES` logic unchanged.
- [ ] **Step 3: Verify.** typecheck — no errors. On device: map visible with a position marker, pick an issue, Continue opens CreateRequest, SOS shows its alert, recent requests open Detail, "Add your vehicle" path still reaches AddVehicle (test with the current account's state as available). Capture screenshots of collapsed and expanded sheet.
- [ ] **Step 4: Commit** `feat(mobile): map-first customer home`.

---

### Task 7: Request (3-step sheet)

**Files:**
- Modify: `apps/mobile/src/features/customer/CreateRequestScreen.tsx`

**Interfaces:**
- Consumes: `route.params.issueType` (Task 6), `BottomSheet`, `StepIndicator`, `MapBackdrop`, `OfflineBanner`, `FloatingBackButton`.

- [ ] **Step 1: Restructure into three steps inside a full-height `BottomSheet` over a dimmed `MapBackdrop`:** (1) issue (pre-selected from `route.params.issueType`, still changeable), (2) vehicle chips + description `Input` (multiline, keyboard-safe), (3) confirm — summary rows (issue, vehicle, "Pickup: your current location") and the line "Final fare is calculated when the job completes — you'll see the full breakdown before you pay.", CTA "Confirm & find provider". `StepIndicator` shows progress; Back moves a step (first step's back leaves the screen).
- [ ] **Step 2: Keep `handleSubmit` byte-for-byte in behavior:** permission request → `getCurrentPositionAsync({ accuracy: BestForNavigation })` → dto build → offline branch `enqueueServiceRequest` → `consentApi.grantLocationTracking()` → `requestApi.create` → `navigation.navigate("Matching", …)`; the catch-all enqueue; the `status` message text. Guard against double submit (`submitting` already disables the CTA — keep it disabled and ignore presses while true). Add a light `Vibration.vibrate(30)` on confirm.
- [ ] **Step 3: Verify.** typecheck — no errors. On device: complete steps 1–3 up to confirm; with keyboard open in step 2 the description field is visible; put the phone in airplane mode and confirm — Expected: the offline message appears and nothing navigates (then disable airplane mode). Do not submit a live request unless the user asks.
- [ ] **Step 4: Commit** `feat(mobile): stepped request sheet`.

---

### Task 8: Matching

**Files:**
- Modify: `apps/mobile/src/features/customer/MatchingScreen.tsx`

**Interfaces:**
- Consumes: `MapBackdrop`, `BottomSheet`, `PulseDot`, `StepIndicator`, `Button`, `FloatingBackButton`.

- [ ] **Step 1: Re-skin both states.** `waiting`: dark map, a Reanimated radar pulse (two expanding accent rings, static ring under reduce-motion) centered over the position, sheet with "Finding the nearest provider…", "This usually takes less than a minute.", `StepIndicator total=3 current=1`, ghost Cancel button (same `handleCancel`). `no-match`: icon + "No provider available right now" + "Try again" (same `navigation.replace("CreateRequest", undefined)`).
- [ ] **Step 2: Leave the effect untouched** (REST `getById` snapshot, `connectTrackingSocket`, `subscribeToRequest`, `onRequestMatched`, `onMatchingFailed`, cleanup and `disconnectTrackingSocket`). The pickup position for the map comes from the same `getById` response (`pickupLocation`) already fetched there.
- [ ] **Step 3: Verify.** typecheck — no errors. On device open Matching via an existing request id only if one is available without creating data; otherwise verify by temporarily navigating to it with a known id and revert. Expected: radar animates, Cancel visible, no layout clipping.
- [ ] **Step 4: Commit** `feat(mobile): radar matching screen`.

---

### Task 9: Tracking

**Files:**
- Modify: `apps/mobile/src/features/customer/TrackRequestScreen.tsx`, `apps/mobile/src/components/StatusTimeline.tsx`

**Interfaces:**
- Consumes: `MapBackdrop`, `BottomSheet`, `StatBlock`, `PulseDot`, `StepIndicator`, `InitialsAvatar`, `Badge`, `SosButton`, `FloatingBackButton`; RN `Share`.

- [ ] **Step 1: Rebuild the layout.** Map fills the screen (`LiveTrackingMap` via `MapBackdrop`, same `pickup`/`moving`/`routeGeometry`/`movingLabel` props). Floating back button and `SosButton`. Bottom sheet: hero `StatBlock` "Arriving in" → `{eta.minMinutes}–{eta.maxMinutes} min` (the existing `eta = drivingRoute?.eta ?? location?.eta ?? null` logic; when null show "Waiting for your provider's live location…" with `PulseDot`), provider row (`InitialsAvatar`, `businessName`, rating via `Number(provider.ratingAverage).toFixed(1)`, verification `Badge`), `StatusTimeline` restyled as the segmented step indicator (same `STEPS`/`STEP_INDEX`), and a "Share trip status" ghost button calling `Share.share({ message })` with `"I'm getting roadside help from {businessName} — arriving in {min}–{max} min. (MOTIQ)"` (omit the ETA clause when no ETA). No call button, no plate.
- [ ] **Step 2: Leave data flow untouched:** `getById`, `connectTrackingSocket`/`subscribeToRequest`/`onLocationUpdate`, `getPublicProfile`, `useRouteToPickup`, cleanup.
- [ ] **Step 3: Verify.** typecheck — no errors. On device open Track Request for an existing request: map/route/sheet render, Share opens the system sheet (dismiss), SOS alert prompt appears (cancel), 200% font scale does not clip the ETA.
- [ ] **Step 4: Commit** `feat(mobile): hero tracking screen with trip sharing`.

---

### Task 10: Pay path (Request Detail + Make Payment)

**Files:**
- Modify: `apps/mobile/src/features/customer/RequestDetailScreen.tsx`, `apps/mobile/src/features/customer/MakePaymentScreen.tsx`

**Interfaces:**
- Consumes: `StatBlock`, `Card`, `Badge`, `Button`, `Skeleton`, `StatusTimeline`, `statusBadgeTone`.

- [ ] **Step 1: Request Detail.** Same data and navigation targets (`MakePayment`, `TrackRequest`, `RateProvider`), restyled on dark: header with issue + status `Badge`, detail `Card`s, and the payment card with the total as a `StatBlock` hero (`₹{payment.totalAmount}`), payment-status `Badge`, and the Pay CTA (only when the screen already shows it today). Show line items only if the existing payment response contains them.
- [ ] **Step 2: Make Payment.** Restyle only the surrounding states (loading `Skeleton`, confirming, failed card with retry/"Go back", done) and set the WebView container/background to `bg`. Do not alter the Razorpay `options`, `onMessage` handling, `confirmPayment` call or `navigation.goBack()` behavior.
- [ ] **Step 3: Verify.** typecheck — no errors. On device open Request Detail for the completed request and capture it; open Make Payment only if a payable request exists, otherwise verify the file compiles and the failed/loading states by reading. Never complete a real payment.
- [ ] **Step 4: Commit** `feat(mobile): dark request detail and payment states`.

---

### Task 11: Rate

**Files:**
- Modify: `apps/mobile/src/features/customer/RateProviderScreen.tsx`

**Interfaces:**
- Consumes: `BottomSheet` or full-screen `bg` layout, `Chip`, `Input`, `Button`, `InitialsAvatar`.

- [ ] **Step 1: Restyle.** Large tappable stars (36–44pt, accent fill when selected, keep `minWidth/minHeight = MIN_TOUCH_TARGET_SIZE` and the `Rate N stars` labels), quick-tag `Chip`s (On time, Polite, Skilled, Clean work) whose selected labels are appended to the comment string (`comment` + `" · "` + tags) before `requestApi.submitRating(serviceRequestId, stars, finalComment || undefined)` — no API change. Keep `handleSubmit`, the `submitting` guard and `navigation.navigate("MainTabs")`.
- [ ] **Step 2: Verify.** typecheck — no errors. On device capture the screen via a known request id (do not submit a rating unless the user asks).
- [ ] **Step 3: Commit** `feat(mobile): redesigned rating screen`.

---

### Task 12: Remaining-screen readability pass and full walkthrough

**Files:**
- Modify (only if needed, mechanical edits): any Auth, Provider or secondary Customer screen under `apps/mobile/src/features/**` found unreadable.

- [ ] **Step 1: Walk every non-redesigned screen reachable on the device** (Welcome, Phone entry, OTP, Customer History, Profile, VehicleHealth, AddVehicle, AddMaintenanceRecord, ReminderSettings, VehicleOnboarding; Provider screens are reachable only with a Provider session — if none, list them as unverified instead of guessing). For each, capture a screenshot and fix unreadable text/icons with the smallest edit (swap hard-coded hex to `COLORS.*`).
- [ ] **Step 2: Full-journey pass** of the redesigned Customer flow in order, capturing one screenshot per screen for the user to review, and run `npm run --workspace apps/mobile typecheck` one last time — Expected: no errors.
- [ ] **Step 3: Commit** `fix(mobile): readability pass on screens outside the redesigned flow`.
