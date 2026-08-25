"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, BarChart3, AlertTriangle } from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { apiClient } from "@/src/lib/api-client";
import { CampaignAnalyticsDTO } from "../types/campaign-analytics.types";
import { CampaignAnalyticsService } from "../services/campaign-analytics.service";
import { AnalyticsSummaryCards } from "./analytics-summary-cards";
import { AnalyticsTimeseriesChart } from "./analytics-timeseries-chart";
import { AnalyticsPlacementChart } from "./analytics-placement-chart";
import { AnalyticsFilters } from "./analytics-filters";
import { AnalyticsDisclaimer } from "./analytics-disclaimer";
import { AnalyticsEmptyState } from "./analytics-empty-state";

export function AnalyticsDashboard() {
  const { loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const urlCampaignId = searchParams.get("campaignId");

  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(urlCampaignId || "");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedPlacement, setSelectedPlacement] = useState<string | undefined>(undefined);

  const [analytics, setAnalytics] = useState<CampaignAnalyticsDTO | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load User's Campaigns
  useEffect(() => {
    async function loadCampaigns() {
      if (authLoading) return;

      try {
        setLoadingCampaigns(true);
        const merchantsRes = await apiClient.get<Array<{ id: string; name: string }>>("/api/umkm/advertising/my-merchants");
        if (Array.isArray(merchantsRes) && merchantsRes.length > 0) {
          const allCampaigns: Array<{ id: string; name: string }> = [];
          for (const m of merchantsRes) {
            try {
              const camps = await apiClient.get<Array<{ id: string; name: string }>>(`/api/umkm/advertising/campaigns?merchantId=${m.id}`);
              if (Array.isArray(camps)) {
                allCampaigns.push(...camps.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
              }
            } catch (err) {
              console.error("[AnalyticsDashboard] Error loading merchant campaigns:", err);
            }
          }

          setCampaigns(allCampaigns);

          if (allCampaigns.length > 0) {
            if (urlCampaignId && allCampaigns.some((c) => c.id === urlCampaignId)) {
              setSelectedCampaignId(urlCampaignId);
            } else {
              setSelectedCampaignId(allCampaigns[0].id);
            }
          }
        }
      } catch (err: any) {
        console.error("[AnalyticsDashboard] Error loading campaigns:", err);
      } finally {
        setLoadingCampaigns(false);
      }
    }

    loadCampaigns();
  }, [authLoading, urlCampaignId]);

  // 2. Load Analytics for Selected Campaign & Filters
  const loadAnalytics = useCallback(async () => {
    if (!selectedCampaignId) return;

    try {
      setLoadingAnalytics(true);
      setError(null);

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

      setAnalytics(data);
    } catch (err: any) {
      console.error("[AnalyticsDashboard] Error loading analytics:", err);
      setError(err.message || "Gagal memuat analitik campaign.");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [dateRange, selectedCampaignId, selectedPlacement]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/umkm"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            Kembali ke Workspace UMKM
          </Link>
        </div>
        <AnalyticsEmptyState type="NO_CAMPAIGN" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/umkm"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={13} />
              Workspace UMKM
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-blue-400">Advertising Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 size={24} className="text-blue-400" />
            Laporan Interaksi Campaign
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau efektivitas media promosi transit berdasarkan respon interaksi komuter secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        onCampaignChange={setSelectedCampaignId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedPlacement={selectedPlacement}
        onPlacementChange={setSelectedPlacement}
      />

      {/* Scope Disclaimer */}
      <AnalyticsDisclaimer />

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
