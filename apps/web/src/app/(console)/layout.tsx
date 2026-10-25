import {
  LayoutDashboard,
  Siren,
  Radar,
  ShieldCheck,
  Users,
  MapPinned,
  ScrollText,
  KeyRound,
  LogOut,
} from "@/lib/icons";
import { logoutAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { NavLink } from "@/components/ui/NavLink";
import { NavSection } from "@/components/ui/NavSection";
import { StatusBar } from "@/components/ui/StatusBar";

const LIVE_OPS_ITEMS = [
  { href: "/sos", label: "SOS alerts", icon: Siren },
  { href: "/dispatch", label: "Dispatch queue", icon: Radar },
];
const OPERATIONS_ITEMS = [
  { href: "/providers", label: "Providers", icon: Users },
  { href: "/verifications", label: "Verification queue", icon: ShieldCheck },
  { href: "/service-areas", label: "Service areas", icon: MapPinned },
];
const ACCOUNT_ITEMS = [
  { href: "/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/settings/mfa", label: "MFA settings", icon: KeyRound },
];

function renderLinks(items: typeof LIVE_OPS_ITEMS) {
  return items.map((item) => {
    const Icon = item.icon;
    return <NavLink key={item.href} href={item.href} label={item.label} icon={<Icon size={18} strokeWidth={2} />} />;
  });
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-surface px-4 py-6">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-white">
            M
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight text-slate-900">MOTIQ</p>
            <p className="text-xs text-slate-400">Admin Console</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-5">
          <NavLink href="/" label="Dashboard" icon={<LayoutDashboard size={18} strokeWidth={2} />} />
          <NavSection title="Live Ops">{renderLinks(LIVE_OPS_ITEMS)}</NavSection>
          <NavSection title="Operations">{renderLinks(OPERATIONS_ITEMS)}</NavSection>
          <NavSection title="Account">{renderLinks(ACCOUNT_ITEMS)}</NavSection>
        </nav>

        <form action={logoutAction} className="px-1">
          <Button type="submit" variant="ghost" className="w-full justify-start px-3">
            <LogOut size={18} strokeWidth={2} />
            Sign out
          </Button>
        </form>
      </aside>
      <main className="flex-1 bg-canvas">
        <StatusBar />
        <div className="mx-auto max-w-6xl px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
