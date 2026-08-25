"use client";

import {
  BarChart3,
  Database,
  Home,
  LogOut,
  MapPinned,
  Megaphone,
  Menu,
  Settings,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/src/components/providers/AuthProvider";
import { AccountMenu } from "@/src/components/profile/account-menu";
import {
  authenticatedFetch,
  clearAuthSession,
} from "@/src/lib/auth-client";

import { GetraLogo } from "./getra-logo";

type AppShellTone =
  | "general"
  | "community"
  | "umkm"
  | "admin"
  | "profile";

type GetraAppShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: AppShellTone;
  actions?: ReactNode;
};

const NAV_ITEMS = [
  {
    href: "/app",
    label: "General WebGIS",
    icon: MapPinned,
  },
  {
    href: "/community",
    label: "Community",
    icon: UsersRound,
  },
  {
    href: "/umkm",
    label: "UMKM",
    icon: Store,
  },
  {
    href: "/umkm/advertising",
    label: "Advertising",
    icon: Megaphone,
  },
  {
    href: "/umkm/advertising/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/settings/profile",
    label: "Profile",
    icon: Settings,
  },
] as const;

export function GetraAppShell({
  actions,
  children,
  description,
  eyebrow = "GETRA Application",
  title,
  tone = "general",
}: GetraAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    context,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin =
    context?.profile?.account_role === "ADMIN";

  const visibleNav = useMemo(
    () =>
      isAdmin
        ? [
            ...NAV_ITEMS,
            {
              href: "/admin/import",
              label: "Admin Import",
              icon: Database,
            },
          ]
        : NAV_ITEMS,
    [isAdmin],
  );

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      try {
        await authenticatedFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
          {
            method: "POST",
          },
        );
      } catch {
        // Local session must still be cleared when API logout is unreachable.
      }

      await clearAuthSession();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <main className={`getra-app-shell getra-app-shell--${tone}`}>
      <header className="getra-app-topbar">
        <Link
          aria-label="Buka dashboard GETRA"
          className="getra-app-brand"
          href="/app"
        >
          <GetraLogo />
        </Link>

        <nav
          aria-label="Navigasi aplikasi GETRA"
          className="getra-app-nav"
        >
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/app" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`getra-app-nav__item ${active ? "getra-app-nav__item--active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="getra-app-actions">
          <AccountMenu context={context} />

          <button
            className="getra-app-logout"
            disabled={loggingOut}
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={15} />
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>

          <button
            aria-expanded={menuOpen}
            aria-label="Buka menu aplikasi"
            className="getra-app-menu-button"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu size={18} />
            Menu
          </button>
        </div>
      </header>

      <div className="getra-app-layout">
        <aside
          aria-label="Navigasi aplikasi GETRA"
          className="getra-app-rail"
        >
          <Link
            className="getra-app-rail__home"
            href="/app"
          >
            <Home size={16} />
            Workspace
          </Link>

          <div className="getra-app-rail__links">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/app" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`getra-app-rail__link ${active ? "getra-app-rail__link--active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="getra-app-main">
          {title || description ? (
            <header className="getra-app-page-header">
              <div>
                <span>{eyebrow}</span>
                {title ? <h1>{title}</h1> : null}
                {description ? <p>{description}</p> : null}
              </div>
              {actions ? (
                <div className="getra-app-page-actions">
                  {actions}
                </div>
              ) : null}
            </header>
          ) : null}

          <div className="getra-app-content">
            {children}
          </div>
        </section>
      </div>

      {menuOpen ? (
        <div
          className="getra-app-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu aplikasi GETRA"
        >
          <button
            className="getra-app-drawer__backdrop"
            onClick={() => setMenuOpen(false)}
            type="button"
            aria-label="Tutup menu"
          />
          <section className="getra-app-drawer__panel">
            <div className="getra-app-drawer__header">
              <GetraLogo />
              <button
                aria-label="Tutup menu"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="getra-app-drawer__nav">
              {visibleNav.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </section>
        </div>
      ) : null}
    </main>
  );
}
