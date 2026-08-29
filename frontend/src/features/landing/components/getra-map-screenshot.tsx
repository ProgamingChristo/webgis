import Image from "next/image";

const screenshotPath =
  "/images/landing/getra-pedestrian-route-showcase.webp";

export function GetraMapScreenshot() {
  return (
    <figure className="getra-map-shot group relative min-h-[360px] overflow-hidden rounded-[2rem] border border-getra-cyan/25 bg-slate-950 shadow-2xl shadow-cyan-950/30 sm:min-h-[460px] lg:min-h-[620px]">
      <div
        className="absolute inset-0 z-10 rounded-[2rem] ring-1 ring-inset ring-white/10"
        aria-hidden="true"
      />

      <Image
        src={screenshotPath}
        alt="Foto penuh peta GETRA yang menampilkan basemap, titik lokasi, dan area layanan dalam workspace WebGIS."
        width={860}
        height={600}
        className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.012]"
        priority
        sizes="(min-width: 1024px) 52vw, 100vw"
      />

      <figcaption className="sr-only">
        GETRA WebGIS full map screenshot berasal dari frontend GETRA berjalan, memakai data fixture/test yang aman dan tidak memakai lokasi GPS pribadi.
      </figcaption>
    </figure>
  );
}
