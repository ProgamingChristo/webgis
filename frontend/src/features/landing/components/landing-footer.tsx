import Link from "next/link";

import { GetraLogo } from "./getra-logo";

const footerGroups = [
  { title: "MENU", links: [["Untuk Siapa", "#tentang"], ["Fitur", "#fitur"], ["Peluang", "#peluang"], ["Cara Kerja", "#cara-kerja"]] },
  { title: "BANTUAN", links: [["FAQ", "#faq"], ["Kebijakan Privasi", "/privacy"], ["Syarat & Ketentuan", "/terms"]] },
] as const;

export function LandingFooter() {
  return (
    <footer className="getra-figma-footer">
      <div className="getra-figma-footer__container">
        <div className="getra-figma-footer__brand">
          <div><GetraLogo variant="footer" /><small>| Peta Cerdas Kota</small></div>
          <p>Peta kota untuk membantu memahami akses, usaha lokal, dan peluang di sekitar dengan lebih mudah.</p>
        </div>
        <div className="getra-figma-footer__links">
          {footerGroups.map((group) => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav>)}
        </div>
      </div>
      <p className="getra-figma-footer__copyright">© 2026 GETRA. Seluruh hak cipta dilindungi.</p>
    </footer>
  );
}
