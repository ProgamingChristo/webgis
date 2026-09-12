const UPDATES = [
  { badge: "AKSES PEJALAN", time: "2 jam lalu", title: "Akses trotoar di Halte Cikini telah diperbaiki", body: "Jalur penyeberangan di depan Halte Cikini kini dilengkapi guiding block dan ramp kursi roda. Informasi aksesnya telah diperbarui." },
  { badge: "VERIFIKASI USAHA", time: "5 jam lalu", title: "Warung Nasi Uduk Bu Nanik berpindah lokasi", body: "Titik gerobak berpindah ke selasar ruko nomor 14 dengan area duduk terlindung. Informasi lokasi dan jam operasional diperbarui." },
  { badge: "PENERANGAN JALAN", time: "Kemarin", title: "Penerangan lorong kuliner telah diperbaiki", body: "Penerangan ditingkatkan dengan penambahan lampu di jalur pedestrian." },
] as const;

function AreaDiagram() {
  return <div className="getra-figma-area-diagram" aria-label="Diagram area aktif Sabang–Menteng"><img className="getra-figma-area-diagram__blue-shape" src="/images/landing/figma-analysis-polygon-blue.png" alt="" /><img className="getra-figma-area-diagram__mint-shape" src="/images/landing/figma-analysis-polygon-mint.png" alt="" /><span className="getra-figma-area-diagram__route" /><img className="getra-figma-area-diagram__dot-blue" src="/images/landing/figma-analysis-dot-blue.png" alt="" /><img className="getra-figma-area-diagram__dot-ink" src="/images/landing/figma-analysis-dot-ink.png" alt="" /><img className="getra-figma-area-diagram__dot-mint" src="/images/landing/figma-analysis-dot-mint.png" alt="" /></div>;
}

export function FigmaOpportunitySection() {
  return <section className="getra-figma-opportunity" aria-labelledby="getra-opportunity-title"><div className="getra-figma-opportunity__container"><div className="getra-figma-opportunity__copy"><p className="getra-figma-eyebrow">MEMAHAMI PELUANG &amp; RUANG USAHA</p><h2 id="getra-opportunity-title">Pahami peluang di balik sebuah lokasi.</h2><p>Lihat aktivitas kawasan, kebutuhan yang belum terpenuhi, dan pola pergerakan di sekitar untuk membantu menilai potensi sebuah lokasi.</p><div className="getra-figma-opportunity__insight"><strong>Potensi Kawasan: Tinggi</strong><span>Banyak kebutuhan yang belum terpenuhi di area ini.</span></div></div><div className="getra-figma-opportunity__visual"><div className="getra-figma-opportunity__visual-head"><span><i />Area Aktif · Sabang–Menteng</span><b>Potensi Area: Tinggi</b></div><AreaDiagram /><small>Jangkauan area: 15 menit</small></div></div></section>;
}

export function FigmaCommunityValidationSection() {
  return <section className="getra-figma-community-validation" aria-labelledby="getra-community-title"><div className="getra-figma-community-validation__container"><header><p className="getra-figma-eyebrow">VALIDASI BERBASIS KOMUNITAS</p><h2 id="getra-community-title">Informasi kota yang diperbarui bersama warga.</h2><p>Kontribusi warga membantu GETRA melengkapi informasi lokasi dengan kondisi yang benar-benar terjadi di lapangan.</p></header><div className="getra-figma-community-validation__cards">{UPDATES.map((update, index) => <article key={update.title}><div><span>{update.badge}</span><time>{update.time}</time></div><h3>{update.title}</h3><p>{update.body}</p><footer><i className={index === 1 ? "is-mint" : ""} />Dikonfirmasi warga sekitar</footer></article>)}</div></div></section>;
}
