type StoryCopyProps = {
  number: string;
  title: string;
  body: string;
  tags: string[];
};

function StoryCopy({ number, title, body, tags }: StoryCopyProps) {
  return (
    <div className="getra-figma-story__copy">
      <p className="getra-figma-story__number">{number}</p>
      <h3>{title}</h3>
      <p className="getra-figma-story__body">{body}</p>
      <div className="getra-figma-story__tags" aria-label={`Fitur ${title}`}>
        {tags.map((tag, index) => <span className={index === 1 ? "is-mint" : ""} key={tag}>{tag}</span>)}
      </div>
    </div>
  );
}

function RoutePreview() {
  return (
    <div className="getra-figma-preview getra-figma-preview--route" aria-label="Pratinjau rute pejalan kaki">
      <div className="getra-figma-preview__topline">
        <span className="getra-figma-preview__walk" aria-hidden="true">
          <img src="/images/landing/figma-bx-walk.png" alt="" />
        </span>
        <div><b>MODE RUTE PEJALAN KAKI</b><strong>MRT Bundaran HI → Grand Indonesia</strong></div>
        <span className="getra-figma-preview__time">12 Menit</span>
      </div>
      <div className="getra-figma-route-map">
        <svg viewBox="0 0 650 224" preserveAspectRatio="none" aria-hidden="true">
          <path d="M162 184 C220 175, 228 76, 330 64 S450 78, 535 38" fill="none" stroke="#118AB2" strokeWidth="5" strokeDasharray="3 5" strokeLinecap="round" />
        </svg>
        <span className="getra-figma-route-map__start">●&nbsp; Stasiun MRT Bundaran HI</span>
        <span className="getra-figma-route-map__end">●&nbsp; Blok M</span>
        <span className="getra-figma-route-map__tip"><i>●</i><b>Akses pejalan kaki nyaman</b><small>Trotoar cukup lebar dan ramah kursi roda</small></span>
      </div>
    </div>
  );
}

function BusinessPreview() {
  return (
    <div className="getra-figma-preview getra-figma-preview--business" aria-label="Pratinjau profil usaha">
      <div className="getra-figma-business-head">
        <span className="getra-figma-business-icon" aria-hidden="true"><img src="/images/landing/figma-store.png" alt="" /></span>
        <div><strong>Kopi Seduh Selaras <b>TERVERIFIKASI</b></strong><small>Kafe &amp; Roastery Lokal • Radius Pelanggan 450m</small></div>
        <span className="getra-figma-business-claim">Terdaftar di GETRA</span>
      </div>
      <div className="getra-figma-business-metrics">
        <div><small>Pejalan kaki</small><strong className="is-blue">Mudah Ditemukan</strong></div>
        <div><small>Dari halte terdekat</small><strong>4 Menit</strong></div>
        <div><small>Aktivitas Sekitar</small><strong>Ramai</strong></div>
      </div>
    </div>
  );
}

function CatchmentPreview() {
  return (
    <div className="getra-figma-preview getra-figma-preview--catchment" aria-label="Pratinjau analisis catchment">
      <div className="getra-figma-preview__topline">
        <div className="getra-figma-catchment-title"><i>●</i><strong>Analisis Area : Cikini - Menteng</strong></div>
        <span className="getra-figma-preview__time">Potensi Area : Tinggi</span>
      </div>
      <div className="getra-figma-catchment-map">
        <div className="getra-figma-catchment-card"><small>Kebutuhan yang belum terpenuhi</small><strong>Klinik Sehat &amp; Toko Buku</strong></div>
        <div className="getra-figma-catchment-card"><small>Aktivitas Sore</small><strong className="is-blue">Ramai</strong></div>
        <span className="getra-figma-catchment-map__coverage">Jangkauan Area : 15 Menit</span>
        <i className="getra-figma-catchment-map__circle getra-figma-catchment-map__circle--outer" />
        <i className="getra-figma-catchment-map__circle getra-figma-catchment-map__circle--inner" />
      </div>
    </div>
  );
}

export function FigmaPersonaStoriesSection() {
  return (
    <section className="getra-figma-personas" aria-labelledby="getra-personas-title">
      <div className="getra-figma-personas__container">
        <header className="getra-figma-personas__header">
          <p className="getra-figma-eyebrow">PERSONALISASI SUDUT PANDANG</p>
          <h2 id="getra-personas-title">GETRA Beradaptasi dengan Cara Anda Melihat Kota.</h2>
          <p>Satu platform dengan pengalaman berbeda untuk setiap kebutuhan: dari langkah pejalan kaki, denyut toko lokal, hingga analisis prospek wilayah.</p>
        </header>
        <div className="getra-figma-stories">
          <div className="getra-figma-story"><StoryCopy number="01" title="Pergi ke mana saja dengan lebih mudah." body="Cari tempat, transportasi, rute jalan kaki, dan informasi akses di sekitar untuk membantu perjalanan sehari-hari." tags={["Cari tempat", "Rute pejalan kaki", "Transportasi", "Aksesibilitas"]} /><RoutePreview /></div>
          <div className="getra-figma-story getra-figma-story--reverse"><BusinessPreview /><StoryCopy number="02" title="Buat usaha lebih mudah ditemukan." body="Kelola profil usaha, tingkatkan visibilitas, dan lihat kebutuhan orang di sekitar lokasi usaha kamu." tags={["Profil usaha", "Klaim usaha", "Promosi", "Insight sekitar"]} /></div>
          <div className="getra-figma-story"><StoryCopy number="03" title="Temukan area yang punya peluang." body="Lihat tingkat aktivitas, kebutuhan pasar, persaingan usaha, dan potensi lokasi sebelum membuka usaha atau cabang baru." tags={["Demand index", "Retail gap", "Ruang Usaha", "Area Sekitar"]} /><CatchmentPreview /></div>
        </div>
      </div>
    </section>
  );
}
