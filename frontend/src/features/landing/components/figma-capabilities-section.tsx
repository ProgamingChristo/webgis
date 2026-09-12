const CARDS = [
  { badge: "01 • DISCOVER", label: "Rekomendasi yang Lebih Relevan", title: "Smart Search & Recommendation", body: "Temukan tempat yang sesuai kebutuhan dan mudah dijangkau, bukan sekadar yang paling populer.", kind: "search" },
  { badge: "02 • MOVE", label: "Ramah Pejalan Kaki", title: "Pedestrian Routing & Service Area", body: "Lihat rute jalan kaki dan kondisi akses sepanjang perjalanan sebelum berangkat.", kind: "route" },
  { badge: "03 • GROW", label: "Visibilitas Usaha", title: "UMKM Profile & Demand Gap", body: "Bantu usaha lebih mudah ditemukan dan lihat kebutuhan yang masih belum tersedia di sekitar.", kind: "grow" },
  { badge: "04 • UNDERSTAND", label: "Insight Kawasan", title: "Business Space Intelligence & Community", body: "Lihat informasi kawasan dan masukan warga dalam satu tempat untuk memahami kondisi sekitar dengan lebih jelas.", kind: "understand" },
] as const;

function CardPreview({ kind }: { kind: (typeof CARDS)[number]["kind"] }) {
  if (kind === "search") return <div className="getra-figma-capability-preview getra-figma-search-preview"><div className="getra-figma-search-field"><img src="/images/landing/figma-search.png" alt="" /><span>Cari kopi ramah kursi roda dekat stasiun...</span></div><div className="getra-figma-filter-row"><span>✓ Ramah kursi roda</span><span>✓ Buka sekarang</span><span className="is-mint">✓ UMKM terverifikasi</span></div></div>;
  if (kind === "route") return <div className="getra-figma-capability-preview getra-figma-route-preview"><div><small>KUALITAS TROTOAR</small><strong>Nyaman &amp; mudah dilalui</strong></div><div><small>JARAK TEMPUH</small><strong>350 meter • 5 menit</strong></div></div>;
  if (kind === "grow") return <div className="getra-figma-capability-preview getra-figma-grow-preview"><b>Lebih mudah ditemukan</b><span>Usaha tampil lebih relevan bagi orang di sekitar.</span></div>;
  return <div className="getra-figma-understand-preview"><div><b>Informasi Kawasan</b><span>Aktivitas &amp; kebutuhan sekitar</span></div><div><b>Catatan Warga</b><span>Update kondisi tempat dan akses sekitar</span></div></div>;
}

export function FigmaCapabilitiesSection() {
  return <section id="fitur" className="getra-figma-capabilities" aria-labelledby="getra-capabilities-title"><div className="getra-figma-capabilities__container"><header><p className="getra-figma-eyebrow">APA YANG BISA DILAKUKAN GETRA</p><h2 id="getra-capabilities-title">Lebih dari sekadar melihat peta.</h2></header><div className="getra-figma-capabilities__grid">{CARDS.map((card) => <article key={card.badge} className={`getra-figma-capability-card getra-figma-capability-card--${card.kind}`}><div className="getra-figma-capability-card__meta"><span>{card.badge}</span><small>{card.label}</small></div><h3>{card.title}</h3><p>{card.body}</p><CardPreview kind={card.kind} /></article>)}</div></div></section>;
}
