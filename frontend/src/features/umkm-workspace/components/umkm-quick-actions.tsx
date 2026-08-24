"use client";

import React from "react";
import Link from "next/link";
import { Plus, Megaphone, BarChart3, ArrowRight } from "lucide-react";

export function UmkmQuickActions() {
  const actions = [
    {
      title: "Tambah UMKM ke GETRA",
      description: "Daftarkan usaha baru Anda untuk masuk katalog dan ekosistem analitik transit.",
      icon: Plus,
      href: "/umkm/merchants/new",
      badge: "Onboarding",
      badgeColor: "bg-emerald-950/80 border-emerald-500/30 text-emerald-300",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Advertising & Promosi",
      description: "Kelola campaign Sponsored Pin, Promo Banner, dan Profile Poster untuk merchant Anda.",
      icon: Megaphone,
      href: "/umkm/advertising",
      badge: "Promosi",
      badgeColor: "bg-blue-950/80 border-blue-500/30 text-blue-300",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      title: "Campaign Analytics",
      description: "Pantau performa interaksi (Impressions, Pin Clicks, Profile Opens, Route Requests).",
      icon: BarChart3,
      href: "/umkm/advertising/analytics",
      badge: "Performa",
      badgeColor: "bg-amber-950/80 border-amber-500/30 text-amber-300",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.title}
            href={act.href}
            className="p-5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${act.iconBg}`}>
                  <Icon size={20} />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${act.badgeColor}`}>
                  {act.badge}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                {act.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {act.description}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 group-hover:text-blue-300 font-semibold mt-4 pt-3 border-t border-slate-700/40">
              <span>Buka Menu</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
