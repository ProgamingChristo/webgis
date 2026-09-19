"use client";

import { Building2, Database, LogOut, Menu, RefreshCw, ShieldCheck, Store, UsersRound, MapPinned, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { AccountMenu } from "@/src/components/profile/account-menu";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import { authenticatedFetch, clearAuthSession } from "@/src/lib/auth-client";
import { GetraLogo } from "./getra-logo";

const GLOBAL_NAV = [
  { href: "/app", label: "Peta", icon: MapPinned, experience: "GENERAL" as const },
  { href: "/umkm", label: "UMKM", icon: Store, experience: "UMKM" as const },
  { href: "/community", label: "Komunitas", icon: UsersRound, experience: "GENERAL" as const },
];

export function GetraGlobalHeader({ contextActions, utilities }: { contextActions?: ReactNode; utilities?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { context } = useAuth();
  const { setActiveExperience } = useStakeholder();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeTriggerRef = useRef<HTMLButtonElement>(null);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = context?.profile?.account_role === "ADMIN";
  const isActive = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));

  useEffect(() => {
    if (!menuOpen) return;
    const dialog = dialogRef.current;
    const trigger = menuTriggerRef.current;
    dialog?.showModal();
    closeTriggerRef.current?.focus();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      try {
        await authenticatedFetch(getGetraApiUrl("/api/auth/logout"), { method: "POST" });
      } catch {
        // The local session must still be cleared when API logout is unreachable.
      }
      await clearAuthSession();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function closeMenus() {
    setMenuOpen(false);
    setUtilityOpen(false);
  }

  function containDrawerFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]"))
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }

  return (
    <header className="getra-global-header">
      <Link className="getra-global-header__brand" href="/app" aria-label="Buka peta GETRA"><GetraLogo /></Link>
      <nav className="getra-global-nav" aria-label="Navigasi utama GETRA">
        {GLOBAL_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={`getra-global-nav__item ${active ? "getra-global-nav__item--active" : ""}`} href={item.href} key={item.href} onClick={() => setActiveExperience(item.experience)}>
              <Icon size={15} />{item.label}
            </Link>
          );
        })}
      </nav>
      {contextActions ? <div className="getra-global-header__context">{contextActions}</div> : null}
      <div className="getra-global-header__actions">
        {utilities}
        <div className="getra-utility-menu">
          <button aria-expanded={utilityOpen} className="getra-utility-menu__trigger" onClick={() => setUtilityOpen((open) => !open)} type="button">Fitur</button>
          {utilityOpen ? (
            <div className="getra-utility-menu__panel">
              <span className="getra-utility-menu__label">Transit & Komuter</span>
              <Link href="/transit" onClick={closeMenus}><MapPinned size={16} />Simpul Transit</Link>
              <Link href="/accessibility" onClick={closeMenus}><ShieldCheck size={16} />Aksesibilitas</Link>
              <Link href="/eco-walk" onClick={closeMenus}><RefreshCw size={16} />Langkah Hijau & CO2</Link>
              <Link href="/safety" onClick={closeMenus}><ShieldCheck size={16} />Peta Keamanan Malam</Link>

              <span className="getra-utility-menu__label">UMKM & Komersial</span>
              <Link href="/directory" onClick={closeMenus}><Store size={16} />Direktori UMKM</Link>
              <Link href="/deals" onClick={closeMenus}><Store size={16} />Promo Kilat UMKM</Link>
              <Link href="/culinary-trails" onClick={closeMenus}><MapPinned size={16} />Wisata Kuliner</Link>
              <Link href="/business-space" onClick={closeMenus}><Building2 size={16} />Ruang Usaha Investor</Link>
              <Link href="/umkm/insights" onClick={closeMenus}><Building2 size={16} />Wawasan Usaha</Link>

              <span className="getra-utility-menu__label">Warga & Transparansi</span>
              <Link href="/quests" onClick={closeMenus}><UsersRound size={16} />Misi Pemetaan</Link>
              <Link href="/reports/new" onClick={closeMenus}><ShieldCheck size={16} />Lapor Trotoar</Link>
              <Link href="/transparency/status" onClick={closeMenus}><RefreshCw size={16} />Status Sistem</Link>
              <Link href="/developers/open-data" onClick={closeMenus}><Database size={16} />Portal Data Terbuka</Link>

              {isAdmin ? (
                <>
                  <span className="getra-utility-menu__label">Admin & Kebijakan</span>
                  <Link href="/government/equity" onClick={closeMenus}><Building2 size={16} />Ekuitas Spasial</Link>
                  <Link href="/government/infrastructure" onClick={closeMenus}><Database size={16} />Audit Trotoar</Link>
                  <Link href="/government/closures" onClick={closeMenus}><RefreshCw size={16} />Simulasi Penutupan</Link>
                  <Link href="/admin/umkm" onClick={closeMenus}><Store size={16} />Pemeriksaan UMKM</Link>
                  <Link href="/admin/mission-data" onClick={closeMenus}><RefreshCw size={16} />Data Lapangan</Link>
                  <Link href="/admin/import" onClick={closeMenus}><Database size={16} />Impor Data</Link>
                  <Link href="/admin/community/contributions" onClick={closeMenus}><ShieldCheck size={16} />Moderasi Kontribusi</Link>
                </>
              ) : null}
              <button className="getra-utility-menu__logout" disabled={loggingOut} onClick={handleLogout} type="button">
                <LogOut size={16} />{loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          ) : null}
        </div>
        <AccountMenu context={context} loggingOut={loggingOut} onLogout={() => void handleLogout()} />
        <button ref={menuTriggerRef} aria-expanded={menuOpen} aria-label="Buka menu GETRA" className="getra-global-header__menu" onClick={() => setMenuOpen(true)} type="button"><Menu size={18} /><span>Menu</span></button>
      </div>

      {menuOpen ? (
        <dialog ref={dialogRef} className="getra-app-drawer" aria-label="Menu GETRA" onCancel={closeMenus} onKeyDown={containDrawerFocus}>
          <button className="getra-app-drawer__backdrop" onClick={closeMenus} type="button" aria-label="Tutup menu" tabIndex={-1} />
          <section className="getra-app-drawer__panel">
            <div className="getra-app-drawer__header"><GetraLogo /><button ref={closeTriggerRef} aria-label="Tutup menu" onClick={closeMenus} type="button"><X size={18} /></button></div>
            <nav className="getra-app-drawer__nav" aria-label="Navigasi utama GETRA">
              {GLOBAL_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link aria-current={active ? "page" : undefined} className={active ? "getra-app-drawer__nav-link--active" : ""} href={item.href} key={item.href} onClick={() => { setActiveExperience(item.experience); closeMenus(); }}>
                    <Icon size={17} />{item.label}
                  </Link>
                );
              })}
              <Link href="/transit" onClick={closeMenus}><MapPinned size={17} />Simpul Transit</Link>
              <Link href="/accessibility" onClick={closeMenus}><ShieldCheck size={17} />Aksesibilitas</Link>
              <Link href="/eco-walk" onClick={closeMenus}><RefreshCw size={17} />Langkah Hijau</Link>
              <Link href="/directory" onClick={closeMenus}><Store size={17} />Direktori UMKM</Link>
              <Link href="/deals" onClick={closeMenus}><Store size={17} />Promo Kilat</Link>
              <Link href="/culinary-trails" onClick={closeMenus}><MapPinned size={17} />Wisata Kuliner</Link>
              <Link href="/business-space" onClick={closeMenus}><Building2 size={17} />Ruang Usaha</Link>
              <Link href="/quests" onClick={closeMenus}><UsersRound size={17} />Misi Pemetaan</Link>
              <Link href="/reports/new" onClick={closeMenus}><ShieldCheck size={17} />Lapor Trotoar</Link>
              <Link href="/transparency/status" onClick={closeMenus}><RefreshCw size={17} />Status Sistem</Link>
              <Link href="/developers/open-data" onClick={closeMenus}><Database size={17} />Portal Data Terbuka</Link>
              {isAdmin ? (
                <>
                  <Link href="/government/equity" onClick={closeMenus}><Building2 size={17} />Ekuitas Spasial</Link>
                  <Link href="/admin/umkm" onClick={closeMenus}><Store size={17} />Pemeriksaan UMKM</Link>
                  <Link href="/admin/mission-data" onClick={closeMenus}><RefreshCw size={17} />Data Lapangan</Link>
                  <Link href="/admin/import" onClick={closeMenus}><Database size={17} />Impor Data</Link>
                  <Link href="/admin/community/contributions" onClick={closeMenus}><ShieldCheck size={17} />Moderasi Kontribusi</Link>
                </>
              ) : null}
            </nav>
            <div className="getra-app-drawer__account">
              <AccountMenu context={context} />
              <button className="getra-app-logout getra-app-drawer__logout" disabled={loggingOut} onClick={handleLogout} type="button"><LogOut size={15} />{loggingOut ? "Keluar..." : "Keluar"}</button>
            </div>
          </section>
        </dialog>
      ) : null}
    </header>
  );
}
