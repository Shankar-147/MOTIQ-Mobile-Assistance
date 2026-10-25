import type { ComponentType } from "react";
import * as Lucide from "lucide-react";

/**
 * This monorepo hoists `lucide-react` to the workspace root, where it
 * resolves its own `react` types against apps/mobile's React 19 (Expo),
 * while apps/web pins its own nested React 18 (Next.js requires it). That
 * makes lucide-react's exported component types structurally incompatible
 * with any locally-typed `ReactNode`-accepting prop in this app (e.g.
 * passing an icon element from a Server Component into a Client Component).
 * Re-exporting through this local type (resolved against apps/web's own
 * `react`) is a type-only cast — same runtime component, just typed the
 * way the rest of this app expects. No alternative icon library needed.
 */
export type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

function asIcon(icon: unknown): IconComponent {
  return icon as IconComponent;
}

export const LayoutDashboard = asIcon(Lucide.LayoutDashboard);
export const Siren = asIcon(Lucide.Siren);
export const Radar = asIcon(Lucide.Radar);
export const ShieldCheck = asIcon(Lucide.ShieldCheck);
export const Users = asIcon(Lucide.Users);
export const MapPinned = asIcon(Lucide.MapPinned);
export const ScrollText = asIcon(Lucide.ScrollText);
export const KeyRound = asIcon(Lucide.KeyRound);
export const LogOut = asIcon(Lucide.LogOut);
