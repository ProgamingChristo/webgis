const STEPS = [
  { number: "01", title: "Cari yang Anda butuhkan", body: "Cari tempat, usaha lokal, rute jalan kaki, atau area yang ingin Anda jelajahi." },
  { number: "02", title: "Pahami kondisi sekitar", body: "Lihat lokasi, rute, akses, dan aktivitas di sekitar dalam satu peta." },
  { number: "03", title: "Temukan Pilihan", body: "Bandingkan pilihan dan tentukan yang paling sesuai, mulai dari rute, usaha lokal, hingga peluang lokasi." },
] as const;

export function FigmaHowItWorksSection() {
  return <section id="cara-kerja" className="getra-figma-how-it-works" aria-labelledby="getra-how-it-works-title"><div className="getra-figma-how-it-works__container"><header><p className="getra-figma-eyebrow">CARA KERJA</p><h2 id="getra-how-it-works-title">Dari kebutuhan menjadi<br />keputusan.</h2></header><div className="getra-figma-how-it-works__steps">{STEPS.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></div></section>;
}

export function FigmaEditorialQuoteSection() {
  return <section className="getra-figma-editorial-quote" aria-label="Editorial quote"><img src="/images/landing/figma-editorial-contour.svg" alt="" aria-hidden="true" /><blockquote><span>“Kota bukan hanya kumpulan<br />tempat.<br />Kota adalah </span><em>hubungan di<br />antaranya</em><span>.&rdquo;</span></blockquote></section>;
}
