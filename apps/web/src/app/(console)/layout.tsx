import Link from "next/link";
import { logoutAction } from "./actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/sos", label: "SOS alerts" },
  { href: "/verifications", label: "Verification queue" },
  { href: "/providers", label: "Providers" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/audit-log", label: "Audit log" },
  { href: "/settings/mfa", label: "MFA settings" },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
        <h1 className="px-2 text-lg font-semibold">MOTIQ</h1>
        <p className="px-2 text-xs text-slate-500">Admin Console</p>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-6 px-2">
          <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
