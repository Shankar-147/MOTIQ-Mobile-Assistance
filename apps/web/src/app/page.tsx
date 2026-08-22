export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">MOTIQ Admin & Operations Console</h1>
      <p className="mt-2 text-slate-600">
        Bootstrap-phase placeholder. Scope: provider-verification review, manual dispatch override,
        and service-area/commission configuration (Ch137, Ch61). See{" "}
        <code className="rounded bg-slate-200 px-1">docs/decisions/0008-*.md</code> for why this is a
        separate app from the customer/provider mobile apps.
      </p>
    </main>
  );
}
