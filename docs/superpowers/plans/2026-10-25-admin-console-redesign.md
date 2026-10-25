# Admin Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `apps/web` (the MOTIQ admin console) into a bold, Ramp/Mercury-style "live ops command center" — new visual system, a persistent cross-page status bar, grouped navigation, and a real metrics dashboard backed by new backend aggregation endpoints.

**Architecture:** Three new small backend read methods (one per owning module: Request, Sos, Provider) feed a single new `AdminService.getMetricsOverview()` aggregation, exposed as one `GET /admin/metrics/overview` endpoint (ADR 0001 — no cross-module Prisma access). The frontend extends the existing Tailwind token set and `components/ui/` kit (no rewrite) with a handful of new components (`StatusBar`, `Chart`, `ActivityFeed`, `NavSection`), then applies them: a full rebuild of the Dashboard page, and a visual-only pass (same data/actions) on every other page.

**Tech Stack:** NestJS/Prisma/PostgreSQL (`apps/api`), Next.js/TypeScript/Tailwind (`apps/web`), new dependency: `recharts` (charting).

**Spec:** `docs/superpowers/specs/2026-10-25-admin-console-redesign-design.md`

## Global Constraints

- No raw SQL anywhere in this plan — the only permitted raw SQL in the codebase is the PostGIS nearest-provider lookup (CLAUDE.md). Day-bucketing is done in application code over `findMany` results, never `$queryRaw`/`groupBy` SQL expressions.
- No module reaches into another module's Prisma models directly (ADR 0001) — `AdminService` calls the three new methods on `RequestService`/`SosService`/`ProviderService`, never queries `ServiceRequest`/`SosAlert`/`ProviderProfile` itself.
- `apps/web` talks to `apps/api` only through the versioned REST API (CLAUDE.md) — the dashboard fetches `/admin/metrics/overview`, never touches Prisma.
- Thin controllers: `AdminController`'s new route validates/parses `days`, calls one `AdminService` method, returns (CLAUDE.md).
- `gluestack-ui` stays mobile-only; `apps/web` remains Tailwind-only (CLAUDE.md) — `recharts` is a web-only, new dependency, not gluestack.
- No change to what admins can see/act on, auth, or business logic — presentation and IA only, on the same underlying capabilities (spec's explicit out-of-scope).

## Review Focus

- **`days` query param is 0, negative, non-numeric, or > 90** — must clamp to the 1–90 range (spec), never 500 or silently return unbounded data. Covered in Task 5.
- **Zero events in the requested range** (a fresh service area with no SOS alerts yet) — day-bucketing must still return one entry per day with `count: 0`, not an empty array, so a chart never silently skips dates. Covered in Task 1.
- **Provider-growth cumulative total on the first day of the range** must include providers created *before* `since`, not start from 0 (an easy off-by-baseline bug). Covered in Task 4.
- **A non-Admin/Support role calling `/admin/metrics/overview`** must get 403, same as every other admin route. Covered in Task 5.
- **`StatusBar`'s own data fetch failing** (API down, network error) must not take down every other page with it, since it's rendered from the shared `(console)` layout on every route. Covered in Task 8.

---

### Task 1: Day-bucketing utility

**Files:**
- Create: `apps/api/src/common/metrics/bucket-by-day.util.ts`
- Test: `apps/api/src/common/metrics/bucket-by-day.util.spec.ts`

**Interfaces:**
- Produces: `bucketCountsByDay(timestamps: Date[], since: Date, days: number): { date: string; count: number }[]` — one entry per day from `since` to `since + days` inclusive, UTC `YYYY-MM-DD` dates, zero-filled for days with no timestamps.
- Produces: `cumulativeCountsByDay(timestamps: Date[], since: Date, days: number, baselineCount: number): { date: string; cumulative: number }[]` — same day range, each day's `cumulative` is `baselineCount` plus every timestamp at or before that day (end-of-day, UTC).

- [ ] **Step 1: Write the failing tests**

```ts
describe("bucketCountsByDay", () => {
  it("zero-fills every day in range when given no timestamps", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const result = bucketCountsByDay([], since, 3);
    expect(result).toEqual([
      { date: "2026-01-01", count: 0 },
      { date: "2026-01-02", count: 0 },
      { date: "2026-01-03", count: 0 },
      { date: "2026-01-04", count: 0 },
    ]);
  });

  it("groups timestamps into their UTC day", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const timestamps = [
      new Date("2026-01-02T05:00:00Z"),
      new Date("2026-01-02T23:59:00Z"),
      new Date("2026-01-03T00:00:01Z"),
    ];
    const result = bucketCountsByDay(timestamps, since, 3);
    expect(result.find((r) => r.date === "2026-01-02")?.count).toBe(2);
    expect(result.find((r) => r.date === "2026-01-03")?.count).toBe(1);
  });
});

describe("cumulativeCountsByDay", () => {
  it("adds baselineCount to every day, including the first", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const result = cumulativeCountsByDay([], since, 2, 10);
    expect(result).toEqual([
      { date: "2026-01-01", cumulative: 10 },
      { date: "2026-01-02", cumulative: 10 },
      { date: "2026-01-03", cumulative: 10 },
    ]);
  });

  it("accumulates timestamps day over day", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const timestamps = [new Date("2026-01-01T12:00:00Z"), new Date("2026-01-02T12:00:00Z")];
    const result = cumulativeCountsByDay(timestamps, since, 2, 0);
    expect(result.map((r) => r.cumulative)).toEqual([1, 2, 2]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run --workspace apps/api test -- bucket-by-day`
Expected: FAIL with "Cannot find module './bucket-by-day.util'"

- [ ] **Step 3: Implement both functions in `apps/api/src/common/metrics/bucket-by-day.util.ts`**

Build the `since`-to-`since+days` inclusive date list first (UTC midnight each day), then bucket. `cumulativeCountsByDay` can reuse `bucketCountsByDay` internally and run a prefix sum starting at `baselineCount`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run --workspace apps/api test -- bucket-by-day`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/metrics/
git commit -m "feat: add day-bucketing utility for admin metrics charts"
```

---

### Task 2: RequestService.countRequestsByDay

**Files:**
- Modify: `apps/api/src/modules/request/request.service.ts`
- Test: `apps/api/src/modules/request/request.service.spec.ts` (new file)

**Interfaces:**
- Consumes: `bucketCountsByDay` from Task 1 (`../../common/metrics/bucket-by-day.util`).
- Produces: `RequestService.countRequestsByDay(days: number): Promise<{ date: string; count: number }[]>` — used by Task 5.

- [ ] **Step 1: Write the failing test**

```ts
describe("RequestService.countRequestsByDay", () => {
  it("returns one bucket per day covering the requested range", async () => {
    const prisma = {
      serviceRequest: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date("2026-01-02T10:00:00Z") }]),
      },
    };
    const service = new RequestService(prisma as never, {} as never, {} as never);

    const result = await service.countRequestsByDay(2);

    expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
      select: { createdAt: true },
    });
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run --workspace apps/api test -- request.service`
Expected: FAIL with "countRequestsByDay is not a function"

- [ ] **Step 3: Implement `countRequestsByDay(days: number): Promise<{ date: string; count: number }[]>` in `request.service.ts`**

`since = new Date(Date.now() - days * 86_400_000)`; `findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } })`; return `bucketCountsByDay(rows.map(r => r.createdAt), since, days)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run --workspace apps/api test -- request.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/request/
git commit -m "feat: add RequestService.countRequestsByDay"
```

---

### Task 3: SosService.countAlertsByDay

**Files:**
- Modify: `apps/api/src/modules/sos/sos.service.ts`
- Test: `apps/api/src/modules/sos/sos.service.spec.ts` (new file)

**Interfaces:**
- Consumes: `bucketCountsByDay` from Task 1.
- Produces: `SosService.countAlertsByDay(days: number): Promise<{ date: string; count: number }[]>` — used by Task 5.

- [ ] **Step 1: Write the failing test**

```ts
describe("SosService.countAlertsByDay", () => {
  it("returns one bucket per day covering the requested range", async () => {
    const prisma = {
      sosAlert: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date() }, { createdAt: new Date() }]),
      },
    };
    const service = new SosService(prisma as never, {} as never, {} as never);

    const result = await service.countAlertsByDay(7);

    expect(prisma.sosAlert.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
      select: { createdAt: true },
    });
    expect(result).toHaveLength(8);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run --workspace apps/api test -- sos.service`
Expected: FAIL with "countAlertsByDay is not a function"

- [ ] **Step 3: Implement `countAlertsByDay(days: number): Promise<{ date: string; count: number }[]>` in `sos.service.ts`**

Same shape as Task 2, over `prisma.sosAlert`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run --workspace apps/api test -- sos.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/sos/
git commit -m "feat: add SosService.countAlertsByDay"
```

---

### Task 4: ProviderService.countProvidersByDay

**Files:**
- Modify: `apps/api/src/modules/provider/provider.service.ts`
- Test: `apps/api/src/modules/provider/provider.service.spec.ts` (add to existing file)

**Interfaces:**
- Consumes: `cumulativeCountsByDay` from Task 1.
- Produces: `ProviderService.countProvidersByDay(days: number): Promise<{ date: string; cumulative: number }[]>` — used by Task 5. Cumulative count of `FULLY_VERIFIED` providers by `createdAt` day; the baseline (providers created before the range) is counted separately so day one isn't undercounted (Review Focus).

- [ ] **Step 1: Write the failing test**

```ts
describe("ProviderService.countProvidersByDay", () => {
  it("includes providers created before the range in the first day's baseline", async () => {
    const prisma = {
      providerProfile: {
        count: jest.fn().mockResolvedValue(5), // baseline, created before `since`
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date() }]), // one created within range
      },
    };
    const service = new ProviderService(prisma as never, {} as never);

    const result = await service.countProvidersByDay(3);

    expect(prisma.providerProfile.count).toHaveBeenCalledWith({
      where: { verificationStatus: "FULLY_VERIFIED", createdAt: { lt: expect.any(Date) } },
    });
    expect(result[0].cumulative).toBe(5);
    expect(result[result.length - 1].cumulative).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run --workspace apps/api test -- provider.service`
Expected: FAIL with "countProvidersByDay is not a function"

- [ ] **Step 3: Implement `countProvidersByDay(days: number): Promise<{ date: string; cumulative: number }[]>` in `provider.service.ts`**

`since = new Date(Date.now() - days * 86_400_000)`. `baselineCount = await prisma.providerProfile.count({ where: { verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED, createdAt: { lt: since } } })`. `rows = await prisma.providerProfile.findMany({ where: { verificationStatus: ProviderVerificationStatus.FULLY_VERIFIED, createdAt: { gte: since } }, select: { createdAt: true } })`. Return `cumulativeCountsByDay(rows.map(r => r.createdAt), since, days, baselineCount)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run --workspace apps/api test -- provider.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/provider/
git commit -m "feat: add ProviderService.countProvidersByDay"
```

---

### Task 5: GET /admin/metrics/overview endpoint

**Files:**
- Modify: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/admin/admin.controller.ts`
- Modify: `apps/api/src/modules/admin/admin.module.ts` (import `SosModule`, add `SosService` to `AdminService`'s constructor)
- Modify: `apps/api/src/modules/admin/admin.service.spec.ts` (update `buildService()` for the new constructor param)

**Interfaces:**
- Consumes: `RequestService.countRequestsByDay` (Task 2), `SosService.countAlertsByDay` (Task 3), `ProviderService.countProvidersByDay` (Task 4).
- Produces: `AdminService.getMetricsOverview(days: number): Promise<{ requestsByDay: {date:string;count:number}[]; sosAlertsByDay: {date:string;count:number}[]; providerGrowth: {date:string;cumulative:number}[] }>` and `GET /admin/metrics/overview?days=<n>` (`@Roles(ADMIN, SUPPORT)`) — the frontend's `apiFetch<MetricsOverview>("/admin/metrics/overview?days=30")` (Task 12) depends on this exact response shape.

- [ ] **Step 1: Write the failing tests**

```ts
describe("AdminService.getMetricsOverview", () => {
  it("assembles all three series by delegating to their owning services", async () => {
    const { service, requestService, sosService, providerService } = buildService();
    requestService.countRequestsByDay.mockResolvedValue([{ date: "2026-01-01", count: 2 }]);
    sosService.countAlertsByDay.mockResolvedValue([{ date: "2026-01-01", count: 0 }]);
    providerService.countProvidersByDay.mockResolvedValue([{ date: "2026-01-01", cumulative: 5 }]);

    const result = await service.getMetricsOverview(30);

    expect(requestService.countRequestsByDay).toHaveBeenCalledWith(30);
    expect(sosService.countAlertsByDay).toHaveBeenCalledWith(30);
    expect(providerService.countProvidersByDay).toHaveBeenCalledWith(30);
    expect(result).toEqual({
      requestsByDay: [{ date: "2026-01-01", count: 2 }],
      sosAlertsByDay: [{ date: "2026-01-01", count: 0 }],
      providerGrowth: [{ date: "2026-01-01", cumulative: 5 }],
    });
  });
});
```

Add `sosService: { countAlertsByDay: jest.fn() }` to `buildService()`'s mocks and to the `new AdminService(...)` call (as the 7th argument, after `identityService`); return it from `buildService()` alongside the existing returns.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run --workspace apps/api test -- admin.service`
Expected: FAIL — `getMetricsOverview is not a function` (and the constructor-arity mismatch surfaces once the mock is added)

- [ ] **Step 3: Implement**

In `admin.service.ts`: add `private readonly sosService: SosService` as the constructor's 7th parameter (import from `../sos/sos.service`); add `getMetricsOverview(days: number)` calling the three services in parallel via `Promise.all` and returning the shape above.

In `admin.controller.ts`: add
```ts
@Get("metrics/overview")
@Roles(UserRole.ADMIN, UserRole.SUPPORT)
getMetricsOverview(@Query("days") daysParam?: string) {
  const parsed = daysParam ? Number(daysParam) : 30;
  const days = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 90) : 30;
  return this.adminService.getMetricsOverview(days);
}
```
(matches this controller's existing plain-query-param style, e.g. `listAuditLog`'s `limit` clamping — no new DTO class.)

In `admin.module.ts`: add `import { SosModule } from "../sos/sos.module";` and add `SosModule` to `imports: [...]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run --workspace apps/api test -- admin.service`
Expected: PASS (both the new test and the two pre-existing ones in this file)

- [ ] **Step 5: Run the full backend suite and build**

Run: `npm run --workspace apps/api test && npm run --workspace apps/api build`
Expected: PASS / clean build

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/admin/
git commit -m "feat: add GET /admin/metrics/overview endpoint"
```

---

### Task 6: Tailwind token expansion

**Files:**
- Modify: `apps/web/tailwind.config.ts`

**Interfaces:**
- Produces: new color tokens `chart.teal`, `chart.amber`, `chart.purple` (secondary accents, per spec's "2–3 secondary accents for chart/category differentiation"), and a `transition` duration token, consumed by Task 7 (`Chart`) and the trend-indicator work in Task 11.

- [ ] **Step 1: Add the new tokens to `theme.extend` in `tailwind.config.ts`**

```ts
colors: {
  // ...existing primary/danger/success/warning/electric/surface/canvas/tint...
  chart: { teal: "#14B8A6", amber: "#F59E0B", purple: "#A855F7" },
},
```
Keep every existing token (`primary`, `danger`, `success`, `warning`, `electric`, `surface`, `canvas`, `tint`, `fontFamily`, `borderRadius`, `boxShadow`) unchanged — this task only adds `colors.chart`.

- [ ] **Step 2: Verify the dev server still boots clean**

Run: `npm run --workspace apps/web build`
Expected: `✓ Compiled successfully` and the type-check step passes (pre-existing `/404`/`/500` prerender failure from the React 18/19 monorepo split is known and unrelated — not a regression to fix here)

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat: add chart accent color tokens"
```

---

### Task 7: Chart component

**Files:**
- Modify: `apps/web/package.json` (add `recharts` dependency)
- Create: `apps/web/src/components/ui/Chart.tsx`

**Interfaces:**
- Consumes: `colors.chart.*` tokens from Task 6.
- Produces: `TrendChart({ data, series }: { data: Array<Record<string, string | number>>; series: Array<{ key: string; label: string; color: string }> })` — a responsive line chart over `data`, one `<Line>` per entry in `series`, keyed by `key` against each data point and `data`'s `date`/`cumulative` string field on the X axis. Consumed by Task 12 (Dashboard).

- [ ] **Step 1: Install recharts**

Run: `npm install recharts --workspace apps/web`

- [ ] **Step 2: Implement `TrendChart` in `Chart.tsx`**

Wrap `recharts`' `ResponsiveContainer` + `LineChart` + `XAxis dataKey="date"` + `YAxis` + `Tooltip` + one `Line` per `series` entry (`dataKey={key}`, `stroke={color}`, `name={label}`, `dot={false}`). No business logic here — purely a styled wrapper, matching this file's role as a presentation-layer component (CLAUDE.md).

- [ ] **Step 3: Smoke-test in isolation**

Create a throwaway page or use the dashboard stub from Task 12 once reached; not a standalone test file — this is a thin visual wrapper, verified by live browser QA per the spec's testing section, not unit tests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/components/ui/Chart.tsx
git commit -m "feat: add TrendChart component (recharts)"
```

---

### Task 8: StatusBar component

**Files:**
- Create: `apps/web/src/components/ui/StatusBar.tsx`
- Modify: `apps/web/src/app/(console)/layout.tsx`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api` (existing), `Badge`/`statusTone` from `@/components/ui/Badge` (existing).
- Produces: `<StatusBar />` (an async Server Component, no props) — mounted once in the `(console)` layout, above `{children}`, visible on every authenticated page.

- [ ] **Step 1: Implement `StatusBar` in `StatusBar.tsx`**

`async function StatusBar()`: fetch active SOS count (`apiFetch<{status: string}[]>("/sos/alerts")`, filter `TRIGGERED`/`ACKNOWLEDGED`, same logic as the existing Dashboard page) and dispatch-queue depth (`apiFetch<PaginatedResult<unknown>>("/admin/requests/needing-dispatch?limit=1")`, use `.pagination` count if present else `.data.length`) **inside a `try`/`catch`** — on failure, render a neutral "Status unavailable" bar instead of throwing, per the Review Focus item (a `StatusBar` fetch failure must not take down every other page, since it's in the shared layout). Render as a slim full-width strip: red background + pulse if SOS count > 0, amber if only dispatch backlog, calm neutral otherwise. Each metric links to its page (`/sos`, `/dispatch`).

- [ ] **Step 2: Mount it in the console layout**

In `apps/web/src/app/(console)/layout.tsx`, render `<StatusBar />` immediately inside `<main>`, above the `<div className="mx-auto max-w-6xl">{children}</div>` wrapper, so it spans full width above the centered page content.

- [ ] **Step 3: Verify live**

Start `apps/api` and `apps/web`, log in, confirm the strip renders on the Dashboard and on at least one other page (e.g. `/providers`) without needing to revisit `/`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/StatusBar.tsx "apps/web/src/app/(console)/layout.tsx"
git commit -m "feat: add persistent cross-page status bar"
```

---

### Task 9: Grouped sidebar navigation

**Files:**
- Create: `apps/web/src/components/ui/NavSection.tsx`
- Modify: `apps/web/src/app/(console)/layout.tsx`

**Interfaces:**
- Consumes: `NavLink` (existing, from `@/components/ui/NavLink`).
- Produces: `<NavSection title={string}>{children}</NavSection>` — a labeled group wrapper for the sidebar.

- [ ] **Step 1: Implement `NavSection` in `NavSection.tsx`**

A small uppercase/muted label (`text-xs font-semibold uppercase tracking-wide text-slate-400`) above its `children`, with consistent vertical spacing — purely presentational, no state.

- [ ] **Step 2: Restructure `NAV_ITEMS` in `(console)/layout.tsx` into three groups**

Replace the single flat array with three arrays — `LIVE_OPS_ITEMS` (SOS alerts, Dispatch queue), `OPERATIONS_ITEMS` (Providers, Verification queue, Service areas), `ACCOUNT_ITEMS` (Audit log, MFA settings) — each still `{ href, label, icon }` shaped (same as today). Render as three `<NavSection title="Live Ops">`/`"Operations"`/`"Account"` blocks, each mapping its items through the existing `<NavLink icon={<item.icon .../>} .../>` pattern unchanged. Dashboard stays a standalone top-level link above the groups (it's not "Live Ops," "Operations," or "Account" — it's the overview).

- [ ] **Step 3: Verify live**

Confirm all 8 existing routes are still reachable from the sidebar, grouped as above, with active-state highlighting (existing `NavLink` behavior) still working per group.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/NavSection.tsx "apps/web/src/app/(console)/layout.tsx"
git commit -m "feat: group sidebar navigation into Live Ops / Operations / Account"
```

---

### Task 10: ActivityFeed component

**Files:**
- Create: `apps/web/src/components/ui/ActivityFeed.tsx`

**Interfaces:**
- Consumes: `apiFetch` (existing), `Badge`/`statusTone` (existing).
- Produces: `<ActivityFeed />` (async Server Component, no props) — fetches `/admin/audit-log?limit=8` and renders a compact recent-events list. Consumed by Task 12 (Dashboard).

- [ ] **Step 1: Implement `ActivityFeed` in `ActivityFeed.tsx`**

`apiFetch<PaginatedResult<AuditLogRow>>("/admin/audit-log?limit=8")` (reuse the `AuditLogRow` shape already defined in `app/(console)/audit-log/page.tsx` — move it to a shared `@/lib/types.ts` if that avoids duplicating the interface, otherwise redeclare the same five fields locally). Render each entry as one row: actor, action (badge via `statusTone`), relative-ish timestamp (`toLocaleString()`, same as the existing Audit log page). No pagination controls — fixed to the latest 8.

- [ ] **Step 2: Verify live (once mounted in Task 12)**

Covered by Task 12's live verification step.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/ActivityFeed.tsx
git commit -m "feat: add ActivityFeed component"
```

---

### Task 11: StatCard trend indicator

**Files:**
- Modify: `apps/web/src/components/ui/StatCard.tsx`

**Interfaces:**
- Produces: `StatCard` gains an optional `trend?: { direction: "up" | "down"; percent: number }` prop — when present, renders a small ↑/↓ + `${percent}%` next to the value, green for `up` tone="default"/success-ish direction and red for `down` matching the card's existing `tone` coloring conventions. Fully backward-compatible — every existing call site (Dashboard today, before Task 12 rewrites it) keeps working unchanged since `trend` is optional.

- [ ] **Step 1: Add the `trend` prop and render it**

Extend the existing props type; when `trend` is present, render `{trend.direction === "up" ? "↑" : "↓"} {trend.percent}%` in a small `text-xs font-semibold` span, colored `text-success` for `up` / `text-danger` for `down`, placed next to the existing value `<p>`.

- [ ] **Step 2: Verify existing usages still compile**

Run: `npm run --workspace apps/web build` (type-check step) — the four existing `<StatCard>` call sites in `(console)/page.tsx` pass no `trend` prop and must still type-check.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/StatCard.tsx
git commit -m "feat: add optional trend indicator to StatCard"
```

---

### Task 12: Dashboard rebuild

**Files:**
- Modify: `apps/web/src/app/(console)/page.tsx`

**Interfaces:**
- Consumes: `GET /admin/metrics/overview` (Task 5), `TrendChart` (Task 7), `ActivityFeed` (Task 10), `StatCard` with `trend` (Task 11).

- [ ] **Step 1: Fetch the new endpoint alongside the existing dashboard data**

Add `const metrics = await apiFetch<MetricsOverview>("/admin/metrics/overview?days=30")` to the existing `Promise`-based fetch block (keep the four existing fetches — SOS alerts, pending documents, providers, service areas — the stat cards still need their live totals; `metrics` only adds the trend series). Define `MetricsOverview` matching Task 5's exact response shape, imported or declared in this file.

- [ ] **Step 2: Wire a trend indicator onto the Providers stat card**

`metrics.providerGrowth` is the only one of the three series with a natural "stat card" trend meaning (the other three cards — SOS alerts, pending KYC, service areas — are current-queue-depth/static counts, not time series, so they keep their current no-trend form). Compute `const first = metrics.providerGrowth[0].cumulative; const last = metrics.providerGrowth[metrics.providerGrowth.length - 1].cumulative; const percent = first === 0 ? 0 : Math.round(((last - first) / first) * 100);` and pass `trend={{ direction: last >= first ? "up" : "down", percent: Math.abs(percent) }}` to the existing `<StatCard label="Providers" ...>` call.

- [ ] **Step 3: Render three `TrendChart`s and the `ActivityFeed` below the existing stat-card grid**

One `TrendChart` each for `metrics.requestsByDay` (series key `count`, color `theme("colors.primary.DEFAULT")`/`#4F46E5`), `metrics.sosAlertsByDay` (`count`, `#dc2626`/danger), `metrics.providerGrowth` (`cumulative`, `#14B8A6`/`chart.teal`). Place `<ActivityFeed />` alongside or below the charts in a two-column layout on wide viewports, single column on narrow ones (existing Tailwind responsive conventions, e.g. `grid-cols-1 md:grid-cols-2`).

- [ ] **Step 4: Verify live**

Log in, load `/`, confirm: the three charts render with real data (even if flat/sparse in this dev dataset), the Providers stat card shows a trend indicator, the activity feed shows the latest audit-log entries, and the existing stat cards/SOS banner still work exactly as before.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(console)/page.tsx"
git commit -m "feat: rebuild dashboard with trend charts and activity feed"
```

---

### Task 13: Visual pass — Live Ops pages

**Files:**
- Modify: `apps/web/src/app/(console)/sos/page.tsx`
- Modify: `apps/web/src/app/(console)/sos/alert-actions.tsx`
- Modify: `apps/web/src/app/(console)/dispatch/page.tsx`
- Modify: `apps/web/src/app/(console)/dispatch/override-form.tsx`

**Interfaces:**
- No new interfaces — visual-only, same data/props/actions as today (spec: "same table/data/actions, bold urgency-first styling").

- [ ] **Step 1: Apply the expanded palette/type to both pages**

Reuse the existing `Table`/`Th`/`Td`/`Badge`/`Card`/`Button` components (already built in the prior session) — this task is about intensity, not new components: stronger urgency coloring on the SOS page's active-alert state (bolder red, maybe a left border accent on `TRIGGERED` rows), hover elevation on Dispatch's request cards (`transition-all hover:-translate-y-0.5 hover:shadow-card-hover`, matching `StatCard`'s existing hover pattern).

- [ ] **Step 2: Verify live**

Log in, visit `/sos` and `/dispatch`, confirm every existing action (Acknowledge/Resolve/False alarm, Assign provider) still works exactly as before — only appearance changed.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(console)/sos" "apps/web/src/app/(console)/dispatch"
git commit -m "style: bold visual pass on Live Ops pages (SOS, dispatch)"
```

---

### Task 14: Visual pass — Operations pages

**Files:**
- Modify: `apps/web/src/app/(console)/providers/page.tsx`
- Modify: `apps/web/src/app/(console)/verifications/page.tsx`
- Modify: `apps/web/src/app/(console)/service-areas/page.tsx`
- Modify: `apps/web/src/app/(console)/service-areas/[serviceAreaId]/page.tsx`

**Interfaces:**
- No new interfaces — visual-only.

- [ ] **Step 1: Apply the expanded palette/type to all four pages**

Same approach as Task 13 — intensity and polish on existing `Table`/`Card`/`Badge` usage, no structural changes.

- [ ] **Step 2: Verify live**

Log in, visit `/providers`, `/verifications`, `/service-areas`, and a service area's detail page; confirm all existing forms/actions (status updates, fare/commission config) still work.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(console)/providers" "apps/web/src/app/(console)/verifications" "apps/web/src/app/(console)/service-areas"
git commit -m "style: visual pass on Operations pages"
```

---

### Task 15: Visual pass — Account pages and Login

**Files:**
- Modify: `apps/web/src/app/(console)/audit-log/page.tsx`
- Modify: `apps/web/src/app/(console)/settings/mfa/page.tsx`
- Modify: `apps/web/src/app/(console)/settings/mfa/mfa-panel.tsx`
- Modify: `apps/web/src/app/login/page.tsx`

**Interfaces:**
- No new interfaces — visual-only.

- [ ] **Step 1: Apply the expanded palette/type to all four files**

Same approach as Tasks 13–14. The Login page gets the boldest treatment of the three groups (spec: "pushed further with the new bolder brand treatment") since it's the one page outside the authenticated shell/status bar.

- [ ] **Step 2: Verify live**

Visit `/login` logged out, confirm sign-in still works; log in, visit `/audit-log` and `/settings/mfa`, confirm MFA enroll/disable still works.

- [ ] **Step 3: Full-suite verification**

Run: `npm run --workspace apps/api test && npm run --workspace apps/api build && npm run --workspace apps/web build`
Expected: backend tests pass, backend build clean, frontend type-check passes (same known pre-existing `/404`/`/500` prerender issue, unrelated)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(console)/audit-log" "apps/web/src/app/(console)/settings" "apps/web/src/app/login"
git commit -m "style: visual pass on Account pages and Login"
```
