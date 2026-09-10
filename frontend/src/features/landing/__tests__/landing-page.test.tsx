import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "../components/landing-page";

describe("LandingPage", () => {
  it("renders a public Figma-aligned landing page instead of the authenticated dashboard or login form", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Kota yang sama. Kebutuhan yang berbeda.");
    expect(html).toContain("Satu peta, banyak kebutuhan");
    expect(html).toContain("Dekat belum tentu mudah dicapai");
    expect(html).toContain("Kebutuhan dan usaha sering terpisah");
    expect(html).toContain("Populer belum tentu paling sesuai");
    expect(html).toContain("Data perlu terus diperbarui");
    expect(html).not.toContain("Masuk ke GETRA</h2>");
    expect(html).not.toContain("workspace-grid");
    expect(html).not.toContain("/api/admin");
    expect(html).not.toContain("/api/umkm");
  });

  it("renders the complete Phase 02 product story sections", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    [
      "Apa itu GETRA?",
      "Data menghitung. Asisten menjelaskan.",
      "Pencarian Pintar",
      "Penelusuran Adil",
      "GETRA untuk perjalanan harian",
      "Komunitas GETRA",
      "GETRA untuk UMKM",
      "Tambahkan UMKM ke GETRA",
      "Kelola Promosi",
      "Informasi Ruang Usaha",
      "Data yang Dapat Dipahami",
      "Teknologi",
      "Mulai gunakan GETRA",
      "Halaman pengenalan ini memakai data contoh",
    ].forEach((text) => expect(html).toContain(text));
  });

  it("keeps Fair Discovery, UMKM, analytics, business space, and data trust copy safe", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Hasil biasa");
    expect(html).toContain("Pilihan lokal");
    expect(html).toContain("Promosi");
    expect(html).toContain("Promosi berbayar yang diberi tanda jelas");
    expect(html).toContain("Pengalaman UMKM membantu pemilik usaha");
    expect(html).toContain("Kepemilikan usaha tetap diperiksa secara terpisah");
    expect(html).toContain("Tayangan");
    expect(html).toContain("Klik Pin Promosi");
    expect(html).toContain("Kunjungan Profil");
    expect(html).toContain("Permintaan Rute");
    expect(html).toContain("Tanpa jaminan investasi");
    expect(html).toContain("Sumber");
    expect(html).toContain("Waktu pembaruan");
    expect(html).toContain("Status pemeriksaan");
    expect(html).toContain("Riwayat data");
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("ROI");
    expect(html).not.toContain("ROAS");
    expect(html).not.toContain("Sales");
    expect(html).not.toContain("UMKM auth role");
  });
});
