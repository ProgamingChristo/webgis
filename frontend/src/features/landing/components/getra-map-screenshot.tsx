import { LandingMapArtwork } from "./landing-map-artwork";

/**
 * Kept under the original component name to avoid changing landing section
 * contracts, but it is now an onboarding-map illustration rather than a UI
 * screenshot.
 */
export function GetraMapScreenshot() {
  return (
    <figure
      className="getra-map-shot getra-map-preview group relative min-h-[300px] overflow-hidden rounded-[1.75rem] border border-[#464b71]/12 bg-[#e9f5f6] shadow-[0_20px_48px_rgba(70,75,113,0.12)] sm:min-h-[420px]"
      aria-label="Peta onboarding GETRA yang menampilkan transit, rute berjalan kaki, dan usaha lokal"
    >
      <LandingMapArtwork className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.012]" />
      <div className="absolute left-5 top-5 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(70,75,113,0.1)] backdrop-blur">
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2]">
          Peta onboarding
        </span>
        <strong className="mt-1 block text-sm text-[#464b71]">
          Akses dibaca bersama
        </strong>
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/70"
        aria-hidden="true"
      />
      <figcaption className="sr-only">
        Contoh peta GETRA menggunakan data ilustrasi dan tidak memakai lokasi pribadi.
      </figcaption>
    </figure>
  );
}
