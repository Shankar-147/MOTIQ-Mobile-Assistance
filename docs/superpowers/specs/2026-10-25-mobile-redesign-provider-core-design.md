# Mobile Redesign — Provider Core Flow

Status: Design approved in conversation, awaiting written-spec review
Scope: `apps/mobile` only. Sub-project 4 of the mobile redesign (see
`2026-10-25-mobile-redesign-foundation-customer-core-design.md` for the
foundation, palette, primitives and decomposition). Builds on that
foundation; no backend or API changes.

## Intent

The Provider app is functionally complete but is only patched for
readability on the new dark theme. Give it the same Uber/Bolt-style
"Midnight & Signal Green" treatment as the Customer app, reworked around the
provider's real moments: going online, answering an offer, working a job,
checking earnings and trust status. Same features, same endpoints.

## Decisions (from brainstorming)

- Home: map-first with a Go-online control (not a numbers dashboard).
- Jobs: earnings summary on top, job cards grouped by day beneath.
- Profile: trust and verification first (rating, verification badge, KYC
  checklist), then settings rows.
- Scope of this pass: the 3 tabs, the job offer and active job screens,
  the screens opened from Profile (Earnings, Ratings, KYC, Fleet vehicles),
  and the provider sign-up form.
- No new native dependencies. Reuses the customer-flow primitives
  (`BottomSheet`, `SheetModal`, `MapBackdrop`, `StatBlock`, `PulseDot`,
  `Skeleton`, `RequestCard` pattern, `SettingsRow`/`SettingsGroup`,
  `KeyboardScreen`, `StepIndicator`).

## What the data supports (binding)

- `GET /providers/me/jobs` rows carry assignment status, offeredAt,
  distanceMeters and the request's issueType/status/createdAt. There is **no
  per-job amount**, so job cards show distance, status and time only.
- `GET /providers/me/earnings` gives totalEarnings, pendingAmount,
  completedPayoutCount and recentPayments (amount, status, createdAt).
- `GET /providers/me` gives businessName, verificationStatus, ratingAverage,
  completedJobCount.
- The offer screen receives only `assignmentId` and `serviceRequestId`. The
  offer timeout is server configuration and is not exposed to the client, so
  **no countdown timer is shown** — the screen says offers expire soon.
- Offers reach the app by push/pending-offer hand-off and open the existing
  `JobOffer` route; they are not rendered inside the Home sheet.

## New primitive

`SlideToConfirm({ label, onConfirm, disabled?, loading? })` — a 56pt track
with a draggable thumb (RN `PanResponder` + Reanimated), triggers `onConfirm`
at ~85% travel, springs back otherwise, tap-free so a stray touch cannot
trigger it, a11y: also exposes an accessible button fallback (a long-press
or accessibility action) so it works with screen readers and reduce-motion
(static, no animation, activates on double-tap). Used for Go online/offline
and for advancing job steps.

## Screens

1. **Home** (`GoOnlineScreen`): `MapBackdrop` showing the provider's own
   position (via `useDeviceLocation`), floating SOS top right, offline
   banner. A `BottomSheet` holds a status line (Offline / Online — waiting
   for jobs, with `PulseDot` when online), the `SlideToConfirm` Go
   online/offline control, and a stat row (Rating, Jobs done, This week —
   the existing values). Recent jobs (last 3) sit in the expanded region as
   `JobCard`s. The existing presence, heartbeat, location-tracking, consent,
   push registration and pending-offer navigation logic is unchanged.
   Verification status shows as a `Badge`; a not-yet-verified provider keeps
   the existing guidance text.
2. **Job offer** (`JobOfferScreen`): dark full-screen — issue icon and
   label, distance if present, vehicle if present, a clear "Respond soon —
   offers expire" note, a large Accept button and a quieter Decline. Existing
   accept/reject calls and error text unchanged.
3. **Active job** (`ActiveJobScreen`): `MapBackdrop` with the customer's
   pickup and the provider's own marker (existing watcher), floating back/SOS,
   a bottom sheet with the current status, `StatusTimeline`, and a
   `SlideToConfirm` whose label is the current step ("Slide to start
   heading", "…mark arrived", "…start the job", "…complete job"). The
   `NEXT_STATUS` map and `advanceJobStatus` call are unchanged; on COMPLETED
   it behaves as today.
4. **Jobs** (`ProviderJobsScreen`): large title; summary card from
   `getEarnings` (Total earnings hero via `StatBlock`, paid-job count,
   pending amount); filter chips (All, Active, Completed, Declined/missed);
   `JobCard`s grouped Today / Yesterday / This week / Earlier, with issue
   icon, status badge, distance and time; pull-to-refresh and Load more.
   Filtering is client-side over the loaded pages.
5. **Profile** (`ProviderProfileScreen`): hero with business name, rating
   (stars + number), jobs done and a verification `Badge`; a KYC checklist
   card built from `listVerificationDocuments` (per document type: approved,
   pending, rejected, or not submitted) whose rows open `KycUpload`; settings
   group (Fleet vehicles → fleet section, Earnings, Ratings); fleet vehicles
   as plate cards with a "⋯" menu (Edit/Remove with confirmation) and a
   dashed "Add a vehicle"; Log out row.
6. **Earnings / Ratings / KYC upload / Fleet vehicle form**: restyled to the
   same system (hero numerals, grouped cards, skeletons, empty states,
   `KeyboardScreen` for forms). Data and calls unchanged.
7. **Provider sign-up form** (`OtpVerifyScreen`, provider branch): already
   keyboard-aware; restyle to dark cards, service-area chips and clear helper
   text.

Navigation: tab bar already restyled. Provider Home and Jobs/Profile hide the
native header and draw their own large titles, as on the Customer side.

## Explicitly out of scope

Any backend or API change; per-job earnings amounts; an offer countdown;
inline offer rendering in Home; light mode; iOS verification; new native
dependencies; Customer and Auth screens (done or separate).

## Verification

Typecheck (`tsc --noEmit`) per task plus on-device screenshots on the
physical Android phone, as agreed (no automated test runs for UI work).
Provider-only states that need a live job (active job, offer) are checked
as far as the same-device customer/provider swap allows, and listed as
unverified if not reached.

## Risks

- `SlideToConfirm` gesture feel on a real device — mitigated by an
  accessible tap alternative and tuning on-device.
- KYC checklist depends on the document-list response shape; the screen
  already reads it, so the checklist is derived, not new data.
- The same-device customer/provider login swap limits how much of the
  offer and active-job flow can be exercised end to end.
