"use client";

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// `icon` is already a rendered element (<LayoutDashboard size={18} />), not
// a component reference — a Server Component parent can't pass a component
// function across the Server/Client boundary, only a serializable element.
export function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary-50 text-primary" : "text-slate-600 hover:bg-primary-50 hover:text-primary",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
