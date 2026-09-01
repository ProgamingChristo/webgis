"use client";

import { BarChart3, Database, Megaphone, RefreshCw, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GetraGlobalHeader } from "./getra-global-header";

type AppShellTone = "general" | "community" | "umkm" | "admin" | "profile";
type GetraAppShellProps = { children: ReactNode; eyebrow?: string; title?: string; description?: string; tone?: AppShellTone; actions?: ReactNode };

const UMKM_NAV = [
  { href: "/umkm", label: "Workspace", icon: Store, exact: true },
  { href: "/umkm#usaha-saya", label: "Usaha Saya", icon: Store, exact: false },
  { href: "/umkm/advertising", label: "Promosi", icon: Megaphone, exact: true },
  { href: "/umkm/advertising/analytics", label: "Analytics", icon: BarChart3, exact: true },
];
const ADMIN_NAV = [
  { href: "/admin/umkm", label: "Review UMKM", icon: Store },
  { href: "/admin/mission-data", label: "Mission Data", icon: RefreshCw },
  { href: "/admin/import", label: "Import Data", icon: Database },
];

export function GetraAppShell({ actions, children, description, eyebrow = "GETRA Application", title, tone = "general" }: GetraAppShellProps) {
  const pathname = usePathname();
  const contextualNav = tone === "umkm" ? UMKM_NAV : tone === "admin" ? ADMIN_NAV : [];
  return (
    <main className={`getra-app-shell getra-app-shell--${tone}`}>
      <GetraGlobalHeader />
      {contextualNav.length > 0 ? (
        <nav className="getra-context-nav" aria-label={tone === "umkm" ? "Navigasi UMKM" : "Navigasi admin"}>
          <div className="getra-context-nav__inner">
            {contextualNav.map((item) => {
              const Icon = item.icon;
              const path = item.href.split("#")[0];
              const active = item.href.includes("#") ? false : "exact" in item && item.exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
              return (
                <Link aria-current={active ? "page" : undefined} className={active ? "getra-context-nav__item--active" : ""} href={item.href} key={item.href}>
                  <Icon size={15} />{item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      <section className="getra-app-main">
        {title || description ? (
          <header className="getra-app-page-header">
            <div><span>{eyebrow}</span>{title ? <h1>{title}</h1> : null}{description ? <p>{description}</p> : null}</div>
            {actions ? <div className="getra-app-page-actions">{actions}</div> : null}
          </header>
        ) : null}
        <div className="getra-app-content">{children}</div>
      </section>
    </main>
  );
}
