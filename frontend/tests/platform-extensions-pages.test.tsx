import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/transit",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import {
  TransitView,
  AccessibilityView,
  EcoWalkView,
  SafetyView,
  DirectoryView,
  DealsView,
  CulinaryTrailsView,
  SuppliesView,
  GovEquityView,
  GovInfrastructureView,
  GovClosuresView,
  GovAccessibilityAuditView,
  InvestorFootTrafficView,
  InvestorTodIndexView,
  InvestorMarketGapView,
  UmkmInsightsView,
  QuestsView,
  HazardReportView,
  TransparencyStatusView,
  OpenDataView,
  calculateEcoSavings,
  TRANSIT_HUBS,
  ACCESSIBILITY_CORRIDORS,
  DIRECTORY_MERCHANTS,
  FLASH_DEALS,
  CULINARY_TRAILS,
  B2B_SUPPLIERS,
  FOOD_DESERT_AREAS,
  SIDEWALK_ASSET_SEGMENTS,
  ROAD_CLOSURE_SCENARIOS,
  INCLUSIVITY_METRICS,
  FOOT_TRAFFIC_DATA,
  TOD_STATIONS,
  MARKET_GAP_ITEMS,
  SAMPLE_MERCHANT_INSIGHT,
  COMMUNITY_QUESTS,
  INITIAL_HAZARD_REPORTS,
  SYSTEM_SERVICES,
  OPEN_GEO_DATASETS,
} from "@/src/features/platform-extensions";

import TransitPage from "@/app/transit/page";
import AccessibilityPage from "@/app/accessibility/page";
import EcoWalkPage from "@/app/eco-walk/page";
import SafetyPage from "@/app/safety/page";
import DirectoryPage from "@/app/directory/page";
import DealsPage from "@/app/deals/page";
import CulinaryTrailsPage from "@/app/culinary-trails/page";
import SuppliesPage from "@/app/umkm/supplies/page";
import GovEquityPage from "@/app/government/equity/page";
import GovInfrastructurePage from "@/app/government/infrastructure/page";
import GovClosuresPage from "@/app/government/closures/page";
import GovAccessibilityAuditPage from "@/app/government/accessibility-audit/page";
import InvestorFootTrafficPage from "@/app/investor/foot-traffic/page";
import InvestorTodIndexPage from "@/app/investor/tod-index/page";
import InvestorMarketGapPage from "@/app/investor/market-gap/page";
import UmkmInsightsPage from "@/app/umkm/insights/page";
import QuestsPage from "@/app/quests/page";
import NewReportPage from "@/app/reports/new/page";
import TransparencyStatusPage from "@/app/transparency/status/page";
import OpenDataPage from "@/app/developers/open-data/page";

describe("20 New Features and 20 New Pages Test Suite", () => {
  // Feature 1 & Page 1: Transit Hubs
  describe("Feature 1 & Page 1: Transit Hubs (/transit)", () => {
    it("renders transit hubs and walkshed merchant connections", () => {
      const html = renderToStaticMarkup(<TransitView />);
      expect(html).toContain("Hub Transit &amp; Interkoneksi UMKM Pejalan Kaki");
      expect(html).toContain("Dukuh Atas");
      expect(html).toContain("Radius Tangkapan");
      expect(TRANSIT_HUBS.length).toBeGreaterThanOrEqual(4);
    });

    it("renders /transit App Shell page with correct metadata title and content", () => {
      const pageHtml = renderToStaticMarkup(<TransitPage />);
      expect(pageHtml).toContain("Simpul Antarmoda &amp; Kawasan Transit");
      expect(pageHtml).toContain("Kawasan Berorientasi Transit (TOD) Dukuh Atas");
    });
  });

  // Feature 2 & Page 2: Accessibility Guide
  describe("Feature 2 & Page 2: Accessibility Guide (/accessibility)", () => {
    it("evaluates wheelchair and universal mobility corridors", () => {
      const html = renderToStaticMarkup(<AccessibilityView />);
      expect(html).toContain("Panduan Aksesibilitas Pejalan Kaki &amp; Ramah Kursi Roda");
      expect(html).toContain("Koridor Sudirman - M.H. Thamrin");
      expect(html).toContain("Permen PUPR");
      expect(ACCESSIBILITY_CORRIDORS.length).toBeGreaterThanOrEqual(4);
    });

    it("renders /accessibility App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<AccessibilityPage />);
      expect(pageHtml).toContain("Panduan Aksesibilitas &amp; Ramah Kursi Roda");
    });
  });

  // Feature 3 & Page 3: Eco Walk & Carbon Offset
  describe("Feature 3 & Page 3: Eco Walk (/eco-walk)", () => {
    it("accurately calculates carbon savings and burned calories", () => {
      const calc1km = calculateEcoSavings(1000);
      expect(calc1km.distanceKm).toBe(1);
      expect(calc1km.co2VsCarGrams).toBe(192);
      expect(calc1km.co2VsMotorGrams).toBe(103);
      expect(calc1km.caloriesBurnedKcal).toBe(55);
      expect(calc1km.stepsCount).toBe(1350);
    });

    it("renders eco-walk interactive simulator and presets", () => {
      const html = renderToStaticMarkup(<EcoWalkView />);
      expect(html).toContain("Kalkulator Langkah Hijau &amp; Jejak Karbon");
      expect(html).toContain("Emisi Terhindar vs Mobil");
      expect(html).toContain("Emisi Terhindar vs Motor");
      expect(html).toContain("Kalori Terbakar");
    });

    it("renders /eco-walk App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<EcoWalkPage />);
      expect(pageHtml).toContain("Langkah Hijau &amp; Pengurangan Emisi Karbon");
    });
  });

  // Feature 4 & Page 4: Safety Corridors
  describe("Feature 4 & Page 4: Safety Corridors (/safety)", () => {
    it("renders pedestrian night walkability scores and lighting index", () => {
      const html = renderToStaticMarkup(<SafetyView />);
      expect(html).toContain("Peta Keamanan Pejalan Kaki &amp; Jalur Malam Jakarta");
      expect(html).toContain("Indeks Pencahayaan");
      expect(html).toContain("Aktivitas Usaha / Eyes on Street");
    });

    it("renders /safety App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<SafetyPage />);
      expect(pageHtml).toContain("Peta Keamanan Pejalan Kaki &amp; Rute Malam");
    });
  });

  // Feature 5 & Page 5: UMKM Directory
  describe("Feature 5 & Page 5: UMKM Directory (/directory)", () => {
    it("renders verified merchant directory with search and category filters", () => {
      const html = renderToStaticMarkup(<DirectoryView />);
      expect(html).toContain("Direktori UMKM &amp; Pedagang Lokal Terverifikasi");
      expect(html).toContain("Semua Kategori");
      expect(html).toContain("Soto Betawi H. Ma&#x27;ruf Galunggung");
      expect(DIRECTORY_MERCHANTS.length).toBeGreaterThanOrEqual(5);
    });

    it("renders /directory App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<DirectoryPage />);
      expect(pageHtml).toContain("Direktori &amp; Katalog UMKM Terverifikasi");
    });
  });

  // Feature 6 & Page 6: Flash Deals
  describe("Feature 6 & Page 6: Flash Deals (/deals)", () => {
    it("renders commuter discount vouchers and flash promotions", () => {
      const html = renderToStaticMarkup(<DealsView />);
      expect(html).toContain("Voucher &amp; Penawaran Spesial UMKM Dekat Transit");
      expect(html).toContain("KOMUTERPAGI");
      expect(html).toContain("Flash Deal");
      expect(FLASH_DEALS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /deals App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<DealsPage />);
      expect(pageHtml).toContain("Promo Kilat &amp; Diskon Usaha Lokal");
    });
  });

  // Feature 7 & Page 7: Culinary Trails
  describe("Feature 7 & Page 7: Culinary Trails (/culinary-trails)", () => {
    it("renders curated walking gastronomy trails with step-by-step stops", () => {
      const html = renderToStaticMarkup(<CulinaryTrailsView />);
      expect(html).toContain("Rute Wisata Kuliner Pejalan Kaki Jakarta");
      expect(html).toContain("Jejak Rasa Bersejarah Sabang");
      expect(html).toContain("Pemberhentian Terjadwal");
      expect(CULINARY_TRAILS.length).toBeGreaterThanOrEqual(2);
    });

    it("renders /culinary-trails App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<CulinaryTrailsPage />);
      expect(pageHtml).toContain("Rute Wisata Kuliner Pejalan Kaki");
    });
  });

  // Feature 8 & Page 8: B2B Supplies
  describe("Feature 8 & Page 8: B2B Supplies (/umkm/supplies)", () => {
    it("renders local wholesale markets and supply chain proximity", () => {
      const html = renderToStaticMarkup(<SuppliesView />);
      expect(html).toContain("Bursa Bahan Baku &amp; Pemasok Grosir Lokal UMKM");
      expect(html).toContain("Pasar Grosir Tanah Abang");
      expect(html).toContain("Pengiriman Nol Emisi");
      expect(B2B_SUPPLIERS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /umkm/supplies App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<SuppliesPage />);
      expect(pageHtml).toContain("Bursa Pemasok &amp; Sentra Grosir Bahan Baku");
    });
  });

  // Feature 9 & Page 9: Gov Spatial Equity
  describe("Feature 9 & Page 9: Spatial Equity (/government/equity)", () => {
    it("renders food desert isochrone catchment ratios across subdistricts", () => {
      const html = renderToStaticMarkup(<GovEquityView />);
      expect(html).toContain("Dasbor Ekuitas Spasial &amp; Aksesibilitas Kebutuhan Pangan");
      expect(html).toContain("Kelurahan Karet Tengsin");
      expect(html).toContain("Terjangkau 400m");
      expect(FOOD_DESERT_AREAS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /government/equity App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<GovEquityPage />);
      expect(pageHtml).toContain("Dasbor Ekuitas Spasial &amp; Aksesibilitas Pangan");
    });
  });

  // Feature 10 & Page 10: Gov Infrastructure
  describe("Feature 10 & Page 10: Infrastructure Asset Audit (/government/infrastructure)", () => {
    it("renders sidewalk segment inventory and surface condition statistics", () => {
      const html = renderToStaticMarkup(<GovInfrastructureView />);
      expect(html).toContain("Audit Aset Pedestrian &amp; Kondisi Trotoar Kota");
      expect(html).toContain("Jl. M.H. Thamrin Sisi Timur");
      expect(html).toContain("Kondisi Baik");
      expect(SIDEWALK_ASSET_SEGMENTS.length).toBeGreaterThanOrEqual(4);
    });

    it("renders /government/infrastructure App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<GovInfrastructurePage />);
      expect(pageHtml).toContain("Audit Aset Pedestrian &amp; Kondisi Trotoar");
    });
  });

  // Feature 11 & Page 11: Gov Road Closures
  describe("Feature 11 & Page 11: Road Closures & Event Impact (/government/closures)", () => {
    it("simulates pedestrian detour and merchant footfall redistribution", () => {
      const html = renderToStaticMarkup(<GovClosuresView />);
      expect(html).toContain("Simulator Dampak Penutupan Jalan &amp; Rekayasa Lalin");
      expect(html).toContain("Hari Bebas Kendaraan Bermotor (Car-Free Day Jakarta)");
      expect(html).toContain("Dampak Kunjungan UMKM");
      expect(ROAD_CLOSURE_SCENARIOS.length).toBeGreaterThanOrEqual(2);
    });

    it("renders /government/closures App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<GovClosuresPage />);
      expect(pageHtml).toContain("Simulator Dampak Penutupan Jalan &amp; CFD");
    });
  });

  // Feature 12 & Page 12: Gov Accessibility Audit
  describe("Feature 12 & Page 12: Accessibility Audit (/government/accessibility-audit)", () => {
    it("renders Permen PUPR 14/2017 inclusivity metrics and compliance scores", () => {
      const html = renderToStaticMarkup(<GovAccessibilityAuditView />);
      expect(html).toContain("Audit Inklusivitas Ruang Publik &amp; Desain Universal");
      expect(html).toContain("Kemiringan Ramp Trotoar");
      expect(html).toContain("Indeks Inklusivitas Rata-rata");
      expect(INCLUSIVITY_METRICS.length).toBeGreaterThanOrEqual(4);
    });

    it("renders /government/accessibility-audit App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<GovAccessibilityAuditPage />);
      expect(pageHtml).toContain("Audit Inklusivitas Ruang Publik &amp; Aksesibilitas");
    });
  });

  // Feature 13 & Page 13: Investor Foot Traffic
  describe("Feature 13 & Page 13: Foot Traffic Intelligence (/investor/foot-traffic)", () => {
    it("renders hourly pedestrian volume distribution curves for commercial corridors", () => {
      const html = renderToStaticMarkup(<InvestorFootTrafficView />);
      expect(html).toContain("Inteligensi Kepadatan &amp; Arus Pejalan Kaki (Footfall)");
      expect(html).toContain("Kawasan Transit Dukuh Atas");
      expect(html).toContain("pejalan kaki/jam");
      expect(FOOT_TRAFFIC_DATA.length).toBeGreaterThanOrEqual(5);
    });

    it("renders /investor/foot-traffic App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<InvestorFootTrafficPage />);
      expect(pageHtml).toContain("Kepadatan &amp; Arus Pejalan Kaki (Footfall)");
    });
  });

  // Feature 14 & Page 14: Investor TOD Index
  describe("Feature 14 & Page 14: TOD Opportunity Index (/investor/tod-index)", () => {
    it("ranks transit stations by commercial attractiveness and pedestrian accessibility", () => {
      const html = renderToStaticMarkup(<InvestorTodIndexView />);
      expect(html).toContain("Indeks Peluang Investasi Kawasan Berorientasi Transit");
      expect(html).toContain("Dukuh Atas TOD Intermodal");
      expect(html).toContain("Skor TOD / 100");
      expect(TOD_STATIONS.length).toBeGreaterThanOrEqual(4);
    });

    it("renders /investor/tod-index App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<InvestorTodIndexPage />);
      expect(pageHtml).toContain("Indeks Peluang Komersial Kawasan TOD");
    });
  });

  // Feature 15 & Page 15: Investor Market Gap
  describe("Feature 15 & Page 15: Market Gap Analysis (/investor/market-gap)", () => {
    it("identifies underserved retail categories within station walksheds", () => {
      const html = renderToStaticMarkup(<InvestorMarketGapView />);
      expect(html).toContain("Peluang Ritel &amp; Kategori Belum Terlayani di Sekitar Transit");
      expect(html).toContain("Sarapan Cepat &amp; Sehat");
      expect(html).toContain("Skor Kelayakan / 100");
      expect(MARKET_GAP_ITEMS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /investor/market-gap App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<InvestorMarketGapPage />);
      expect(pageHtml).toContain("Celah Pasar Ritel &amp; Sektor Belum Terlayani");
    });
  });

  // Feature 16 & Page 16: UMKM Insights
  describe("Feature 16 & Page 16: UMKM Insights (/umkm/insights)", () => {
    it("renders merchant catchment analytics, peak hours, and growth advice", () => {
      const html = renderToStaticMarkup(<UmkmInsightsView />);
      expect(html).toContain("Dasbor Inteligensi Operasional &amp; Keramaian Pejalan Kaki");
      expect(html).toContain("Potensi Pejalan Kaki / Minggu");
      expect(html).toContain("Rekomendasi Pertumbuhan Omset");
      expect(SAMPLE_MERCHANT_INSIGHT.weeklyCatchmentPedestrians).toBeGreaterThan(1000);
    });

    it("renders /umkm/insights App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<UmkmInsightsPage />);
      expect(pageHtml).toContain("Wawasan Operasional &amp; Keramaian Pejalan Kaki");
    });
  });

  // Feature 17 & Page 17: Community Quests
  describe("Feature 17 & Page 17: Community Quests (/quests)", () => {
    it("renders citizen science mapping challenges, XP, and badge unlocks", () => {
      const html = renderToStaticMarkup(<QuestsView />);
      expect(html).toContain("Tantangan Pemetaan Komunitas &amp; Reputasi Warga");
      expect(html).toContain("Audit Jalur Kursi Roda Dukuh Atas");
      expect(html).toContain("Pahlawan Aksesibilitas");
      expect(COMMUNITY_QUESTS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /quests App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<QuestsPage />);
      expect(pageHtml).toContain("Tantangan Pemetaan Warga &amp; Misi Komunitas");
    });
  });

  // Feature 18 & Page 18: Hazard Reporter
  describe("Feature 18 & Page 18: Hazard Reporter (/reports/new)", () => {
    it("renders geotagged hazard reporting wizard and live reports feed", () => {
      const html = renderToStaticMarkup(<HazardReportView />);
      expect(html).toContain("Lapor Hambatan Trotoar &amp; Fasilitas Pejalan Kaki");
      expect(html).toContain("Formulir Laporan Baru");
      expect(html).toContain("Guiding Block Terputus");
      expect(INITIAL_HAZARD_REPORTS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /reports/new App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<NewReportPage />);
      expect(pageHtml).toContain("Laporkan Kendala Jalur Pejalan Kaki");
    });
  });

  // Feature 19 & Page 19: System Status
  describe("Feature 19 & Page 19: System Status (/transparency/status)", () => {
    it("renders real-time operational uptime and latency for core engines", () => {
      const html = renderToStaticMarkup(<TransparencyStatusView />);
      expect(html).toContain("Status Sistem &amp; Ketersediaan Layanan GETRA");
      expect(html).toContain("PostGIS Spatial Engine");
      expect(html).toContain("Valhalla Pedestrian Routing Gateway");
      expect(html).toContain("99.96%");
      expect(SYSTEM_SERVICES.length).toBeGreaterThanOrEqual(5);
    });

    it("renders /transparency/status App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<TransparencyStatusPage />);
      expect(pageHtml).toContain("Status Sistem &amp; Keandalan Layanan");
    });
  });

  // Feature 20 & Page 20: Open GIS Data
  describe("Feature 20 & Page 20: Open GIS Data (/developers/open-data)", () => {
    it("renders open spatial datasets catalog, schema attributes, and API snippets", () => {
      const html = renderToStaticMarkup(<OpenDataView />);
      expect(html).toContain("Portal Data Terbuka GIS &amp; Pengembang");
      expect(html).toContain("Jaringan Jalur Pejalan Kaki Jakarta Pusat &amp; TOD");
      expect(html).toContain("curl -X GET");
      expect(OPEN_GEO_DATASETS.length).toBeGreaterThanOrEqual(3);
    });

    it("renders /developers/open-data App Shell page", () => {
      const pageHtml = renderToStaticMarkup(<OpenDataPage />);
      expect(pageHtml).toContain("Portal Data Terbuka GIS &amp; Dokumentasi API");
    });
  });
});
