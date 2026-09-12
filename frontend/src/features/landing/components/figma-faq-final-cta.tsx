"use client";

import Link from "next/link";
import { useState } from "react";

const FAQS = [
  { question: "Apa itu GETRA?", answer: "GETRA membantu kamu mencari tempat, melihat akses dan rute, menemukan usaha lokal, serta memahami potensi suatu area lewat satu peta." },
  { question: "Siapa yang bisa menggunakan GETRA?", answer: "GETRA dapat digunakan oleh siapa pun yang ingin memahami tempat, akses, usaha lokal, dan peluang di sekitarnya." },
  { question: "Apakah saya perlu membuat akun untuk mulai menjelajah?", answer: "Tidak. Kamu dapat mulai menjelajah peta terlebih dahulu, lalu membuat akun saat membutuhkan fitur tambahan." },
  { question: "Bagaimana pelaku UMKM dapat menampilkan usahanya?", answer: "Pelaku UMKM dapat mendaftarkan dan melengkapi profil usaha agar lebih mudah ditemukan di peta." },
  { question: "Apa yang bisa dilihat investor melalui GETRA?", answer: "Investor dapat melihat aktivitas kawasan, kebutuhan sekitar, dan konteks lokasi untuk membantu memahami peluang area." },
] as const;

export function FigmaFaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="getra-figma-faq" aria-labelledby="getra-faq-title">
      <div className="getra-figma-faq__container">
        <header>
          <p className="getra-figma-eyebrow">TANYA JAWAB</p>
          <h2 id="getra-faq-title">Pertanyaan yang Sering Ditanyakan</h2>
          <p>Punya pertanyaan seputar cara kerja GETRA, penggunaan peta, atau pendaftaran usaha lokal? Simak jawaban ringkas berikut.</p>
        </header>
        <div className="getra-figma-faq__accordion">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return <article key={faq.question}>
              <button type="button" aria-expanded={isOpen} aria-controls={`getra-faq-answer-${index}`} onClick={() => setOpenIndex(isOpen ? -1 : index)}>
                <span>{faq.question}</span><i><img src="/images/landing/figma-faq-arrow.svg" alt="" /></i>
              </button>
              <div id={`getra-faq-answer-${index}`} className="getra-figma-faq__answer" aria-hidden={!isOpen}><p>{faq.answer}</p></div>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}

export function FigmaFinalCtaSection() {
  return <section className="getra-figma-final-cta" aria-labelledby="getra-final-cta-title"><div><h2 id="getra-final-cta-title">Lihat Kota dari Perspektif yang<br />Lebih Luas.</h2><p>Mulai jelajahi tempat, rute, usaha lokal, dan peluang di sekitar melalui GETRA.</p><nav aria-label="Mulai menggunakan GETRA"><Link href="/app">Buka GETRA</Link><Link href="/signup">Daftar Akun</Link></nav></div></section>;
}
