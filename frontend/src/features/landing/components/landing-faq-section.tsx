const FAQ_ITEMS = [
  {
    question: "Apa itu GETRA?",
    answer:
      "GETRA adalah platform WebGIS yang membantu memahami mobilitas pejalan kaki, usaha lokal, dan potensi area melalui satu peta yang mudah digunakan.",
  },
  {
    question: "Siapa yang bisa menggunakan GETRA?",
    answer:
      "GETRA dapat digunakan untuk menjelajah kota, menjalankan usaha, menilai area, dan memahami informasi lokasi sesuai kebutuhan Anda.",
  },
  {
    question: "Apakah saya perlu membuat akun untuk mulai menjelajah?",
    answer:
      "Anda dapat membaca halaman pengenalan ini tanpa akun. Masuk atau daftar diperlukan saat memakai fitur yang terkait dengan akun dan ruang kerja Anda.",
  },
  {
    question: "Bagaimana pelaku UMKM dapat menampilkan usahanya?",
    answer:
      "Pilih pengalaman UMKM, cari atau tambahkan usaha, lalu kirim informasi untuk diperiksa. Memilih pengalaman tidak mengubah hak akses akun Anda.",
  },
  {
    question: "Apa yang bisa dilihat investor melalui GETRA?",
    answer:
      "Informasi Ruang Usaha membantu membandingkan kondisi area, akses, kebutuhan sekitar, dan kedekatan dengan transit sebagai bahan pertimbangan awal.",
  },
] as const;

export function LandingFaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#118ab2]">
            Tanya jawab
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#464b71] sm:text-4xl">
            Yang mungkin ingin Anda tahu.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#66708d] sm:text-base">
            Punya pertanyaan seputar cara kerja GETRA, peta WebGIS, atau
            pendaftaran usaha lokal? Simak jawaban ringkas berikut.
          </p>
        </div>

        <div className="border-y border-[#464b71]/15">
          {FAQ_ITEMS.map((item, index) => (
            <details
              key={item.question}
              className="group border-b border-[#464b71]/15 py-1 last:border-b-0"
              open={index === 0}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-base font-black text-[#464b71] marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]">
                {item.question}
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-[#464b71]/15 text-lg font-medium text-[#118ab2] transition group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-7 text-[#66708d]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
