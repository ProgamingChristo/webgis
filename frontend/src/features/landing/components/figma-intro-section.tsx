export function FigmaIntroSection() {
  return (
    <section id="tentang" className="getra-figma-intro" aria-labelledby="getra-intro-title">
      <p className="getra-figma-intro__watermark" aria-hidden="true">DISCOVER</p>
      <div className="getra-figma-intro__content">
        <p className="getra-figma-eyebrow">SATU PETA, BANYAK KEBUTUHAN</p>
        <h2 id="getra-intro-title" className="getra-figma-intro__title">
          <span>Kota yang sama.</span>
          <em>Kebutuhan yang berbeda.</em>
        </h2>
        <p className="getra-figma-intro__body">
          GETRA menghubungkan mobilitas, usaha lokal, dan peluang wilayah dalam satu pengalaman berbasis lokasi yang hidup dan adaptif.
        </p>
        <svg className="getra-figma-intro__route" viewBox="0 0 288 48" fill="none" aria-hidden="true">
          <path d="M24 24C48 8 72 40 96 24S144 40 168 24s48 16 72 0" stroke="#7CD5C7" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="4" fill="#118AB2" />
          <circle cx="240" cy="24" r="4" fill="#118AB2" />
        </svg>
      </div>
    </section>
  );
}
