"use client";

import { ChevronDown, ChevronsLeft, LocateFixed, Route, Search } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarMode = "search" | "route";

export function CommuterSidebar({ mode, onModeChange, onCollapse, route, destination, children }: {
  mode: SidebarMode;
  onModeChange: (mode: SidebarMode) => void;
  onCollapse: () => void;
  route: ReactNode;
  destination?: string;
  children: ReactNode;
}) {
  return <aside className="left-panel panel commuter-sidebar" aria-label="Kontrol pencarian dan rute">
    <header className="commuter-sidebar__header">
      <div className="commuter-brand"><span><LocateFixed size={25} /></span><div><strong>GETRA</strong><small>Peta Cerdas Kota</small></div></div>
      <button type="button" className="commuter-icon" onClick={onCollapse} aria-label="Tutup panel, tampilkan peta"><ChevronsLeft size={20} /></button>
      <nav className="commuter-tabs" aria-label="Mode sidebar">
        <button type="button" aria-pressed={mode === "search"} onClick={() => onModeChange("search")}><Search size={18} />Cari</button>
        <button type="button" aria-pressed={mode === "route"} onClick={() => onModeChange("route")}><Route size={18} />Rute</button>
      </nav>
    </header>
    <div className="commuter-sidebar__body">
      <div hidden={mode !== "route"}>{route}</div>
      <div hidden={mode !== "search"}>
        {children}
        <button className="commuter-route-summary" type="button" onClick={() => onModeChange("route")}>
          <Route size={22} /><span><strong>Rute Perjalanan</strong><small>{destination ? `Tujuan: ${destination}` : "Pilih asal dan tujuan untuk memulai"}</small></span><ChevronDown size={17} />
        </button>
      </div>
    </div>
  </aside>;
}
