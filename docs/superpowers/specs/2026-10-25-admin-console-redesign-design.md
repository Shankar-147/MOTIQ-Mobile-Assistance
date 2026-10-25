# Admin Console Redesign — Design Spec

Status: Approved (conversational design), awaiting written-spec review
Scope: `apps/web` only. `apps/mobile` is a separate sub-project, not covered here.

## Intent

The admin console (Ch137) currently works correctly (verified live in a
prior session — login, data, every page functions against the real API)
but looks unfinished: bare forms and tables with no visual identity. The
goal is a full visual and structural redesign to a "world class" bar,
not a patch — explicitly approved as a "full rethink," not a reskin.

**Audience:** internal Admin/Support staff only, not the customer-facing
product. **Success looks like:** a console that reads as a confident,
branded ops tool on first glance — specifically evoking Ramp/Mercury/
Brex-style fintech-ops products — and that surfaces live operational
urgency (SOS, dispatch backlog) everywhere, not just on one dashboard
page.

## Style direction

Light-first, Ramp/Mercury-style: generous whitespace, one confident
indigo accent (reuse the existing `#4F46E5` primary — already shared with
`apps/mobile`, keep the cross-app brand consistency established in the
prior session) plus 2–3 secondary accents for chart/category
differentiation (teal, amber, muted purple — not a full rainbow). Bigger,
bolder stat numerals (tabular figures). Real motion: hover elevation on
cards, smooth nav transitions, a subtle pulse on the status bar when a
new SOS alert arrives.

Rejected alternatives: a fully dark "terminal" console (too big a visual
departure from the mobile app's light branding; reconsider only if this
direction tests poorly) and a dense/keyboard-first power-tool style (not
what "world class" meant here per the approved direction).

## Navigation restructure

1. **Persistent status bar** — a slim strip above the page content,
   rendered in the authenticated shell layout so it's visible on every
   page, not just the dashboard. Shows live SOS alert count and dispatch-
   queue depth, color-coded by urgency (red = active SOS, amber =
   dispatch backlog, calm green/neutral = all clear). Clicking either
   metric navigates to that section. Data: fetched the same way the
   dashboard already fetches it (server-rendered on each navigation —
   this app has no client-side real-time channel; "live" means
   "current as of this page load," not a websocket push. If true
   real-time is wanted later, that's a separate, larger piece of work
   using the existing Socket.IO gateway infrastructure already built for
   `apps/mobile`'s tracking feature — explicitly out of scope here).

2. **Grouped sidebar**, replacing the current flat 8-item list:
   - **Live Ops** — SOS alerts, Dispatch queue
   - **Operations** — Providers, Verification queue, Service areas
   - **Account** — Audit log, MFA settings

3. **Dashboard becomes a real overview**: trend charts (request volume,
   SOS volume, provider growth — see Backend section) plus a recent-
   activity feed, replacing the current 4 bare stat-number cards (the
   stat cards stay, but gain trend indicators and sit above the charts).

## Backend: metrics aggregation (new scope)

The existing API only exposes point-in-time lists/counts — no
time-series data exists for charts. Per the approved decision, this gets
real backend endpoints, not client-side approximation.

**New endpoint:** `GET /admin/metrics/overview?days=30` on
`AdminController`, `@Roles(ADMIN, SUPPORT)` — same access level as the
other admin read endpoints (`listProviders`, `listAuditLog`).

**`AdminService.getMetricsOverview(days)`** assembles the response by
calling into each owning module's service — never queries another
module's Prisma models directly (ADR 0001, the same discipline already
used by `dispatchOverride`/`listAuditLog`):

- `RequestService.countRequestsByDay(days): { date: string; count: number }[]`
  — daily `ServiceRequest` creation counts, grouped by `createdAt` date.
- `SosService.countAlertsByDay(days): { date: string; count: number }[]`
  — daily `SosAlert` counts, grouped by `createdAt` date.
- `ProviderService.countProvidersByDay(days): { date: string; cumulative: number }[]`
  — cumulative count of providers with `verificationStatus =
  FULLY_VERIFIED`, bucketed by day (running total, not a daily delta —
  "growth" reads better as a cumulative curve).

Each new service method is real domain logic (a Prisma `groupBy`/date-
bucketed query) and gets a unit test, per this repo's existing testing
expectations — mirroring the style of e.g.
`provider-verification-state-machine.spec.ts`.

Response shape:

```ts
interface MetricsOverview {
  requestsByDay: { date: string; count: number }[];
  sosAlertsByDay: { date: string; count: number }[];
  providerGrowth: { date: string; cumulative: number }[];
}
```

`days` defaults to 30, validated 1–90 (DTO with `@IsOptional()
@IsInt() @Min(1) @Max(90)`), consistent with existing query-param
validation patterns on paginated list endpoints.

## Page-by-page scope

| Page | Treatment |
|---|---|
| Login | Standalone, pushed further with bolder brand treatment (already has a baseline from the prior session) |
| Dashboard | Full redesign: status-bar context, trend charts, activity feed, upgraded stat cards |
| SOS alerts | Visual pass only — same table/data/actions, bold urgency-first styling |
| Dispatch queue | Visual pass only — same cards/data/actions |
| Providers | Visual pass only — same table/data |
| Verification queue | Visual pass only |
| Service areas (+ pricing detail) | Visual pass only |
| Audit log | Visual pass only |
| MFA settings | Visual pass only |

No page's underlying functionality, data, or write actions change in
this redesign — confirmed explicitly ("full rethink" was about look and
information architecture, not about adding/removing admin capabilities).

## New components (`apps/web/src/components/ui/`)

- `StatusBar` — persistent, rendered from the `(console)` layout
- `Chart` — thin wrapper around **recharts** (new dependency — the
  standard lightweight React charting library; nothing comparable
  exists in the stack today, and this redesign is the first place
  charts are actually needed)
- `ActivityFeed` — recent cross-module event list for the dashboard
- `NavSection` — collapsible/grouped sidebar section header
- `StatCard` (existing, from the prior session) gains an optional trend
  indicator (↑/↓ + percentage)

Existing kit (`Button`, `Card`, `Badge`, `Table`, `EmptyState`, `Input`,
`NavLink`) is extended, not replaced — the palette/type-scale changes
happen at the Tailwind-token level (`tailwind.config.ts`), so existing
components inherit the new look without a rewrite.

## Testing

- **Backend:** unit tests for `countRequestsByDay`,
  `countAlertsByDay`, `countProvidersByDay`, and
  `getMetricsOverview`'s assembly, following this repo's existing
  Jest/spec-file conventions.
- **Frontend:** live browser QA (the method already used earlier this
  session — real login, real data, screenshots) across every page, at
  both desktop and narrow widths. `apps/web` has no automated UI test
  framework today; this redesign doesn't introduce one.

## Explicitly out of scope

- `apps/mobile` — separate sub-project, its own design cycle.
- True real-time push for the status bar (websocket-driven) — noted
  above as a possible future piece, not part of this redesign.
- Any change to what data admins can see/act on, auth, or business
  logic — this is presentation and information-architecture only, on
  top of the same underlying capabilities.
