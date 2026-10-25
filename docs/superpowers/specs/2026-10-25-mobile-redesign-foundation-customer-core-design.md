# Mobile Redesign — Design Foundation + Customer Core Flow

Status: Approved (conversational design), awaiting written-spec review
Scope: `apps/mobile` only. This is sub-project 1+3 of five (see "Decomposition").

## Intent

The mobile app works (verified on a physical Android device: auth, home,
request history, profile) and has decent first-touch screens, but the
product looks like a generic component-library app. The goal is a
"world class" redesign in the feel of **Uber/Bolt**: map-first, bold,
high-contrast, one-handed, calm under stress — appropriate for a user
stranded on a roadside. The agreed depth is **restyle everywhere plus
rework the key customer journeys**, using the same features and the same
backend. No new backend work in this spec.

## Decisions made in brainstorming

- Style reference: Uber/Bolt.
- Palette: **A — Midnight & Signal Green**, dark only (no light mode).
- Depth: restyle + rework key flows (not restyle-only, not new features).
- Approach: **A — retheme gluestack in place** with JS-only primitives.
  Rejected: adding gesture-handler/@gorhom/bottom-sheet (new native
  dependency ⇒ dev-client rebuild, risky given earlier Android build
  trouble) and replacing gluestack (violates CLAUDE.md, rewrites ~30
  screens' primitives for no visual gain).
- First flow after the foundation: **Customer core flow**.

## Decomposition (each its own spec → plan cycle)

1. Design foundation (this spec)
2. Auth and onboarding
3. Customer core flow (this spec)
4. Provider core flow
5. Secondary screens (profiles, history, vehicle health, KYC, ratings, fleet)

## Design foundation

**Colors** (single source: `apps/mobile/src/theme/colors.ts`, mirrored into
the gluestack token set in `theme/gluestackConfig.ts`):

| Token | Value | Use |
|---|---|---|
| bg | `#0B0B0F` | screen background |
| surface | `#17171C` | cards, sheets |
| surfaceRaised | `#1F2026` | inputs, chips, nested cards |
| border | `#2A2B33` | hairlines |
| text / textSecondary / textMuted | `#FFFFFF` / `#A1A3AD` / `#6B6E7A` | text |
| accent | `#22E58B` | primary actions, "live", success only |
| accentInk | `#04210F` | text on accent |
| danger | `#FF4D4D` | SOS, destructive |
| warning | `#FFB84D` | warnings |

**Typography:** keep Sora (display, numbers, titles) and Plus Jakarta Sans
(body), already loaded in `App.tsx` and wired to gluestack's
`heading`/`body` tokens. Raise the scale: hero numerals (ETA, fare)
40–48pt Sora bold, titles 24–28pt, body 15–16pt, minimum touch target
48pt (existing `MIN_TOUCH_TARGET_SIZE` preserved).

**Shape and spacing:** CTAs are full-width, 56pt tall, radius 16. Cards
and sheets use radius 22–24, flat `surface` fill with a hairline border (no
drop shadows — they don't read on dark). 4pt spacing grid, 16–20pt page
padding.

**Motion** (Reanimated 4, already installed; every animation respects the
OS reduce-motion setting): spring-snapping sheets, press-scale on every
tappable, pulsing "live" dot and matching radar, skeleton shimmer in place
of spinners, tick animation when a hero number changes.

**Theme rollout (supersedes the earlier "scoped provider" idea):** the
app has one gluestack config, so the dark theme is applied globally.
Many un-redesigned screens hard-code light-mode tokens (`$white`,
`$textLight500`, `$borderLight200`) and hex values. To keep them readable
without touching them, the global config includes a **compatibility remap**
of those legacy light tokens to their dark equivalents. Screens outside
this spec (Auth, Provider, secondary Customer screens) therefore stay
usable but unpolished until their own sub-project. Any screen that does not
survive the remap (e.g. a hard-coded hex that is unreadable on dark) gets a
minimal mechanical fix in this spec's final task. This is the first thing
built and verified on-device, before any screen work.

**Components** (`apps/mobile/src/components/ui/`, following CLAUDE.md's
component-first rule — wrappers over gluestack, no new UI library):
restyle `Button` (primary accent, secondary surface, ghost, danger; 56pt;
press-scale), `Card`, `Chip` (selectable tiles), `Badge`, `Input` (dark
field, accent focus ring), `Avatar`, `Toggle`, `EmptyState`; replace
`LoadingScreen` usage on redesigned screens with a new `Skeleton`.
**New JS-only primitives** (no native modules): `BottomSheet` (Reanimated
shared values + RN `PanResponder`, snap points, keyboard-aware),
`MapBackdrop` (full-bleed map with safe-area floating controls),
`StepIndicator`, `StatBlock` (hero number + label).

**Navigation chrome:** map screens drop the default white native-stack
header for floating circular back/close buttons; the bottom tab bar is
dark with an accent indicator. Existing navigators and route names are
unchanged.

**Map:** `LiveTrackingMap` keeps Leaflet + OpenStreetMap in a WebView. The
dark look is a CSS filter on the tile pane (invert + hue-rotate +
brightness) so no new tile provider or API key is introduced; marker and
route styling use the accent color. (OSM's tile usage policy is already a
known production concern independent of this redesign.)

## Customer core flow (screens)

All behavior is preserved: offline request queueing, location consent
gating, WebSocket tracking, Razorpay checkout, and the persistent SOS button.

1. **Home** (`CustomerHomeScreen`): `MapBackdrop` behind a `BottomSheet`.
   The sheet shows the detected location row (GPS status) and a 3×2 grid of
   issue tiles (Tow, Flat tyre, Fuel, Battery jump, Repair, Other) with the
   last-selected vehicle chip and a "Continue" CTA; recent requests sit
   below the fold. Floating SOS top-right.
2. **Request** (`CreateRequestScreen`): a 3-step sheet (issue → vehicle and
   notes → confirm) with `StepIndicator`. The confirm step shows a summary
   and the honest line "Final fare is calculated when the job completes —
   you'll see the full breakdown before you pay." No pricing figure is
   shown: no fare-estimate endpoint exists, and `fare-config` cannot be
   used because it needs a service-area id the app no longer knows (the
   backend derives it from the pickup point). A real estimate is a backend
   follow-up, out of scope here.
3. **Matching** (`MatchingScreen`): radar pulse on the map around the
   customer's position, "Finding the nearest provider…", a step indicator,
   and a clear Cancel. Keeps the existing no-provider-found handling.
4. **Tracking** (`TrackRequestScreen`): hero ETA range from the existing
   `eta` data (`StatBlock`), green route on the dark map, provider card
   (initial avatar, business name, rating, verification badge — the data
   the screen already receives), existing `StatusTimeline` restyled as the
   step indicator, and an added **Share trip status** action (RN core
   `Share`, text only: ETA, provider name, request link text — no new
   backend or native dependency). No call button or plate number: the API
   does not expose provider phone or plate to customers.
5. **Pay** (`RequestDetailScreen` payment card + `MakePaymentScreen`): the
   payment card on Request Detail shows the total as the hero number, a
   status badge and one large Pay CTA. `MakePaymentScreen` is Razorpay's
   hosted checkout inside a WebView, so only the states around it (loading,
   confirming, failed, done) and the WebView background are restyled; the
   checkout page itself is Razorpay's. Line items are shown only if the
   payment data the screen already receives contains them.
6. **Rate** (`RateProviderScreen`) and **Request detail**
   (`RequestDetailScreen`): large tappable stars, quick tags, optional
   comment (tags are UI sugar folded into the existing comment string — no
   API change), then back to Home; detail view restyled with the same
   sheet/card language.

Also in scope: the `SosButton` restyle and the offline/connectivity banner
(slim banner using the new tokens).

## Improvements added beyond the approved mockups

- Share trip status (above) — a real safety feature at zero backend cost.
- Skeleton loading states and a consistent error/empty state across the
  redesigned screens.
- Reduce-motion support on all new animations.
- Light `Vibration` (RN core) on SOS press and request confirm.

## Explicitly out of scope

- Provider, Auth and secondary Customer screens (their own sub-projects;
  readable via the compatibility remap in the meantime).
- Any backend or API change (fare estimate, nearby-provider count, provider
  phone/plate, in-app chat, saved places).
- Light mode, iOS verification (never exercised in this project), new
  native dependencies, a new map or tile provider.

## Verification

The user has asked for no further automated test runs on this UI work.
Verification is therefore on a physical Android device (screenshots via
adb against the dev build over Metro) for every screen, plus a
`tsc --noEmit` compile check per task (seconds, not a test suite) so a type
error cannot hide behind a dev-mode render.

## Risks

- Compatibility remap edge cases (hard-coded hex on legacy screens):
  mitigated by verifying the remap first and a mechanical fix pass last.
- Hand-built `BottomSheet` gesture feel: acceptable for v1, swappable for
  @gorhom/bottom-sheet later without screen changes.
- Dark-by-CSS-filter map tiles can look slightly desaturated; acceptable,
  revisit with a proper dark tile provider at production time.
