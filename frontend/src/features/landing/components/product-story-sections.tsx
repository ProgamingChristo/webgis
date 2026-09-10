import Link from "next/link";

import {
  ADD_UMKM_STEPS,
  ADVERTISING_ITEMS,
  ANALYTICS_METRICS,
  COMMUTER_FEATURES,
  COMMUNITY_SIGNALS,
} from "../data/landing-content";
import { LANDING_TECHNOLOGY } from "../data/technology.data";
import { SectionShell } from "./section-shell";

const CARD =
  "rounded-[1.5rem] border border-[#464b71]/12 bg-white p-5 shadow-[0_12px_30px_rgba(70,75,113,0.055)]";
const EYEBROW =
  "text-[10px] font-black uppercase tracking-[0.17em] text-[#118ab2]";

export function FairDiscoverySection() {
  return (
    <SectionShell
      eyebrow="Penelusuran Adil"
      title="Promosi boleh terlihat. Relevansi tidak boleh dibeli."
      description="GETRA membedakan hasil biasa, pilihan lokal, dan promosi. Semua hasil tetap harus sesuai dengan lokasi, kategori, harga, jam buka, dan batas waktu berjalan."
    >
      <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <article className={`${CARD} bg-[#eef9fa]`}>
          <span className={EYEBROW}>Syarat pencarian</span>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Lokasi", "Kategori", "Harga", "Buka Sekarang", "Batas Jalan Kaki"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#118ab2]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#464b71]"
                >
                  {item}
                </span>
              ),
            )}
          </div>
          <p className="mt-5 text-sm leading-7 text-[#66708d]">
            Kesesuaian dengan pencarian selalu didahulukan. Pembayaran tidak
            menentukan urutan hasil biasa.
          </p>
        </article>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Hasil biasa", "Tempat yang sesuai dengan kebutuhan pencarian dan kondisi area."],
            ["Pilihan lokal", "Usaha lokal yang relevan meskipun belum banyak dikenal."],
            ["Promosi", "Promosi berbayar yang diberi tanda jelas dan tetap harus sesuai dengan pencarian."],
          ].map(([label, copy], index) => (
            <article
              key={label}
              className={`${CARD} ${
                index === 2 ? "border-[#d8a519]/35 bg-[#fffaf0]" : ""
              }`}
            >
              <span className={EYEBROW}>{label}</span>
              <p className="mt-4 text-sm leading-6 text-[#66708d]">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function CommuterSection() {
  return (
    <SectionShell
      eyebrow="GETRA untuk perjalanan harian"
      title="Dari stasiun menuju pilihan yang benar-benar bisa dicapai."
      description="Cari tempat yang dapat dijangkau dari stasiun atau halte berdasarkan rute, waktu berjalan, harga, dan kebutuhan Anda."
    >
      <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
        <article className={`${CARD} relative overflow-hidden bg-[#f6fbfb]`}>
          <span className="absolute -right-3 -top-6 text-7xl font-black tracking-[-0.1em] text-[#118ab2]/8">
            01
          </span>
          <span className={EYEBROW}>Bergerak lebih mudah</span>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#464b71]">
            Lihat konteks sebelum berjalan.
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#66708d]">
            Rute, akses, transportasi, dan kondisi sekitar dibaca sebagai satu
            perjalanan yang saling terhubung.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Cari tempat", "Rute pejalan kaki", "Transportasi", "Aksesibilitas"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#118ab2]/18 bg-white px-3 py-1 text-xs font-bold text-[#464b71]"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </article>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMMUTER_FEATURES.map((feature, index) => (
            <div
              key={feature}
              className="rounded-2xl border border-[#464b71]/12 bg-white p-4 text-sm font-black text-[#464b71] shadow-[0_8px_22px_rgba(70,75,113,0.04)]"
            >
              <span className="mb-3 block text-[10px] font-black text-[#118ab2]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function CommunitySection() {
  return (
    <SectionShell
      eyebrow="Komunitas GETRA"
      title="Peta yang terus belajar dari kondisi nyata."
      description="Warga dapat membagikan temuan, permintaan lokal, foto, dan informasi lokasi untuk membantu memperbarui peta bersama."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {COMMUNITY_SIGNALS.map(([title, status, meta]) => (
          <article key={title} className={CARD}>
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full bg-[#62d6c8]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#367e77]">
                {status}
              </span>
              <span className="size-2 shrink-0 rounded-full bg-[#118ab2]" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-black text-[#464b71]">{title}</h3>
            <p className="mt-2 text-sm text-[#66708d]">{meta}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-[#d8a519]/25 bg-[#fffaf0] p-4 text-sm leading-7 text-[#66708d]">
        Kontribusi warga tidak otomatis dianggap sebagai kondisi terkini. GETRA
        menampilkan waktu, sumber, dan status pemeriksaan agar informasi dapat
        dipahami dengan tepat.
      </p>
    </SectionShell>
  );
}

export function UmkmSection() {
  return (
    <SectionShell
      id="umkm"
      eyebrow="GETRA untuk UMKM"
      title="Bukan sekadar muncul di peta."
      description="GETRA membantu UMKM memahami konteks lokasi, mengelola keberadaan usaha, dan menjangkau komuter secara transparan."
    >
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className={`${CARD} overflow-hidden bg-[#f6fbfb]`}>
          <div className="flex items-center justify-between border-b border-[#464b71]/10 pb-4">
            <strong className="text-[#464b71]">GETRA UMKM</strong>
            <span className="rounded-full border border-[#62d6c8]/35 bg-white px-3 py-1 text-xs font-black text-[#367e77]">
              Pengalaman UMKM
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["Usaha Saya", "Tambah UMKM", "Promosi", "Analitik"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#464b71]/10 bg-white p-4 font-black text-[#464b71]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
        <article className={`${CARD} text-sm leading-7 text-[#66708d]`}>
          <p>
            Pengalaman UMKM membantu pemilik usaha mengakses fitur yang sesuai
            tanpa mengubah hak akses akunnya.
          </p>
          <p className="mt-4 border-t border-[#464b71]/10 pt-4">
            Kepemilikan usaha tetap diperiksa secara terpisah. Memilih
            pengalaman UMKM tidak otomatis memberikan akses untuk mengelola
            sebuah usaha.
          </p>
        </article>
      </div>
    </SectionShell>
  );
}

export function MerchantSubmissionSection() {
  return (
    <SectionShell
      eyebrow="Tambahkan UMKM ke GETRA"
      title="Daftarkan atau klaim usaha dengan proses yang jelas."
      description="Cari usaha terlebih dahulu, lengkapi informasi yang diperlukan, lalu kirim untuk diperiksa."
    >
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADD_UMKM_STEPS.map((step, index) => (
          <li key={step} className={`${CARD} min-h-32`}>
            <span className="text-xs font-black text-[#118ab2]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <strong className="mt-3 block text-sm leading-6 text-[#464b71]">
              {step}
            </strong>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-2xl border border-[#d8a519]/25 bg-[#fffaf0] p-4 text-sm text-[#66708d]">
        Pengajuan baru akan tampil sebagai usaha terverifikasi setelah selesai
        diperiksa.
      </p>
    </SectionShell>
  );
}

export function AdvertisingSection() {
  return (
    <SectionShell
      eyebrow="Kelola Promosi"
      title="Promosi yang sesuai dengan lokasi, bukan sekadar slot iklan."
      description="Siapkan materi, pilih wilayah sasaran, atur jadwal, dan pantau interaksi promosi secara transparan."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {ADVERTISING_ITEMS.map((item, index) => (
            <span key={item} className={`${CARD} flex min-h-24 items-end`}>
              <span>
                <span className="mb-2 block text-[10px] font-black text-[#118ab2]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-black text-[#464b71]">{item}</span>
              </span>
            </span>
          ))}
        </div>
        <article className={`${CARD} bg-[#f6fbfb]`}>
          <span className={EYEBROW}>Contoh ringkasan interaksi promosi</span>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ANALYTICS_METRICS.map((metric, index) => (
              <div key={metric} className="rounded-2xl border border-[#464b71]/10 bg-white p-4">
                <strong className="text-sm text-[#464b71]">{metric}</strong>
                <div className="mt-3 h-2 rounded-full bg-[#e8ecef]">
                  <div
                    className="h-2 rounded-full bg-[#118ab2]"
                    style={{ width: `${58 + index * 9}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#66708d]">
            Angka pada contoh ini hanya ilustrasi dan bukan klaim penjualan,
            keuntungan, atau transaksi.
          </p>
        </article>
      </div>
    </SectionShell>
  );
}

export function BusinessSpaceSection() {
  return (
    <SectionShell
      eyebrow="Informasi Ruang Usaha"
      title="Data lokasi menjadi lebih berarti saat bisa dipahami."
      description="Ruang Usaha membantu membaca akses, kebutuhan sekitar, dan kedekatan ke transit sebagai bahan pertimbangan awal."
    >
      <div className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
        <article className={`${CARD} bg-[#f6fbfb]`}>
          <span className={EYEBROW}>Contoh pembacaan area</span>
          <div className="mt-5 flex items-end gap-4 border-b border-[#464b71]/10 pb-5">
            <strong className="text-6xl font-black tracking-[-0.08em] text-[#118ab2]">74%</strong>
            <span className="pb-2 text-sm font-bold text-[#464b71]">
              Indeks kebutuhan belum terpenuhi di koridor komersial utama
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#66708d]">
            Kondisi area digunakan sebagai bahan pertimbangan awal, bukan
            kesimpulan akhir.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-10 items-center rounded-full text-sm font-black text-[#118ab2] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
          >
            Pelajari Analisis Wilayah GETRA →
          </Link>
        </article>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Tahap uji coba", "Pemeriksaan lokasi", "Tanpa jaminan investasi"].map(
            (item) => (
              <article key={item} className={CARD}>
                <h3 className="text-base font-black text-[#464b71]">{item}</h3>
                <p className="mt-3 text-sm leading-6 text-[#66708d]">
                  {item === "Tanpa jaminan investasi"
                    ? "GETRA tidak menjanjikan imbal hasil, okupansi, atau kelayakan investasi."
                    : "Kondisi lokasi digunakan sebagai bahan pertimbangan awal, bukan kesimpulan akhir."}
                </p>
              </article>
            ),
          )}
        </div>
      </div>
    </SectionShell>
  );
}

export function DataTrustSection() {
  return (
    <SectionShell
      eyebrow="Data yang Dapat Dipahami"
      title="Data lokasi harus memiliki sumber, waktu, status, dan riwayat."
      description="GETRA menampilkan sumber, waktu pembaruan, dan status pemeriksaan agar Anda memahami asal serta keterbatasan setiap catatan."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Sumber", "Waktu pembaruan", "Status pemeriksaan", "Riwayat data"].map(
          (item, index) => (
            <div key={item} className={`${CARD} bg-[#f6fbfb]`}>
              <span className="text-xs font-black text-[#118ab2]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong className="mt-4 block text-sm text-[#464b71]">{item}</strong>
            </div>
          ),
        )}
      </div>
    </SectionShell>
  );
}

export function TechnologySection() {
  return (
    <SectionShell
      id="teknologi"
      eyebrow="Teknologi"
      title="Teknologi GETRA menjaga perhitungan lokasi tetap akurat."
      description="Setiap bagian sistem memiliki peran yang jelas untuk peta, perhitungan rute, keamanan data, dan penjelasan informasi."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_TECHNOLOGY.map((item, index) => (
          <article key={item.name} className={CARD}>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#118ab2]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-base font-black text-[#464b71]">{item.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#66708d]">{item.role}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function FinalCtaSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#118ab2] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_8%_84%,transparent_0_22%,rgba(255,255,255,0.1)_22.4%,transparent_22.8%),radial-gradient(ellipse_at_76%_12%,transparent_0_20%,rgba(255,255,255,0.1)_20.4%,transparent_20.8%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl text-center">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
          Mulai gunakan GETRA
        </span>
        <h2 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
          Lihat kota dari perspektif yang lebih luas.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85">
          Mulai jelajahi tempat, rute, usaha lokal, dan peluang melalui GETRA
          sekarang. Tanpa batasan, ramah pejalan kaki.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-[#118ab2] shadow-[0_10px_24px_rgba(33,84,103,0.18)] transition hover:bg-[#f5fbfc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Daftar Akun
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white underline underline-offset-4 transition hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}
