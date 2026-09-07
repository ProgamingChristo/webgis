"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { getMerchantAnalyticsCampaigns } from "../services/merchant-campaigns.service";
import { CampaignAnalyticsDTO } from "../types/campaign-analytics.types";
import { CampaignAnalyticsService } from "../services/campaign-analytics.service";
import { AnalyticsSummaryCards } from "./analytics-summary-cards";
import { AnalyticsTimeseriesChart } from "./analytics-timeseries-chart";
import { AnalyticsPlacementChart } from "./analytics-placement-chart";
import { AnalyticsFilters } from "./analytics-filters";
import { AnalyticsDisclaimer } from "./analytics-disclaimer";
import { AnalyticsEmptyState } from "./analytics-empty-state";

export function AnalyticsDashboard() {
  const { context, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const urlCampaignId = searchParams.get("campaignId");
  const merchantId = searchParams.get("merchantId");
  // Reset all filters/results when navigation changes the merchant or URL campaign.
  return <MerchantAnalyticsDashboard key={JSON.stringify([context?.user.id, merchantId, urlCampaignId])} authLoading={authLoading} merchantId={merchantId} urlCampaignId={urlCampaignId} />;
}

function MerchantAnalyticsDashboard({ authLoading, merchantId, urlCampaignId }: {
  authLoading: boolean;
  merchantId: string | null;
  urlCampaignId: string | null;
}) {
  const backHref = merchantId ? `/umkm/advertising?merchantId=${encodeURIComponent(merchantId)}` : "/umkm/advertising";

  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(urlCampaignId || "");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedPlacement, setSelectedPlacement] = useState<string | undefined>(undefined);

  const [analyticsState, setAnalyticsState] = useState<{
    key: string;
    data: CampaignAnalyticsDTO | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const analyticsKey = JSON.stringify([selectedCampaignId, dateRange, selectedPlacement]);
  const currentAnalytics = analyticsState?.key === analyticsKey ? analyticsState : null;
  const analytics = currentAnalytics?.data ?? null;
  const loadingAnalytics = Boolean(selectedCampaignId) && (!currentAnalytics || currentAnalytics.loading);
  const error = campaignsError ?? currentAnalytics?.error ?? null;

  // 1. Load User's Campaigns
  useEffect(() => {
    let cancelled = false;
    async function loadCampaigns() {
      if (authLoading) return;

      try {
        setLoadingCampaigns(true);
        const allCampaigns = await getMerchantAnalyticsCampaigns(merchantId);
        if (cancelled) return;
        setCampaigns(allCampaigns);
        setSelectedCampaignId(urlCampaignId && allCampaigns.some((campaign) => campaign.id === urlCampaignId)
          ? urlCampaignId : allCampaigns[0]?.id || "");
      } catch {
        if (!cancelled) setCampaignsError("Daftar promosi belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.");
      } finally {
        if (!cancelled) setLoadingCampaigns(false);
      }
    }

    void loadCampaigns();
    return () => { cancelled = true; };
  }, [authLoading, urlCampaignId, merchantId]);

  // 2. Load Analytics for Selected Campaign & Filters
  const loadAnalytics = useCallback(async () => {
    if (loadingCampaigns || !campaigns.some((campaign) => campaign.id === selectedCampaignId)) return;
    const version = ++requestVersion.current;

    try {
      setAnalyticsState({ key: analyticsKey, data: null, loading: true, error: null });

      let fromStr: string | undefined;
      const now = new Date();
      if (dateRange === "7d") {
        fromStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === "30d") {
        fromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const data = await CampaignAnalyticsService.getCampaignAnalytics(selectedCampaignId, {
        from: fromStr,
        to: now.toISOString(),
        placement: selectedPlacement,
      });

      if (version !== requestVersion.current) return;
      if (data.campaign.id !== selectedCampaignId || (merchantId && data.campaign.merchant_id !== merchantId)) {
        throw new Error("Data promosi tidak sesuai dengan usaha yang dipilih.");
      }
      setAnalyticsState({ key: analyticsKey, data, loading: false, error: null });
    } catch {
      if (version === requestVersion.current) {
        setAnalyticsState({ key: analyticsKey, data: null, loading: false, error: "Analitik promosi belum dapat dimuat. Gunakan Segarkan untuk mencoba lagi." });
      }
    }
  }, [analyticsKey, campaigns, dateRange, loadingCampaigns, merchantId, selectedCampaignId, selectedPlacement]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestVersion.current += 1;
    };
  }, [loadAnalytics]);

  if (authLoading || loadingCampaigns) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Memuat data analitik...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-3 sm:py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            Kembali ke Promosi
          </Link>
        </div>
        {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : <AnalyticsEmptyState type="NO_CAMPAIGN" />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-3 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <Link
          href={backHref}
          className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="shrink-0" size={13} />
          <span className="break-words">Kembali ke Promosi</span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loadingAnalytics}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Segarkan data"
          >
            <RefreshCw size={14} className={loadingAnalytics ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <AnalyticsFilters
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onCampaignChange={(id) => { if (id !== selectedCampaignId) { requestVersion.current += 1; setSelectedCampaignId(id); } }}
        dateRange={dateRange}
        onDateRangeChange={(range) => { if (range !== dateRange) { requestVersion.current += 1; setDateRange(range); } }}
        selectedPlacement={selectedPlacement}
        onPlacementChange={(placement) => { if (placement !== selectedPlacement) { requestVersion.current += 1; setSelectedPlacement(placement); } }}
      />

      {/* Scope Disclaimer */}
      <AnalyticsDisclaimer />

      {loadingAnalytics ? <p role="status" className="text-sm text-slate-400">Memuat analitik untuk pilihan ini...</p> : null}

      {error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Main Analytics Content */}
      {analytics ? (
        <>
          {/* 5 Summary Metric Cards */}
          <AnalyticsSummaryCards summary={analytics.summary} />

          {/* Timeseries Bar Chart */}
          <AnalyticsTimeseriesChart timeseries={analytics.timeseries} />

          {/* Placement Breakdown */}
          <AnalyticsPlacementChart breakdown={analytics.placement_breakdown} />
        </>
      ) : null}
    </div>
  );
}
