import Image from "next/image";

const screenshotPath =
  "/images/landing/getra-pedestrian-route-showcase.webp";

export function GetraMapScreenshot() {
  return (
    <figure className="getra-map-shot group relative overflow-hidden rounded-[2rem] border border-getra-cyan/25 bg-slate-950 shadow-2xl shadow-cyan-950/30">
      <div className="absolute inset-0 z-10 rounded-[2rem] ring-1 ring-inset ring-white/10" />

      <Image
        src={screenshotPath}
        alt="Peta GETRA yang menampilkan rute pedestrian dari titik awal menuju merchant tujuan dalam skenario test."
        width={860}
        height={600}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.018]"
        sizes="(min-width: 1024px) 48vw, 100vw"
      />

      <div
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_48%_48%,transparent_0,transparent_35%,rgba(7,17,31,0.18)_70%)]"
        aria-hidden="true"
      />

      <div className="absolute left-4 top-4 z-30 rounded-2xl border border-white/10 bg-slate-950/82 px-4 py-3 backdrop-blur">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-getra-green">
          GETRA WebGIS
        </span>
        <strong className="mt-1 block text-sm text-white">
          Test route scenario
        </strong>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-30 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/84 p-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 backdrop-blur sm:grid-cols-3">
        <span>Start point</span>
        <span>Pedestrian route</span>
        <span>Destination</span>
      </div>

      <figcaption className="sr-only">
        Screenshot berasal dari frontend GETRA berjalan, memakai data fixture/test yang aman dan tidak memakai lokasi GPS pribadi.
      </figcaption>
    </figure>
  );
}
