import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("merchantId=m1&view=profile"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/src/features/umkm-intelligence/hooks/use-umkm-intelligence", () => ({
  useUmkmIntelligence: () => ({
    data: {
      merchant: {
        id: "m1",
        name: "FOUR LEAVES",
        category: "Roti & Pastry",
        address: "JALAN KYAI TAPA 8",
        longitude: 106.789,
        latitude: -6.167,
      },
      data_readiness: {
        status: "READY",
        components: [],
      },
      location_readiness: {
        status: "READY",
        components: [],
      },
      location_context: {
        nearest_transit: {
          id: "tr-1",
          name: "Stasiun Grogol",
          network_distance_meters: 250,
          network_walking_seconds: 180,
        },
      },
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/src/features/umkm-workspace/services/merchant-profile.service", () => ({
  OwnerMerchantProfileService: {
    getProfile: vi.fn().mockResolvedValue({
      id: "m1",
      name: "FOUR LEAVES",
      owner_id: "u1",
      verification_status: "VERIFIED",
      publish_status: "PUBLISHED",
      price_level: "$$",
      description: "Toko roti dan pastry segar setiap hari di koridor transit",
      opening_hours: {
        monday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
        tuesday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
        wednesday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
        thursday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
        friday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
        saturday: { is_closed: false, opens_at: "07:00", closes_at: "22:00" },
        sunday: { is_closed: true, opens_at: null, closes_at: null },
      },
      metadata: {
        category_label: "Roti & Pastry",
        phone: "081234567890",
        facilities: ["Wi-Fi Cepat", "Take Away", "QRIS / Cashless"],
        social_media: { instagram: "@fourleaves.id" },
        public_media: { storefront_url: "https://example.com/store.jpg" },
        menu_items: [
          {
            id: "menu-1",
            name: "Roti Cokelat Keju",
            price: 18000,
            description: "Roti lembut dengan isian cokelat lumer dan parutan keju gurih",
            is_available: true,
            tag: "Terlaris",
          },
        ],
      },
      address: "JALAN KYAI TAPA 8",
      location: {
        type: "Point",
        coordinates: [106.789, -6.167],
      },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    }),
    updateProfile: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

import { ProfileHeroSection } from "@/src/features/umkm-workspace/components/profile/profile-hero-section";
import { ProfileIdentityCard } from "@/src/features/umkm-workspace/components/profile/profile-identity-card";
import { ProfileOperatingHoursCard } from "@/src/features/umkm-workspace/components/profile/profile-operating-hours-card";
import { ProfileMenuCatalogCard } from "@/src/features/umkm-workspace/components/profile/profile-menu-catalog-card";
import { ProfileLocationCard } from "@/src/features/umkm-workspace/components/profile/profile-location-card";
import { ProfileFacilitiesCard } from "@/src/features/umkm-workspace/components/profile/profile-facilities-card";
import { ProfileLegalityCard } from "@/src/features/umkm-workspace/components/profile/profile-legality-card";
import { UmkmActiveWorkspace } from "@/src/features/umkm-workspace/components/umkm-active-workspace";
import type { AuthoritativeMerchantProfile } from "@/src/features/umkm-workspace/types/merchant-profile.types";
import type { UmkmWorkspaceSummary } from "@/src/features/umkm-workspace/types/umkm-workspace.types";

describe("Owner Business Profile - Target Design (IMAGE 1 Parity)", () => {
  const sampleProfile: AuthoritativeMerchantProfile = {
    id: "m1",
    name: "FOUR LEAVES",
    owner_id: "u1",
    verification_status: "VERIFIED",
    publish_status: "PUBLISHED",
    price_level: "$$",
    description: "Toko roti dan pastry segar setiap hari di koridor transit",
    opening_hours: {
      monday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
      sunday: { is_closed: true, opens_at: null, closes_at: null },
    },
    metadata: {
      category_label: "Roti & Pastry",
      phone: "081234567890",
      facilities: ["Wi-Fi Cepat", "Take Away"],
      social_media: { instagram: "@fourleaves.id" },
      public_media: { storefront_url: "https://example.com/store.jpg" },
      menu_items: [],
    },
    address: "JALAN KYAI TAPA 8",
    location: {
      type: "Point",
      coordinates: [106.789, -6.167],
    },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };

  const mockIntelligence: any = {
    data: {
      location_context: {
        nearest_transit: {
          name: "Stasiun Grogol",
          network_distance_meters: 250,
          network_walking_seconds: 180,
        },
      },
      data_readiness: {
        status: "READY",
      },
    },
    loading: false,
    error: null,
  };

  it("1. Hero Section renders verified badge, name, cover photo CTA, and truthful status metrics", () => {
    const html = renderToStaticMarkup(
      <ProfileHeroSection
        profile={sampleProfile}
        coverPhotoUrl="https://example.com/store.jpg"
        onUploadCoverPhoto={vi.fn()}
        uploadingCover={false}
        intelligence={mockIntelligence}
        campaignsCount={3}
      />
    );

    expect(html).toContain("FOUR LEAVES");
    expect(html).toContain("TERVERIFIKASI GETRA");
    expect(html).toContain("Ganti Sampul");
    expect(html).toContain("https://example.com/store.jpg");
    expect(html).toContain("Kesiapan Usaha");
    expect(html).toContain("Profil Siap");
    expect(html).toContain("Visibilitas Peta");
    expect(html).toContain("Tayang di GETRA");
    expect(html).toContain("Akses Transit");
    expect(html).toContain("250m transit");
    expect(html).toContain("Promosi Aktif");
    expect(html).toContain("3 Kampanye");
  });

  it("2. Identity Card displays official registered name and category as read-only, bio as editable with counter", () => {
    const html = renderToStaticMarkup(
      <ProfileIdentityCard
        name={sampleProfile.name}
        category="Roti & Pastry"
        description="Bio singkat gerai roti"
        onDescriptionChange={vi.fn()}
        phone="081234567890"
        onPhoneChange={vi.fn()}
        instagram="@fourleaves.id"
        onInstagramChange={vi.fn()}
      />
    );

    expect(html).toContain("Informasi Usaha &amp; Kontak");
    expect(html).toContain("Nama Usaha Resmi");
    expect(html).toContain("FOUR LEAVES");
    expect(html).toContain("Terkunci");
    expect(html).toContain("Kategori Usaha");
    expect(html).toContain("Roti &amp; Pastry");
    expect(html).toContain("Bio Tampilan Peta");
    expect(html).toContain("22 / 200 Karakter");
    expect(html).toContain("081234567890");
    expect(html).toContain("@fourleaves.id");
  });

  it("3. Operating Hours Card displays 7 days with time pickers and open/close toggles", () => {
    const html = renderToStaticMarkup(
      <ProfileOperatingHoursCard
        schedule={{
          monday: { is_closed: false, opens_at: "07:00", closes_at: "21:00" },
          sunday: { is_closed: true, opens_at: null, closes_at: null },
        }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Jadwal Operasional");
    expect(html).toContain("Senin");
    expect(html).toContain("07:00");
    expect(html).toContain("21:00");
    expect(html).toContain("Minggu");
    expect(html).toContain("Tutup");
  });

  it("4. Location Card renders address, canonical coordinates, nearest transit, and pedestrian badges", () => {
    const html = renderToStaticMarkup(
      <ProfileLocationCard
        address={sampleProfile.address}
        coordinates={sampleProfile.location!.coordinates}
        intelligence={mockIntelligence}
        merchantName={sampleProfile.name}
      />
    );

    expect(html).toContain("Lokasi &amp; Transit");
    expect(html).toContain("GPS Aktif");
    expect(html).toContain("JALAN KYAI TAPA 8");
    expect(html).toContain("250 meter dari Stasiun Grogol");
    expect(html).toContain("3 menit jalan kaki dari transit");
    expect(html).toContain("Akses Kursi Roda");
    expect(html).toContain("Trotoar Ramah Pejalan");
    expect(html).toContain("Jalur Akses Transit");
  });

  it("5. Facilities Card renders active count and 7 facility chips", () => {
    const html = renderToStaticMarkup(
      <ProfileFacilitiesCard
        facilities={["Wi-Fi Cepat", "Take Away"]}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Fasilitas Gerai");
    expect(html).toContain("2 Aktif");
    expect(html).toContain("Wi-Fi Cepat");
    expect(html).toContain("Stop Kontak Banyak");
    expect(html).toContain("Area Bebas Rokok");
    expect(html).toContain("Outdoor Seating");
    expect(html).toContain("QRIS / Cashless");
  });

  it("6. Menu Catalog Card renders truthful empty state without fabricating fake coffee/menu cards", () => {
    const html = renderToStaticMarkup(
      <ProfileMenuCatalogCard
        items={[]}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Menu Unggulan di Peta GETRA");
    expect(html).toContain("Belum ada menu yang ditampilkan");
    expect(html).toContain("Tambah Menu Sekarang");
    expect(html).not.toContain("Kopi Bundaran");
    expect(html).not.toContain("Rp 22.000");
  });

  it("7. Menu Catalog Card renders structured menu items when present", () => {
    const items = [
      {
        id: "item-1",
        name: "Roti Cokelat Keju",
        price: 18000,
        description: "Roti lembut gurih manis",
        photo_url: "https://example.com/menu.jpg",
        is_available: true,
        tag: "Terlaris",
      },
    ];

    const html = renderToStaticMarkup(
      <ProfileMenuCatalogCard
        items={items}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Roti Cokelat Keju");
    expect(html).toContain("Rp 18.000");
    expect(html).toContain("Terlaris");
    expect(html).toContain("Status Persediaan");
    expect(html).toContain("https://example.com/menu.jpg");
  });

  it("8. Legality Card displays masked registration code, partnership status, and preserves private documents", () => {
    const html = renderToStaticMarkup(
      <ProfileLegalityCard
        merchantId={sampleProfile.id}
        isVerified={true}
        submissionId="f331dd3a-f989-4214-b402-ff087d5700eb"
      />
    );

    expect(html).toContain("Legalitas &amp; Kemitraan");
    expect(html).toContain("Nomor Registrasi / ID Usaha");
    expect(html).toContain("Terdaftar Resmi");
    expect(html).toContain("Mitra Resmi Koridor Transit");
    expect(html).not.toContain("ktp");
    expect(html).not.toContain("evidence");
  });

  it("9. Multi-business workspace preserves list and opens selected merchant profile", () => {
    const summary: UmkmWorkspaceSummary = {
      verified_merchants_count: 2,
      pending_submissions_count: 0,
      active_campaigns_count: 3,
      owned_merchants: [
        {
          id: "m1",
          name: "FOUR LEAVES",
          category: "Roti",
          address: "JALAN KYAI TAPA 8",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          campaigns_count: 3,
          active_campaigns_count: 0,
        },
        {
          id: "m2",
          name: "Kopi Harapan",
          category: "Kedai Kopi",
          address: "Jl. Sudirman 10",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          campaigns_count: 0,
          active_campaigns_count: 0,
        },
      ],
      recent_submissions: [],
      recent_claims: [],
    };

    const html = renderToStaticMarkup(
      <UmkmActiveWorkspace summary={summary} state="ACTIVE_MERCHANT" />
    );

    expect(html).toContain("Kelola dan Kembangkan Usaha Anda");
    expect(html).toContain("FOUR LEAVES");
    expect(html).toContain("Kopi Harapan");
  });
});
