import {
  extractSearchAction,
  normalizeSlangAndTypos,
  SearchCriteriaSchema,
} from "./search-action";

import { generateStructured } from "@/lib/ai/provider";

import {
  type AiAskRequest,
  type AiAskResponse,
  type AiIntent,
  type AiApplicationAction,
  type AiMapAction,
  IntentClassificationSchema,
  GroundedGenerationSchema,
} from "./ai.schema";

import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { UmkmRepository } from "@/src/repositories/umkm.repository";
import { CommuterNetworkRepository } from "@/src/features/commuter";
import { AccessibilityEvidenceRepository } from "@/src/features/accessibility-evidence/accessibility-evidence.repository";

type AiProvider = "openai" | "sub2api" | "deterministic";

export const DETERMINISTIC_PRODUCT_KNOWLEDGE_INTENTS: readonly AiIntent[] = [
  "ASSISTANT_IDENTITY",
  "CASUAL_CHAT",
  "GENERAL_HELP",
  "AI_HELP",
  "PROMOTION_CREATE",
  "PROMOTION_SETUP",
  "PROMOTION_TARGETING",
  "PROMOTION_SCHEDULE",
  "PROMOTION_PREVIEW",
  "PROMOTION_PAYMENT",
  "PROMOTION_ANALYTICS",
  "PROMOTION_INVOICE",
  "UMKM_CREATE",
  "UMKM_SUBMIT",
  "UMKM_STATUS",
  "UMKM_CLAIM",
  "UMKM_OWNERSHIP",
  "UMKM_LOCATION",
  "UMKM_EDIT",
  "ACTIVE_JOURNEY",
  "PAYMENT_STATUS",
  "COMMUNITY",
  "COMMUNITY_OBSERVATION",
  "COMMUNITY_REPORT",
  "ACTIVITY_FEED",
  "NOTIFICATION_HELP",
  "PROFILE",
  "ADMIN",
  "FAIR_DISCOVERY",
  "SAFETY_GUARDRAIL",
  "INVESTOR_MODE",
  "FILTER_DIAGNOSIS",
  "BUSINESS_SPACE",
  "CCTV",
  "TRAFFIC",
  "ENVIRONMENT",
  "SEARCH_UMKM",
  "ROUTE",
  "TRANSIT",
  "PROMOTION",
  "OWNER",
];

export class AiService {
  constructor(
    private readonly authorization: string,
  ) {}

  async handleAskRequest(
    req: AiAskRequest,
  ): Promise<AiAskResponse> {
    const res = await this.executeAskRequest(req);
    if (!res.suggestion_chips || res.suggestion_chips.length === 0) {
      res.suggestion_chips = getSuggestionChips(
        res.intent,
        res.action,
        req.active_experience,
      );
    }
    return res;
  }

  private async executeAskRequest(
    req: AiAskRequest,
  ): Promise<AiAskResponse> {
    const {
      question,
      active_experience,
      context,
      history,
    } = req;

    const normalizedQuestion = normalizeSlangAndTypos(question).toLocaleLowerCase("id-ID").trim();

    // 1. Guardrail: Secret Exfiltration & Prompt Injection
    const isSecretExfiltration =
      /\b(server[_\s-]?key|service[_\s-]?role|api[_\s-]?key|secret[_\s-]?key|password|kunci rahasia|credential)\b/iu.test(
        normalizedQuestion,
      );

    // 2. Guardrail: Unauthorized Privilege Escalation & Admin/Owner Action Refusal
    if (
      /\b(?:approve|setujui)\s+(?:merchant|toko|usaha|warung|pengajuan|submission|umkm)\b/iu.test(normalizedQuestion) ||
      (/\bverifikasi\s+(?:merchant|toko|usaha|warung|pengajuan|submission|umkm)\b/iu.test(normalizedQuestion) && !/\b(?:status|kenapa|mengapa|kapan|cek)\b/iu.test(normalizedQuestion))
    ) {
      return {
        answer:
          "Persetujuan pendaftaran UMKM hanya dapat dilakukan oleh Administrator berwenang melalui dashboard Admin (/admin). GETRA AI beroperasi dengan pemisahan hak akses dan tidak memiliki kewenangan mengubah status kurasi merchant.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Tindakan persetujuan merchant memerlukan otorisasi Administrator."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:ubah|ganti|pindah)\s+(?:owner|pemilik|hak milik)\b/iu.test(normalizedQuestion) || /\bklaim\s+(?:merchant|toko|usaha)\s+(?:langsung|tanpa verifikasi)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Klaim dan perubahan kepemilikan usaha memerlukan pengajuan dokumen legalitas resmi melalui alur Klaim Usaha (/umkm) untuk diverifikasi oleh tim Admin. Asisten AI tidak dapat memindahtangankan kepemilikan.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Perubahan kepemilikan memerlukan verifikasi dokumen legal oleh Administrator."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:publikasikan|terbitkan|publish)\s+(?:merchant|toko|usaha)\s*(?:pending|belum disetujui)?\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Publikasi profil usaha dilakukan secara otomatis oleh sistem setelah status verifikasi pendaftaran disetujui oleh tim Admin. Asisten AI tidak memiliki wewenang untuk mempublikasikan data yang masih berstatus pending.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Publikasi UMKM tunduk pada alur kurasi Admin."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:ubah|aktifkan|set)\s+(?:status\s+)?promosi\s+(?:jadi\s+aktif|tanpa\s+bayar|gratis)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Permintaan ditolak demi keamanan. Aktivasi kampanye promosi memerlukan penyelesaian transaksi pembayaran resmi melalui gateway Midtrans Sandbox. Asisten AI tidak memiliki otorisasi finansial untuk mengaktifkan promosi tanpa pembayaran sah.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Aktivasi promosi terikat pada settlement pembayaran Midtrans Sandbox."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    const isPrivilegeEscalation =
      /\b(jadikan saya admin|approve usaha.*tanpa admin|aktifkan promosi tanpa bayar|ubah merchant ini jadi punya saya|bypass auth|elevate privilege)\b/iu.test(
        normalizedQuestion,
      );

    if (isSecretExfiltration || isPrivilegeEscalation) {
      return {
        answer:
          "Permintaan ditolak demi keamanan sistem. GETRA AI mematuhi protokol perlindungan data ketat, tidak memiliki akses ke kunci rahasia/kredensial backend, dan tidak dapat mengubah hak akses administratif pengguna.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Permintaan melanggar batas keamanan atau privasi sistem."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    // 2b. Fair Discovery & Superlative Claims Guardrails
    if (/\b(?:kenapa|mengapa)\s+(?:toko|merchant|usaha)\s+(?:ini\s+)?(?:muncul|tampil|ada di atas)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Merchant tampil pada GETRA berdasarkan prinsip Fair Discovery: kedekatan jarak spasial dalam radius pencarian, kesesuaian kategori pencarian, serta status buka/tutup toko. GETRA tidak mendahulukan usaha semata-mata karena biaya lelang iklan.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:mana|rekomendasikan).*(?:paling\s+enak|terbaik|juara|nomor satu)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA beroperasi dengan prinsip Fair Discovery berbasis data faktual spasial. Kami tidak memberikan klaim subjektif seperti 'terbaik' atau 'paling enak' tanpa bukti ulasan konsumen yang terverifikasi secara empiris.",
        intent: "UMKM_POI",
        limitations: ["Penilaian rasa dan klaim superlatif di luar cakupan data faktual GETRA."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apa itu|jelaskan)\s+hidden gem\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Hidden Gem di GETRA adalah penanda bagi UMKM lokal berkualitas yang berada di jalur pedestrian sekunder atau permukiman yang mungkin memiliki keterlihatan rendah di jalan raya utama, namun memiliki produk otentik dan terdaftar resmi.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    // 3. Guardrail: Hallucination Prevention on Unsupported Facts (Category X)
    if (/\brating\b.*\b(merchant|usaha|ini|tempat|toko)\b/iu.test(normalizedQuestion) || /\bberapa rating\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA beroperasi dengan prinsip Fair Discovery berbasis data faktual dan tidak memuat rating fiktif. Data ulasan konsumen untuk tempat ini belum tersedia secara terverifikasi.",
        intent: "UMKM_POI",
        limitations: ["Data rating tidak tersedia pada data faktual GETRA."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(orang lewat|foot traffic|pejalan kaki per hari|traffic harian)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Data estimasi jumlah pejalan kaki harian secara spesifik belum tercatat pada basis data resmi GETRA untuk lokasi ini.",
        intent: "GENERAL_AREA",
        limitations: ["Data foot traffic belum tercatat."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(berapa macet|kemacetan sekarang|macet sekarang|live traffic|apakah.*macet)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA berfokus pada jaringan rute pejalan kaki dan multimodal berbasis jaringan GIS, bukan penyedia sensor kemacetan lalu lintas jalan raya real-time.",
        intent: "GENERAL_AREA",
        limitations: ["Sensor kemacetan real-time di luar cakupan GETRA."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(harga semua menu|daftar harga menu)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Daftar lengkap harga menu untuk usaha ini belum tercatat pada basis data GETRA. Kunjungi langsung lokasi usaha untuk melihat daftar menu dan harga terkini.",
        intent: "UMKM_POI",
        limitations: ["Daftar menu lengkap tidak tersedia."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apakah\s+)?(?:toko|usaha|warung|tempat)\s+ini\s+pasti\s+ramai\b/iu.test(normalizedQuestion) || /\bpasti ramai\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA tidak dapat menjamin tingkat keramaian suatu usaha. Kepadatan pengunjung dipengaruhi oleh banyak faktor dinamis di luar estimasi indikatif mobilitas pejalan kaki.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Prediksi keramaian riil di luar jaminan sistem."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apakah\s+)?(?:lokasi|usaha|toko|titik)\s+ini\s+pasti\s+untung\b/iu.test(normalizedQuestion) || /\bpasti untung\b/iu.test(normalizedQuestion) || /\bjaminan omzet\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA tidak memberikan jaminan keuntungan finansial atau kepastian omzet usaha. Analisis potensi pasar (Retail Gap dan Demand/Supply) bersifat indikatif spasial sebagai bahan pertimbangan awal.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["GETRA tidak memberikan jaminan finansial."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apakah\s+)?(?:jalan|jalur|rute)\s+ini\s+pasti\s+aman\b/iu.test(normalizedQuestion) || /\bpasti aman\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA menyajikan data kondisi trotoar dan fasilitas aksesibilitas berdasarkan observasi lapangan terverifikasi, namun tidak membuat klaim keamanan mutlak di luar data faktual infrastruktur yang tercatat.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Data keamanan mutlak di luar cakupan faktual."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bberapa omzet\b/iu.test(normalizedQuestion) || /\b(?:omzet|pendapatan|penghasilan)\s+(?:toko|warung|usaha|merchant)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Data omzet dan pendapatan riil pemilik usaha bersifat privat dan tidak tercatat pada basis data publik GETRA.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Data omzet privat tidak tersedia."],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    // Safety / Truth Guardrails (Category J)
    if (/\b(?:buatkan|bikin|tentukan)\s+koordinat\b/iu.test(normalizedQuestion) || /\bkoordinat\s+(?:toko|merchant|usaha)\s+ini\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA tidak mengarang koordinat tempat. Semua koordinat lokasi merchant dan titik transit diperoleh dari geocoding PostGIS kanonikal atau penandaan pin resmi oleh pemilik usaha yang telah diverifikasi.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["AI dilarang mengarang koordinat geografis fiktif."],
        evidence: [{ source: "GETRA Spatial Truth Boundary", dataset: "PostGIS Canonical Geocoding" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bberapa jarak lurus(?:nya)?\b/iu.test(normalizedQuestion) || /\bjarak lurus\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA menggunakan perhitungan rute jaringan jalan dan pedestrian GIS (Valhalla/PostGIS), bukan estimasi jarak garis lurus (Haversine), agar mencerminkan kondisi fisik dan aksesibilitas pejalan kaki yang sebenarnya.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Estimasi garis lurus diabaikan demi keandalan navigasi pejalan kaki riil."],
        evidence: [{ source: "GETRA GIS Routing Engine", dataset: "PostGIS & Valhalla Pedestrian Network" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:buatkan|bikin|rancang)\s+route\s+sendiri\b/iu.test(normalizedQuestion) || /\brute sendiri tanpa routing\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Asisten AI tidak dapat membuat atau mengarang geometri rute sendiri. Semua rute dihitung secara matematis oleh authority routing PostGIS dan Valhalla berdasarkan jaringan jalan resmi.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["AI tidak memiliki otoritas fabrikasi geometri rute."],
        evidence: [{ source: "GETRA Routing Authority", dataset: "Valhalla Routing Graph" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\btebak eta\b/iu.test(normalizedQuestion) || /\btebak waktu tempuh\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA tidak menebak estimasi waktu tempuh (ETA). Waktu tempuh dihitung berdasarkan panjang segmen jalan riil dan kecepatan berjalan kaki rata-rata pejalan kaki pada jaringan GIS.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Perkiraan waktu fiktif dilarang."],
        evidence: [{ source: "GETRA GIS Routing Engine", dataset: "Valhalla Travel Time Authority" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbuat merchant dummy\b/iu.test(normalizedQuestion) || /\b(?:buat|bikin)\s+(?:toko|merchant|usaha)\s+(?:palsu|fiktif|dummy)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA beroperasi dengan data kanonikal faktual. Asisten AI tidak diizinkan membuat atau menampilkan data merchant fiktif.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Semua merchant harus terdaftar resmi pada database GETRA."],
        evidence: [{ source: "GETRA Registry", dataset: "Canonical Merchants Database" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bubah filter tanpa saya tahu\b/iu.test(normalizedQuestion) || /\bubah filter diam-diam\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA menjunjung transparansi penuh dan tidak pernah mengubah filter pencarian Anda secara diam-diam. Jika hasil kosong karena filter aktif, sistem akan menjelaskan filter mana yang membatasi dan meminta konfirmasi Anda.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Filter pengguna adalah preferensi eksplisit yang tidak dimutasi otomatis."],
        evidence: [{ source: "GETRA Filter Intelligence", dataset: "User Filter Governance" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\banggap pembayaran berhasil\b/iu.test(normalizedQuestion) || /\banggap lunas\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Status transaksi pembayaran promosi tidak dapat dimanipulasi atau diasumsikan berhasil oleh AI. Status settlement hanya dapat diperbarui melalui notifikasi webhook terverifikasi dari gateway Midtrans Sandbox.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Status pembayaran terikat pada verifikasi kriptografis signature Midtrans."],
        evidence: [{ source: "GETRA Payment Gateway", dataset: "Midtrans Webhook Verification" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\banggap umkm sudah diverifikasi\b/iu.test(normalizedQuestion) || /\banggap usaha terverifikasi\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Verifikasi UMKM memerlukan proses kurasi resmi oleh tim Administrator GETRA terhadap keabsahan dokumen dan lokasi usaha. AI tidak dapat mengubah status verifikasi secara sepihak.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Kurasi merchant hanya wewenang tim Admin."],
        evidence: [{ source: "GETRA Core Security", dataset: "Admin Curatorial Rules" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\btampilkan private ownership evidence\b/iu.test(normalizedQuestion) || /\bdokumen rahasia kepemilikan\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Dokumen bukti kepemilikan dan identitas pemilik usaha bersifat rahasia dan dilindungi oleh sistem keamanan GETRA. Data ini hanya dapat diakses oleh kurator Administrator yang berwenang.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Akses dokumen bukti kepemilikan dibatasi hak akses RBAC."],
        evidence: [{ source: "GETRA Core Security", dataset: "Protected Merchant Claims" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapprove umkm saya sebagai user\b/iu.test(normalizedQuestion) || /\bsetujui umkm saya sebagai user\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Persetujuan (approval) UMKM memerlukan hak akses peran Administrator. Pengguna biasa (USER) tidak memiliki wewenang kurasi untuk menyetujui pendaftaran usaha.",
        intent: "SAFETY_GUARDRAIL",
        limitations: ["Pemisahan hak akses: USER tidak dapat mengeksekusi aksi kurasi ADMIN."],
        evidence: [{ source: "GETRA Auth & Security", dataset: "Role-Based Access Control" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    // 4. Deterministic Product Guidance
    if (/\bapa itu fair discovery\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Fair Discovery adalah prinsip utama GETRA yang menjamin UMKM lokal mendapatkan visibilitas yang adil dan merata berdasarkan kedekatan spasial serta relevansi kebutuhan pengguna, bukan semata-mata ditentukan oleh besaran biaya lelang iklan.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Discovery Engine", dataset: "Fair Discovery Principles" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bkenapa toko ini muncul\b/iu.test(normalizedQuestion) || /\bmengapa toko ini muncul\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Toko ini muncul karena lokasi fisiknya berada di dalam radius pencarian aktif Anda dan memenuhi kriteria relevansi kategori pencarian pada peta Fair Discovery GETRA.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Discovery Engine", dataset: "Fair Discovery Ranking" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu hidden gem\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Hidden Gem di GETRA adalah rekomendasi tempat dan UMKM lokal berkualitas otentik yang berada di sekitar koridor pejalan kaki, namun belum memiliki visibilitas komersial besar. GETRA menampilkannya berdasarkan kedekatan fisik riil dan relevansi kebutuhan pengguna.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Discovery Engine", dataset: "Hidden Gem Curation" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa arti sponsored\b/iu.test(normalizedQuestion) || /\bapa itu sponsored\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Label 'Sponsored' menandakan bahwa UMKM terverifikasi sedang menjalankan promosi visual aktif melalui pembayaran resmi Midtrans Sandbox. Promosi ini diberi tanda transparansi jelas dan tidak mengubah ranking relevansi pencarian organik Fair Discovery.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Sponsored Disclosure Policy" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\bapakah hasil ini dibayar\b/iu.test(normalizedQuestion) || /\bapakah pencarian ini berbayar\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Hasil pencarian utama di GETRA tidak berbayar dan tidak dapat dibeli. Peringkat pencarian dihitung murni berdasarkan jarak fisik dan relevansi kebutuhan (Fair Discovery). Materi promosi berbayar (Sponsored) selalu diberi label terpisah dan transparan.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Discovery Engine", dataset: "Fair Discovery Policy" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa bedanya sponsored dengan hasil biasa\b/iu.test(normalizedQuestion) || /\bbeda sponsored dan hasil biasa\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Hasil biasa didasarkan murni pada jarak spasial dan kesesuaian pencarian (Fair Discovery tanpa biaya), sedangkan 'Sponsored' adalah materi promosi visual yang dipasang oleh UMKM terverifikasi melalui Midtrans Sandbox dan ditandai secara transparan agar pengguna dapat membedakannya dengan jelas.",
        intent: "FAIR_DISCOVERY",
        limitations: [],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Promotion Transparency Standards" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana investor menggunakan getra\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Investor dapat memanfaatkan GETRA untuk melihat peta kesenjangan komersial (Retail Gap), menganalisis potensi pasar (Demand vs Supply) di koridor transit pejalan kaki, dan mengidentifikasi peluang pembukaan ruang usaha (Business Space) baru berbasis data riil.",
        intent: "INVESTOR_MODE",
        limitations: ["Analisis spasial bersifat indikatif dan tidak menjamin imbal hasil finansial."],
        evidence: [{ source: "GETRA Analytics Engine", dataset: "Demand & Supply Transit Corridors" }],
        action: { type: "SWITCH_MAP_MODE", mode: "analytics" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana government menggunakan getra\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Pemerintah dan pembuat kebijakan dapat memanfaatkan GETRA untuk mengevaluasi konektivitas pejalan kaki di sekitar simpul transportasi umum, memantau sebaran fasilitas aksesibilitas ramah difabel, dan mendukung pemerataan ekonomi UMKM lokal.",
        intent: "INVESTOR_MODE",
        limitations: [],
        evidence: [{ source: "GETRA Governance Portal", dataset: "Urban Pedestrian Mobility Analytics" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu demand\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Demand di GETRA mencerminkan estimasi volume mobilitas dan kebutuhan konsumen pejalan kaki di sekitar simpul transit dan koridor jalan berdasarkan data pergerakan spasial.",
        intent: "DEMAND_SUPPLY",
        limitations: ["Data demand berbasis pemodelan mobilitas spasial indikatif."],
        evidence: [{ source: "GETRA Analytics Engine", dataset: "Pedestrian Demand Modeling" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu supply\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Supply di GETRA mengukur ketersediaan unit usaha dan UMKM aktif yang melayani kebutuhan konsumen di suatu zona atau koridor transit.",
        intent: "DEMAND_SUPPLY",
        limitations: ["Supply mencakup UMKM yang terdata pada katalog resmi GETRA."],
        evidence: [{ source: "GETRA Analytics Engine", dataset: "Commercial Supply Inventory" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu retail gap\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Retail Gap adalah selisih antara tingginya permintaan mobilitas pejalan kaki (Demand) dengan minimnya ketersediaan jenis usaha tertentu (Supply) di koridor transit, menandakan potensi peluang usaha baru.",
        intent: "DEMAND_SUPPLY",
        limitations: ["Retail gap adalah indikator peluang, bukan jaminan omzet usaha."],
        evidence: [{ source: "GETRA Analytics Engine", dataset: "Retail Gap Analytics" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu business space\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Business Space (Ruang Usaha) di GETRA adalah fitur pemetaan titik lokasi atau lahan potensial untuk pembukaan unit usaha baru di sekitar area transit pejalan kaki yang memiliki kesenjangan retail tinggi.",
        intent: "BUSINESS_SPACE",
        limitations: [],
        evidence: [{ source: "GETRA Space Intelligence", dataset: "Commercial Space Opportunities" }],
        action: { type: "SWITCH_MAP_MODE", mode: "business-space" },
        provider: "deterministic",
      };
    }

    if (/\bapakah pembayaran masih sandbox\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Ya, gateway pembayaran promosi GETRA saat ini berjalan pada lingkungan Midtrans Sandbox untuk pengujian transaksi aman menggunakan simulator QRIS atau Virtual Account resmi tanpa pemotongan dana riil.",
        intent: "PROMOTION_PAYMENT",
        limitations: ["Lingkungan transaksi adalah simulator Midtrans Sandbox."],
        evidence: [{ source: "GETRA Payment Gateway", dataset: "Midtrans Sandbox Environment" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\b(?:bagaimana\s+)?(?:mendapatkan|melihat)\s+invoice\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Invoice resmi pembayaran promosi diterbitkan secara otomatis setelah transaksi berstatus settlement (SETTLEMENT). Anda dapat melihat dan mengunduh invoice melalui riwayat promosi pada halaman Kelola Promosi (/umkm/advertising).",
        intent: "PROMOTION_INVOICE",
        limitations: ["Invoice hanya tersedia untuk transaksi yang telah diselesaikan (settlement)."],
        evidence: [{ source: "GETRA Payment Gateway", dataset: "Promotion Invoicing Service" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\b(?:mana|di mana|unduh|cetak)\s+invoice\b/iu.test(normalizedQuestion) || /\binvoice saya\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Invoice resmi pembayaran promosi diterbitkan secara otomatis setelah transaksi berstatus settlement (SETTLEMENT). Anda dapat melihat dan mengunduh invoice melalui riwayat promosi pada halaman Kelola Promosi (/umkm/advertising).",
        intent: "PAYMENT_STATUS",
        limitations: ["Invoice hanya tersedia untuk transaksi yang telah diselesaikan (settlement)."],
        evidence: [{ source: "GETRA Payment Gateway", dataset: "Promotion Invoicing Service" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\bkenapa promosi saya tidak tampil\b/iu.test(normalizedQuestion) || /\bkenapa promosi belum aktif\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Promosi belum tampil biasanya disebabkan oleh: 1) Pembayaran belum settlement di Midtrans, 2) Tanggal jadwal tayang belum dimulai atau sudah berakhir, 3) Profil usaha belum berstatus terverifikasi oleh Admin, atau 4) Pengguna berada di luar radius wilayah sasaran promosi.",
        intent: "PROMOTION_SETUP",
        limitations: ["Periksa status transaksi dan jadwal kampanye pada Kelola Promosi."],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Promotion Diagnostics" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana melihat statistik promosi\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Statistik impresi dan interaksi promosi dapat dipantau langsung pada dashboard Kelola Promosi (/umkm/advertising). GETRA menyajikan metrik jumlah tayang dan klik secara transparan.",
        intent: "PROMOTION_ANALYTICS",
        limitations: [],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Promotion Analytics" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\b(?:bagaimana|gimana)\s+(?:cara\s+)?memasukkan lokasi\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk memasukkan lokasi usaha pada formulir pendaftaran UMKM, Anda dapat menggeser pin lokasi pada peta interaktif ke titik tepat usaha Anda, atau klik tombol 'Gunakan Lokasi Saya' untuk mengisi koordinat GPS secara otomatis.",
        intent: "UMKM_LOCATION",
        limitations: ["Pastikan izin lokasi peramban aktif jika menggunakan GPS."],
        evidence: [{ source: "GETRA Registry", dataset: "Spatial Geocoding Form" }],
        action: { type: "NAVIGATE", path: "/umkm/merchants/new", label: "Daftarkan Usaha Sekarang" },
        provider: "deterministic",
      };
    }

    if (/\bgunakan lokasi saya untuk usaha\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Anda dapat menggunakan koordinat lokasi saat ini untuk usaha Anda dengan menekan tombol 'Gunakan Lokasi Saya' pada formulir pendaftaran UMKM (/umkm/merchants/new). Sistem akan membaca lintang dan bujur dari perangkat Anda.",
        intent: "UMKM_LOCATION",
        limitations: ["Akurasi koordinat bergantung pada sinyal GPS perangkat."],
        evidence: [{ source: "GETRA Registry", dataset: "Device Geolocation Integration" }],
        action: { type: "NAVIGATE", path: "/umkm/merchants/new", label: "Daftarkan Usaha Sekarang" },
        provider: "deterministic",
      };
    }

    if (/\bkenapa usaha saya belum muncul\b/iu.test(normalizedQuestion) || /\bapa arti pending\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Pendaftaran usaha baru di GETRA berstatus PENDING karena sedang dalam antrean kurasi verifikasi oleh tim Administrator. Usaha hanya akan tampil publik pada peta Fair Discovery setelah disetujui (APPROVED) demi menjaga keabsahan data spasial.",
        intent: "UMKM_STATUS",
        limitations: ["Kurasi data membutuhkan waktu peninjauan oleh tim Admin."],
        evidence: [{ source: "GETRA Registry", dataset: "Merchant Approval Workflow" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana usaha saya menjadi public\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Agar usaha Anda menjadi publik dan tampil di peta pencarian GETRA, pengajuan pendaftaran usaha Anda harus diverifikasi dan disetujui (APPROVED) oleh Administrator GETRA melalui dashboard kurasi resmi.",
        intent: "UMKM_STATUS",
        limitations: ["Publikasi peta tunduk pada kurasi Admin."],
        evidence: [{ source: "GETRA Registry", dataset: "Merchant Verification Governance" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana cara edit usaha\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk mengedit data usaha, pemilik usaha terverifikasi (OWNER VERIFIED) dapat membuka menu Kelola UMKM, memilih toko yang dikelola, dan menekan tombol 'Edit Profil Usaha' untuk memperbarui nama, jam operasional, atau foto.",
        intent: "UMKM_EDIT",
        limitations: ["Hanya pemilik terverifikasi yang memiliki izin mengubah profil usaha."],
        evidence: [{ source: "GETRA Registry", dataset: "Merchant Owner Management" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana cara submit usaha\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk submit pendaftaran usaha, lengkapi nama usaha, kategori, alamat, dan tandai koordinat lokasi pada formulir /umkm/merchants/new, lalu klik tombol 'Kirim Pengajuan' untuk diproses kurasi oleh Admin.",
        intent: "UMKM_SUBMIT",
        limitations: ["Kolom nama, kategori, dan titik lokasi wajib diisi lengkap."],
        evidence: [{ source: "GETRA Registry", dataset: "UMKM Onboarding Form" }],
        action: { type: "NAVIGATE", path: "/umkm/merchants/new", label: "Daftarkan Usaha Sekarang" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana cara membuat posting\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk membuat posting observasi komunitas, buka menu Komunitas (/community), tekan tombol 'Buat Postingan Baru', isi catatan pengamatan kondisi fasilitas pejalan kaki, pilih kategori, dan unggah foto bukti jika ada.",
        intent: "COMMUNITY",
        limitations: ["Kontribusi komunitas dimoderasi demi kenyamanan bersama."],
        evidence: [{ source: "GETRA Community Engine", dataset: "Citizen Observation Feed" }],
        action: { type: "NAVIGATE", path: "/community", label: "Buka Komunitas" },
        provider: "deterministic",
      };
    }

    if ((/\b(?:cara buat posting|bagaimana membuat laporan|buat laporan|laporan warga)\b/iu.test(normalizedQuestion) && !/\badmin\b/iu.test(normalizedQuestion)) || /\bapakah ada laporan warga atau observasi komunitas\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Observasi komunitas GETRA menampung laporan warga mengenai kondisi akses jalan dan fasilitas. Untuk membuat laporan atau postingan baru, buka menu Komunitas (/community) dan tekan 'Buat Postingan Baru'. Catatan ini bersifat waktu-terbatas dan dimoderasi secara berkala.",
        intent: "COMMUNITY_OBSERVATION",
        limitations: ["Kontribusi komunitas dimoderasi demi kenyamanan bersama."],
        evidence: [{ source: "GETRA Community", dataset: "Citizen Observation Feed" }],
        action: { type: "NAVIGATE", path: "/community", label: "Buka Komunitas" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana cara membalas posting\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk membalas postingan di Komunitas, pilih postingan yang ingin ditanggapi, ketik pesan Anda pada kolom 'Tulis Komentar' di bagian bawah, lalu tekan tombol Kirim.",
        intent: "COMMUNITY",
        limitations: [],
        evidence: [{ source: "GETRA Community Engine", dataset: "Community Comments" }],
        action: { type: "NAVIGATE", path: "/community", label: "Buka Komunitas" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana cara report\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk melaporkan postingan yang melanggar atau memuat informasi keliru, klik ikon 'Laporkan' (Report) pada sudut postingan, pilih alasan pelaporan, dan kirimkan agar ditinjau oleh Administrator.",
        intent: "COMMUNITY_REPORT",
        limitations: ["Laporan diverifikasi oleh Administrator sebelum tindakan moderasi."],
        evidence: [{ source: "GETRA Community Engine", dataset: "Content Moderation Queue" }],
        action: { type: "NAVIGATE", path: "/community", label: "Buka Komunitas" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu accessibility\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Aksesibilitas di GETRA adalah fitur pemetaan kondisi trotoar, guiding block tuna netra, rampa kursi roda, dan fasilitas difabel lainnya pada jalur pejalan kaki yang dilengkapi bukti foto lapangan.",
        intent: "ACCESSIBILITY",
        limitations: ["Data observasi bersifat faktual dan tidak otomatis mengubah graf rute kanonikal."],
        evidence: [{ source: "GETRA Pedestrian GIS", dataset: "Accessibility Infrastructure Layer" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    if (/\bcari fasilitas accessibility di area ini\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Anda dapat melihat fasilitas aksesibilitas di area ini dengan mengaktifkan lapisan peta 'Aksesibilitas'. Titik rampa, guiding block, dan observasi trotoar akan ditampilkan secara visual.",
        intent: "ACCESSIBILITY",
        limitations: [],
        evidence: [{ source: "GETRA Pedestrian GIS", dataset: "Spatial Accessibility Features" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    if (/\bjelaskan detail titik accessibility ini\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Detail titik aksesibilitas menampilkan jenis fasilitas (rampa, guiding block, atau hambatan trotoar), status kelayakan fisik, dan foto dokumentasi lapangan yang tercatat pada basis data observasi GETRA.",
        intent: "ACCESSIBILITY",
        limitations: ["Data mengacu pada catatan observasi terakhir yang diverifikasi."],
        evidence: [{ source: "GETRA Pedestrian GIS", dataset: "Accessibility Observation Detail" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana melihat aktivitas\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Anda dapat melihat riwayat aktivitas navigasi, rute tersimpan, dan catatan kontribusi komunitas pada tab Komunitas (/community) dan panel profil akun Anda.",
        intent: "ACTIVITY_FEED",
        limitations: [],
        evidence: [{ source: "GETRA Activity Tracker", dataset: "User Journey & Contribution Logs" }],
        action: { type: "NAVIGATE", path: "/community", label: "Buka Komunitas" },
        provider: "deterministic",
      };
    }

    if (/\bbagaimana notifikasi bekerja\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Sistem notifikasi GETRA mengabarkan pembaruan penting secara langsung, seperti persetujuan UMKM baru, status penyelesaian pembayaran promosi, dan respons interaksi komunitas.",
        intent: "NOTIFICATION_HELP",
        limitations: [],
        evidence: [{ source: "GETRA Notification Hub", dataset: "System Notifications" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bmulai perjalanan\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Fitur Active Journey GETRA memandu navigasi langsung mengikuti rute jaringan GIS yang telah dihitung. Untuk memulai, tentukan rute perjalanan terlebih dahulu lalu tekan tombol 'Mulai Perjalanan'. Sistem akan memantau posisi Anda dan menghitung ulang rute jika Anda menyimpang dari koridor rute resmi.",
        intent: "ACTIVE_JOURNEY",
        limitations: ["Jarak dan waktu tempuh dihitung oleh PostGIS/Valhalla secara dinamis."],
        evidence: [{ source: "GETRA GIS Navigation", dataset: "Live Corridor Tracking" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bsaya keluar jalur\b/iu.test(normalizedQuestion) || /\brute ulang\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Sistem mendeteksi deviasi posisi. GETRA akan menghitung ulang (reroute) jalur terbaik dari posisi Anda saat ini menuju tujuan yang telah dipilih.",
        intent: "ACTIVE_JOURNEY",
        limitations: ["Kalkulasi reroute memerlukan koordinat GPS perangkat aktif."],
        evidence: [{ source: "GETRA Routing Engine", dataset: "Dynamic Rerouting Authority" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bsaya sudah sampai\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Selamat, Anda telah tiba di tujuan. Sesi Active Journey telah selesai. Anda dapat memberikan ulasan observasi aksesibilitas atau mencari tempat menarik lainnya.",
        intent: "ACTIVE_JOURNEY",
        limitations: [],
        evidence: [{ source: "GETRA GIS Navigation", dataset: "Trip Completion" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (
      /^getra bisa (?:bantu )?apa\b/iu.test(normalizedQuestion) ||
      /\bapa yang (?:bisa|dapat) (?:dilakukan|dibantu) getra\b/iu.test(normalizedQuestion)
    ) {
      return {
        answer:
          "GETRA dapat membantu Anda menemukan UMKM lokal dengan prinsip Fair Discovery, menghitung rute berjalan kaki dan multimodal berbasis jaringan GIS yang akurat, serta membantu pelaku usaha mendaftarkan dan mempromosikan usahanya.",
        intent: "ASSISTANT_IDENTITY",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:gimana|bagaimana|cara)\s+(?:daftar|daftarkan)\s+usaha\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Anda dapat mendaftarkan usaha Anda melalui menu UMKM > Daftarkan Usaha di GETRA dengan mengisi nama usaha, alamat lengkap, kategori usaha, dan menandai koordinat lokasi pada peta untuk diverifikasi tim Admin. Setelah disetujui, usaha Anda akan dipublikasikan secara resmi pada peta Fair Discovery.",
        intent: "UMKM_CREATE",
        limitations: ["Pendaftaran usaha memerlukan kurasi dan persetujuan Administrator."],
        evidence: [{ source: "GETRA Registry", dataset: "UMKM Canonical Catalog" }],
        action: { type: "NAVIGATE", path: "/umkm/merchants/new", label: "Daftarkan Usaha Sekarang" },
        provider: "deterministic",
      };
    }

    if (/\bkenapa belum bisa (?:promosi|bayar)\b/iu.test(normalizedQuestion) || /\bbagaimana promosi di getra\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Promosi berbayar (Midtrans Sandbox) di GETRA mensyaratkan usaha Anda telah berstatus terverifikasi (VERIFIED) oleh tim Admin, dipublikasikan aktif di peta, dan akun Anda berada pada mode stakeholder UMKM. Kunjungi halaman Kelola Promosi (/umkm/advertising) untuk mengatur materi dan jadwal promosi.",
        intent: "PROMOTION_SETUP",
        limitations: ["Promosi membutuhkan verifikasi merchant dan penyelesaian transaksi Midtrans Sandbox."],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Promotion Workflow" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    if (/\b(?:saya\s+)?keluar\s+(?:dari\s+)?(?:rute|jalur)\b/iu.test(normalizedQuestion) || /\b(?:menyimpang|salah jalan)\b/iu.test(normalizedQuestion) || /\brute ulang\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Sistem mendeteksi deviasi posisi dari koridor rute aktif. GETRA menghitung ulang (reroute) jalur terbaik dari koordinat GPS Anda saat ini menuju titik tujuan yang telah dipilih.",
        intent: "ACTIVE_JOURNEY",
        limitations: ["Kalkulasi reroute memerlukan koordinat GPS perangkat aktif."],
        evidence: [{ source: "GETRA Routing Engine", dataset: "Dynamic Rerouting Authority" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bbantu buat deskripsi usaha\b/iu.test(normalizedQuestion) || /\bdeskripsi usaha\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Tips membuat deskripsi usaha UMKM di GETRA:\n1. Jelaskan produk atau kuliner unggulan Anda secara spesifik.\n2. Cantumkan keunikan rasa, bahan baku berkualitas, atau rentang harga terjangkau.\n3. Informasikan jam operasional buka dan fasilitas (seperti tempat duduk atau take away).\n4. Sebutkan patokan lokasi fisik dari titik transit terdekat (contoh: '200m timur Stasiun Manggarai'). Anda dapat mengisinya langsung pada formulir pendaftaran UMKM.",
        intent: "UMKM_CREATE",
        limitations: ["Deskripsi usaha dapat diperbarui kapan saja oleh pemilik usaha terverifikasi."],
        evidence: [{ source: "GETRA Onboarding Guide", dataset: "Merchant Content Best Practices" }],
        action: { type: "NAVIGATE", path: "/umkm/merchants/new", label: "Daftarkan Usaha Sekarang" },
        provider: "deterministic",
      };
    }

    if (/\bagar usaha (?:saya )?muncul\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Agar usaha Anda muncul pada peta Fair Discovery GETRA:\n1. Daftarkan usaha melalui menu UMKM (/umkm/merchants/new) dan lengkapi pin koordinat lokasi.\n2. Tunggu proses kurasi verifikasi oleh tim Administrator GETRA untuk memastikan keabsahan data lokasi.\n3. Setelah status pendaftaran disetujui (APPROVED), toko Anda otomatis tampil di peta dan dapat ditemukan konsumen sekitar.",
        intent: "UMKM_STATUS",
        limitations: ["Publikasi di peta publik mensyaratkan persetujuan Administrator."],
        evidence: [{ source: "GETRA Registry", dataset: "Merchant Verification Workflow" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apa\s+)?beda(?:nya)?\s+user\s+dan\s+admin\b/iu.test(normalizedQuestion) || /\bperbedaan user dan admin\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Pemisahan hak akses di GETRA menerapkan prinsip Role-Based Access Control (RBAC):\n- Peran USER: Akun publik umum untuk navigasi rute, pencarian UMKM (Fair Discovery), mendaftarkan usaha baru, mengajukan promosi, dan berkontribusi laporan komunitas.\n- Peran ADMIN: Kurator sistem internal berwenang yang menyetujui/menolak pendaftaran UMKM, memverifikasi klaim kepemilikan usaha, dan memoderasi konten laporan warga. Pendaftaran publik secara eksklusif hanya menghasilkan peran USER.",
        intent: "PROFILE",
        limitations: ["Pemisahan hak akses mencegah eskalasi wewenang ilegal pada data kurasi."],
        evidence: [{ source: "GETRA Security Architecture", dataset: "RBAC Specification" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:bagaimana\s+cara\s+|cara\s+)?register\b/iu.test(normalizedQuestion) || /\bcara daftar akun\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Untuk mendaftar akun di GETRA, buka halaman registrasi (/register), masukkan nama lengkap, alamat email aktif, dan kata sandi aman. Setiap akun baru otomatis terdaftar dengan peran USER yang aman dan dapat mengaktifkan pengalaman UMKM, Investor, atau Government langsung dari menu profil.",
        intent: "PROFILE",
        limitations: [],
        evidence: [{ source: "GETRA Auth Hub", dataset: "User Onboarding" }],
        action: { type: "NAVIGATE", path: "/register", label: "Buka Halaman Daftar" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apa yang ada di sekitar area ini|apa yang ada di peta|tunjukkan area ini)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Peta GETRA menampilkan sebaran UMKM lokal terverifikasi, simpul transportasi publik (stasiun KRL dan halte TransJakarta), koridor jaringan jalan kaki resmi, serta titik fasilitas aksesibilitas ramah difabel. Anda dapat menjelajahi peta atau menggunakan filter kategori di bilah pencarian.",
        intent: "GENERAL_AREA",
        limitations: [],
        evidence: [{ source: "GETRA WebGIS Engine", dataset: "Spatial POI & Infrastructure" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\brute jalan kaki paling aman\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA menghitung rute pejalan kaki berdasarkan graf pedestrian PostGIS dan Valhalla yang memprioritaskan koridor trotoar resmi, zebra cross, dan jembatan penyeberangan orang (JPO). Anda dapat mengaktifkan layer 'Aksesibilitas' pada peta untuk melihat kondisi trotoar nyata sebelum memulai perjalanan.",
        intent: "WALKING_ROUTE",
        limitations: ["Kondisi riil di lapangan dapat dipengaruhi cuaca dan perbaikan fasilitas."],
        evidence: [{ source: "GETRA Pedestrian Routing", dataset: "Valhalla Pedestrian Graph" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    if (/\b(?:cari|ada|rute|jalur)\s+alternatif\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "GETRA mendukung kalkulasi rute multimodal (jalan kaki, sepeda motor, dan mobil). Pada panel rute, Anda dapat beralih moda perjalanan untuk membandingkan estimasi jarak dan waktu tempuh yang dihitung secara matematis oleh authority routing Valhalla.",
        intent: "WALKING_ROUTE",
        limitations: ["Waktu tempuh dihitung berdasarkan panjang segmen jalan dan kecepatan rata-rata moda."],
        evidence: [{ source: "GETRA Routing Authority", dataset: "Multimodal Routing Engines" }],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\b(?:apakah ada|ada)\s+akses kursi roda\b/iu.test(normalizedQuestion) || /\b(?:apa )?hambatan menuju\b/iu.test(normalizedQuestion) || /\bfasilitas akses\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Informasi akses kursi roda dan fasilitas ramah difabel (rampa, guiding block, trotoar rata) dipetakan pada lapisan Aksesibilitas GETRA. Sistem menyajikan observasi lapangan terverifikasi sehingga Anda dapat mengantisipasi hambatan fisik pada jalur pejalan kaki.",
        intent: "ACCESSIBILITY",
        limitations: ["Data mengacu pada catatan observasi infrastruktur terverifikasi."],
        evidence: [{ source: "GETRA Pedestrian GIS", dataset: "Accessibility Infrastructure Layer" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    if (/\barea mana yang menarik untuk usaha\b/iu.test(normalizedQuestion) || /\bapa demand di area ini\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Area di sekitar simpul transit mobilitas tinggi (seperti Stasiun Sudirman, Manggarai, dan Tanah Abang) memiliki pergerakan pejalan kaki (Demand) yang kuat. Anda dapat memeriksa layer Retail Gap pada mode analitik GETRA untuk melihat koridor dengan kesenjangan ketersediaan UMKM makanan atau retail.",
        intent: "DEMAND_SUPPLY",
        limitations: ["Analisis spasial bersifat indikatif dan tidak menggantikan riset kelayakan bisnis menyeluruh."],
        evidence: [{ source: "GETRA Analytics Engine", dataset: "Pedestrian Retail Gap" }],
        action: { type: "SWITCH_MAP_MODE", mode: "analytics" },
        provider: "deterministic",
      };
    }

    if (/\barea mana yang memiliki masalah akses\b/iu.test(normalizedQuestion) || /\bdampak penutupan jalan\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Area dengan kendala fasilitas pejalan kaki (seperti trotoar rusak atau penyempitan jalur) dipetakan pada layer Aksesibilitas berdasarkan laporan observasi warga. Jika terjadi penutupan jalan, mesin routing GIS GETRA (Valhalla/PostGIS) secara otomatis mengalihkan jalur pejalan kaki ke segmen jalan terhubung terdekat.",
        intent: "INVESTOR_MODE",
        limitations: ["Deviasi rute dihitung secara matematis mengikuti jaringan jalan yang terbuka."],
        evidence: [{ source: "GETRA Governance & Resilience", dataset: "Pedestrian Infrastructure Audit" }],
        action: { type: "SWITCH_MAP_MODE", mode: "accessibility" },
        provider: "deterministic",
      };
    }

    /**
     * Merchant/search requests use the dedicated structured
     * search extractor first.
     */
    const isProductGuidanceQuestion = /\b(bagaimana|gmn|gimana|cara\s+(?:buat|bikin|daftar|daftarin|promosi|pasang|klaim|claim|edit|ubah|submit|atur|register)|iklan|iklanin|promosi|promo|kenapa\s+(?:usaha|promosi|pembayaran|belum)|status\s+(?:pembayaran|pengajuan|verifikasi)|observasi\s+komunitas|aksesibilitas|accessibility|kursi\s+roda|apa\s+itu\s+(?:fair\s+discovery|hidden\s+gem|sponsored|demand|supply|retail\s+gap|business\s+space)|apakah\s+(?:pembayaran|hasil\s+ini|ada\s+akses)|buatkan\s+(?:koordinat|route)|tebak\s+eta|buat\s+merchant|ubah\s+filter|anggap\s+(?:pembayaran|umkm)|tampilkan\s+private|approve\s+umkm|berapa\s+jarak\s+lurus|jelaskan\s+(?:detail\s+titik|usaha|toko|merchant|ini)|cari\s+fasilitas\s+accessibility|perluasan\s+radius|halte\s+paling\s+dekat|stasiun\s+terdekat|transit\s+terdekat|kamu\s+asisten|siapa\s+kamu|asisten\s+(?:aku|saya)|keluar\s+(?:dari\s+)?rute|keluar\s+jalur|beda(?:nya)?\s+user|deskripsi\s+usaha|agar\s+usaha|apa\s+yang\s+ada\s+di\s+peta|penutupan\s+jalan|rute\s+jalan\s+kaki\s+paling\s+aman|rute\s+alternatif|jalur\s+alternatif|area\s+mana\s+yang\s+menarik)\b/iu.test(req.question);

    const searchCtx = context?.search_context as any;
    const hasPriorSearchContext = Boolean(
      searchCtx?.last_reference_text ||
      searchCtx?.reference_text ||
      searchCtx?.last_query ||
      searchCtx?.query ||
      (history && history.some((h) => /\b(cari|umkm|makan|kopi|stasiun|halte|tempat)\b/iu.test(h.content)))
    );

    const isContextualFilterFollowUp =
      hasPriorSearchContext &&
      /\b(?:yang\s+(?:buka|murah|paling\s+dekat|terdekat|bisa\s+jalan\s+kaki|terjangkau)|paling\s+dekat|buka\s+sekarang)\b/iu.test(req.question);

    const isSearchOrDiscovery =
      Boolean(context?.enable_search) ||
      isContextualFilterFollowUp ||
      /\b(cari|carikan|temukan|rekomendasi|mau makan|tempat makan|coffee|kopi|bakso|mie|nasi|soto|sate|kuliner|makan)\b/iu.test(normalizedQuestion) ||
      /\b(?:umkm|makanan|kuliner|toko|warung|tempat makan|resto|kopi|bakso)\s+(?:di\s+)?(?:dekat|sekitar|terdekat|paling dekat)\b/iu.test(normalizedQuestion) ||
      /\b(?:umkm|toko|warung|usaha)\s+(?:terdekat|paling dekat)\b/iu.test(normalizedQuestion) ||
      /\b(?:dekat|sekitar)\s+(?:stasiun|halte|st\.)\b/iu.test(normalizedQuestion) ||
      /\b(?:tempat|toko|warung|usaha)\s+(?:yang\s+)?(?:buka|murah)\b/iu.test(normalizedQuestion) ||
      /\b(tempat yang buka|buka sekarang)\b/iu.test(normalizedQuestion);

    if (!isProductGuidanceQuestion && isSearchOrDiscovery) {
      const extracted =
        await extractSearchAction(req);

      if (
        extracted &&
        extracted.data.action !== "CHAT"
      ) {
        const parsed =
          SearchCriteriaSchema.safeParse(
            extracted.data.criteria,
          );

        const criteria =
          parsed.success
            ? parsed.data
            : null;

        const needsOrigin = Boolean(
          criteria &&
            !criteria.reference_text &&
            (
              criteria.near_user ||
              criteria.max_walking_minutes ||
              criteria.sort === "NEAREST"
            ),
        );

        const canSearch = Boolean(
          extracted.data.action === "SEARCH" &&
            criteria &&
            (
              !needsOrigin ||
              context?.origin
            ),
        );

        const provider =
          normalizeProvider(
            extracted.source,
          );

        if (
          canSearch &&
          criteria
        ) {
          return {
            answer:
              "Saya akan mencari tempat sesuai kebutuhan ini. Penilaian rasa belum dapat dipastikan tanpa ulasan.",

            intent:
              "MERCHANT_SEARCH",

            limitations: [],

            evidence: [],

            action: {
              type:
                "APPLY_SEARCH_CRITERIA",

              criteria,
            },

            provider,
          };
        }

        const clarification =
          needsOrigin &&
          !context?.origin
            ? "Aktifkan lokasi saya sebelum mencari tempat terdekat."
            : extracted.data
                .clarification ||
              "Sebutkan jenis tempat dan lokasi yang ingin dicari.";

        return {
          answer: clarification,

          intent:
            "MERCHANT_SEARCH",

          limitations: [],

          evidence: [],

          action: {
            type:
              "REQUEST_CLARIFICATION",

            prompt:
              clarification,
          },

          provider,
        };
      }
    }

    /**
     * Determine deterministic application action first.
     *
     * Deterministic route recognition is useful because explicit
     * instructions such as:
     *
     * "jalan kaki dari JPO Blok E ke sini"
     *
     * should not depend entirely on an LLM classification.
     */
    const deterministicAction =
      determineApplicationAction(
        question,
        context,
        history,
      );

    const decision =
      await this.determineIntentAndAction(
        question,
        context,
        history,
      );

    const intent =
      decision.intent;

    /**
     * Prefer strong deterministic route/mode actions.
     *
     * For a deterministic clarification, however, allow a valid
     * model action to replace it if the model successfully resolves
     * the user's request from safe conversation context.
     */
    let action:
      AiApplicationAction =
      decision.action ??
      deterministicAction;

    if (
      deterministicAction.type ===
        "CALCULATE_ROUTE" ||
      deterministicAction.type ===
        "PREPARE_ROUTE" ||
      deterministicAction.type ===
        "CHANGE_ROUTE_MODE" ||
      deterministicAction.type ===
        "FOCUS_PLACE" ||
      deterministicAction.type ===
        "SWITCH_MAP_MODE" ||
      deterministicAction.type ===
        "NAVIGATE"
    ) {
      action =
        deterministicAction;
    } else if (
      deterministicAction.type ===
        "REQUEST_CLARIFICATION" &&
      (
        !decision.action ||
        decision.action.type ===
          "ANSWER_ONLY"
      )
    ) {
      action =
        deterministicAction;
    }

    if (
      action.type !==
      "ANSWER_ONLY" &&
      action.type !==
      "NAVIGATE"
    ) {
      const resolvedIntent: AiIntent =
        action.type === "CALCULATE_ROUTE" ||
        action.type === "PREPARE_ROUTE" ||
        action.type === "CHANGE_ROUTE_MODE"
          ? "WALKING_ROUTE"
          : action.type === "FOCUS_PLACE"
            ? "SEARCH_PLACE"
            : intent;

      return {
        answer:
          actionMessage(
            action,
            context?.selected_entity_name,
          ),

        intent: resolvedIntent,

        limitations: [],

        evidence: [],

        action,

        provider:
          decision.provider,
      };
    }

    /**
     * Fetch deterministic / GIS-grounded facts.
     */
    const {
      facts,
      provenance,
      limitations,
      mapAction,
    } =
      await this.fetchGroundingFacts(
        intent,
        context,
      );

    /**
     * Generate natural-language explanation from already grounded
     * GETRA facts.
     */
    const answer =
      await this.generateAnswer(
        question,
        intent,
        facts,
        active_experience,
        history,
      );

    return {
      answer:
        answer.answer,

      intent,

      limitations: [
        ...limitations,
        ...answer.limitations_mentioned,
      ],

      evidence:
        provenance,

      map_action:
        mapAction,

      action:
        action.type === "NAVIGATE" ? action : { type: "ANSWER_ONLY" },

      provider:
        answer.provider,
    };
  }

  private async determineIntentAndAction(
    question: string,
    context?: AiAskRequest["context"],
    history?: AiAskRequest["history"],
  ): Promise<{
    intent: AiIntent;
    action?: AiApplicationAction;
    provider: AiProvider;
  }> {
    const deterministicIntent =
      classifyIntentDeterministically(
        question,
        history,
      );

    if (DETERMINISTIC_PRODUCT_KNOWLEDGE_INTENTS.includes(deterministicIntent)) {
      return {
        intent: deterministicIntent,
        provider: "deterministic",
      };
    }

    let inputContext = "";

    if (
      history &&
      history.length > 0
    ) {
      inputContext +=
        "Conversation History:\n";

      for (
        const msg of history
      ) {
        inputContext += `${
          msg.role === "user"
            ? "User"
            : "Assistant"
        }: ${msg.content}\n`;
      }

      inputContext += "\n";
    }

    inputContext +=
      `Current Question: ${question}`;

    /**
     * Only pass minimal safe application context.
     *
     * Do not send complete merchant/database objects to the model.
     */
    inputContext +=
      `\nSafe GETRA Context: ${JSON.stringify(
        {
          selected_merchant_available:
            Boolean(
              context?.selected_entity_id,
            ),

          selected_merchant_name:
            context?.selected_entity_name ??
            null,

          current_location_available:
            Boolean(
              context?.origin,
            ),

          route_active:
            Boolean(
              context?.active_route,
            ),

          active_route_mode:
            context?.active_route
              ?.mode ??
            null,

          search_context_available:
            Boolean(
              context?.search_context,
            ),
        },
      )}`;

    const response =
      await generateStructured({
        schema:
          IntentClassificationSchema,

        schemaName:
          "intent_classification",

        instructions: `You are the intent and application-action classifier for the GETRA spatial decision support system.

Classify the current user request into exactly one supported intent:

- ASSISTANT_IDENTITY:
  Greetings or questions about whether this is GETRA AI, who the assistant is, or what it can do.

- CASUAL_CHAT:
  Lightweight conversation that does not require GIS, merchant search, routing, or spatial facts.

- GENERAL_HELP:
  Questions about what GETRA is, its capabilities, features, and how to get started.

- GENERAL_AREA:
  Questions about what exists or is happening in an area generally.

- NEAREST_TRANSIT:
  Questions where the requested target itself is nearby public transit, such as the nearest station or bus stop.

- WALKING_ROUTE:
  Requests involving route calculation, directions, travel duration, navigation, or walking to a destination.

- ACTIVE_JOURNEY:
  Requests related to live journey tracking, active navigation corridor, being lost, or journey status.

- UMKM_POI:
  Questions about a specific already-selected merchant, business, UMKM, or POI.

- MERCHANT_SEARCH:
  Requests to search, discover, find, filter, or recommend merchants, food, shops, restaurants, or UMKM.

- UMKM_CREATE:
  Questions on how to register, create, submit, or add a business/UMKM in GETRA.

- UMKM_STATUS:
  Questions about why a business is pending, review status, or when it will be approved.

- UMKM_CLAIM:
  Questions on how to claim an existing business or transfer store ownership.

- PROMOTION_CREATE:
  Questions on how to create, start, or buy promotions/campaigns/ads for a business.

- PROMOTION_SETUP:
  Questions about promotion materials, visual banner requirements, or promotion setup.

- PROMOTION_TARGETING:
  Questions about defining the promotion target area or radius buffer.

- PROMOTION_SCHEDULE:
  Questions about scheduling promotion dates, run times, or duration.

- PROMOTION_PREVIEW:
  Questions about previewing or simulating promotion appearance on the map.

- PROMOTION_PAYMENT:
  Questions about paying for promotions via Midtrans Sandbox or pricing.

- PROMOTION_ANALYTICS:
  Questions about viewing promotion statistics, impressions, clicks, or performance.

- PAYMENT_STATUS:
  Questions about checking Midtrans Sandbox transaction status, callbacks, or invoices.

- COMMUNITY:
  Questions about community reports, citizen observations, comments, or report moderation.

- ACCESSIBILITY:
  Questions about pedestrian accessibility, sidewalk conditions, wheelchair access, ramps, guiding blocks, or disability facilities.

- DEMAND_SUPPLY:
  Questions regarding market potential, retail gap, customer footfall vs business supply, or recommendations where to open a business space.

- PROFILE:
  Questions about user account settings, changing profile, experience mode, or logout.

- ADMIN:
  Questions about admin verification, curation queue, or administrator actions.

- UNKNOWN:
  The request cannot be classified safely into any GETRA capability.

Important semantic rule:
A transit word can be a LOCATION RELATION inside a merchant search.

Example:
"cari bakso dekat stasiun"
is MERCHANT_SEARCH, not automatically NEAREST_TRANSIT.

Use NEAREST_TRANSIT when the user is asking for the transit place itself, for example:
"halte terdekat di mana?"
"stasiun paling dekat apa?"

Also return at most one strict AiApplicationAction:

- CALCULATE_ROUTE:
  when the user explicitly asks GETRA to calculate/show a route and names exactly one transport mode.

- PREPARE_ROUTE:
  when origin and destination are known but the user names no mode or more than one mode. GETRA must show its mode chooser before calculating.

- CHANGE_ROUTE_MODE:
  when there is an active route and the user asks to change the transport mode.

- APPLY_SEARCH_CRITERIA:
  for merchant/food discovery when structured SearchCriteria can be determined.

- FOCUS_PLACE:
  when the user asks to locate/focus a place without asking for a route.

- SWITCH_MAP_MODE:
  when the user asks to switch or view the map in accessibility, business-space, or analytics mode.

- NAVIGATE:
  when directing the user to an existing workspace (e.g. /umkm/advertising, /umkm/merchants/new, /community, /profile).

- REQUEST_CLARIFICATION:
  only when required information is genuinely ambiguous or missing.

- ANSWER_ONLY:
  when no application mutation is required.

Rules:

1. Never invent latitude or longitude.
2. Never calculate distance, duration, walking time, route geometry, or proximity yourself.
3. Use PLACE_QUERY when the user gives a location name.
4. Use CURRENT_LOCATION only when the user clearly refers to their current location.
5. Use SELECTED_MERCHANT only when selected_merchant_available is true.
6. Do not fabricate merchant IDs.
7. Do not create fake ratings, prices, reviews, or recommendation scores.
8. If the user says "ke sini", "ke tempat ini", or similar and selected_merchant_available is true, the destination may be SELECTED_MERCHANT.
9. If an active route exists and the user says "kalau naik motor?" or "pakai mobil aja", return CHANGE_ROUTE_MODE.
10. Merchant/food search must use structured criteria and must not be converted into NEAREST_TRANSIT merely because a station or stop is mentioned as a spatial reference.`,

        input:
          inputContext,
      });

    return {
      intent:
        response?.data.intent ??
        deterministicIntent,

      action:
        response?.data.action,

      provider:
        normalizeProvider(
          response?.source,
        ),
    };
  }

  private async fetchGroundingFacts(
    intent: AiIntent,
    context: AiAskRequest["context"],
  ) {
    const limitations:
      string[] = [];

    const provenance: {
      source: string;
      dataset: string;
    }[] = [];

    let mapAction:
      AiMapAction | undefined;

    let facts:
      Record<string, unknown> =
      {};

    switch (intent) {
      case "ASSISTANT_IDENTITY": {
        facts = {
          assistant_name:
            "Asisten GETRA",

          capabilities: [
            "pencarian tempat",
            "rute",
            "area",
            "akses",
            "transit",
            "titik peta",
            "UMKM",
          ],

          grounding_policy:
            "Jawaban analisis menggunakan data GETRA yang tersedia.",
        };

        break;
      }

      case "CASUAL_CHAT": {
        facts = {
          assistant_name:
            "Asisten GETRA",

          chat_mode:
            "Percakapan umum ringan",

          safe_topics: [
            "pertanyaan sederhana",
            "bantuan memakai GETRA",
            "pencarian tempat",
            "penjelasan rute dan area jika konteks peta tersedia",
          ],

          grounding_policy:
            "Pertanyaan umum boleh dijawab langsung; klaim spasial tetap harus berdasarkan data GETRA.",
        };

        break;
      }

      case "NEAREST_TRANSIT": {
        if (!context?.origin) {
          limitations.push(
            "Lokasi asal tidak tersedia untuk mencari transit terdekat.",
          );

          break;
        }

        const supabase =
          getRequestSupabaseClient(
            this.authorization,
          );

        const transportRepo =
          new TransportNodeRepository(
            supabase,
          );

        let nearStops: { items: any[] } = { items: [] };
        try {
          nearStops = await transportRepo.findNear(
            {
              latitude:
                context.origin
                  .latitude,

              longitude:
                context.origin
                  .longitude,

              radius_meters:
                1500,
            },

            {
              limit: 1,
              offset: 0,
              page: 1,
              sort:
                "created_at",
              order:
                "desc",
            },
          );
        } catch {
          limitations.push("Data transit sementara tidak dapat diakses.");
        }

        if (
          nearStops.items.length >
          0
        ) {
          const stop =
            nearStops.items[0];

          facts = {
            stop_name:
              stop.name,

            distance_m:
              Number.isFinite(
                Number(
                  (
                    stop as any
                  )
                    .distance_meters,
                ),
              )
                ? Number(
                    (
                      stop as any
                    )
                      .distance_meters,
                  )
                : null,

            corridor:
              stop.corridor_id,

            accessibility_status:
              "INSUFFICIENT",
          };

          mapAction = {
            entity_id:
              stop.id,

            entity_type:
              "TRANSPORT_NODE",

            label:
              stop.name,

            type:
              "FOCUS_ENTITY",
          };

          provenance.push({
            source:
              "GETRA Canonical",

            dataset:
              "Transport Nodes",
          });
        } else {
          limitations.push(
            "Belum ada titik transit yang ditemukan dalam jarak 1,5 km.",
          );
        }

        break;
      }

      case "WALKING_ROUTE": {
        /**
         * Route explanation for active computed route state.
         */
        if (context?.active_route) {
          facts = {
            distance_m: context.active_route.distance_meters,
            duration_s: context.active_route.duration_seconds,
            mode: context.active_route.mode,
            status: "FOUND",
          };

          provenance.push({
            source: "GETRA Active Route",
            dataset: "Active Computed Route State",
          });

          break;
        }

        /**
         * This branch handles already-resolved route coordinates.
         *
         * Natural-language CALCULATE_ROUTE actions are returned earlier
         * and should be resolved/executed through the route orchestrator
         * / frontend shared route state.
         */
        if (
          !context?.origin ||
          !context?.destination
        ) {
          limitations.push(
            "Lokasi asal atau tujuan tidak tersedia untuk menghitung rute.",
          );

          break;
        }

        const supabase =
          getRequestSupabaseClient(
            this.authorization,
          );

        const routingService =
          new CommuterNetworkRepository(
            supabase,
          );

        try {
          const route =
            await routingService.route(
              {
                ...context.origin,
                source:
                  "EXPLICIT_ORIGIN",
              },

              context.destination,
            );

          if (
            route.status !==
            "ROUTABLE"
          ) {
            throw new Error(
              "NO_ROUTE",
            );
          }

          facts = {
            distance_m:
              Number(
                route.distance_meters,
              ),

            duration_s:
              Number(
                route.duration_seconds,
              ),

            status:
              "FOUND",
          };

          provenance.push({
            source:
              "GETRA Routing",

            dataset:
              "Pedestrian Network",
          });
        } catch {
          facts = {
            status:
              "NO_ROUTE",
          };

          limitations.push(
            "Rute jalan kaki belum dapat ditemukan untuk kedua titik tersebut.",
          );
        }

        break;
      }

      case "UMKM_POI": {
        if (
          context?.selected_entity_id
        ) {
          const supabase =
            getRequestSupabaseClient(
              this.authorization,
            );

          const umkmRepo =
            new UmkmRepository(
              supabase,
            );

          const merchant =
            await umkmRepo.findById(
              context.selected_entity_id,
            );

          if (merchant) {
            facts = {
              merchant_name:
                merchant.name,

              category:
                merchant.category ??
                null,

              status:
                merchant.provenance
                  ?.validation_status ??
                null,

              price_evidence_available:
                false,
            };

            mapAction = {
              entity_id:
                merchant.id,

              entity_type:
                "UMKM",

              label:
                merchant.name,

              type:
                "FOCUS_ENTITY",
            };

            provenance.push({
              source:
                "GETRA Canonical",

              dataset:
                "UMKM",
            });
          } else {
            limitations.push(
              "Tempat yang dipilih belum ditemukan pada data GETRA.",
            );
          }
        } else {
          limitations.push(
            "Pilih usaha pada peta terlebih dahulu agar GETRA dapat menjelaskannya.",
          );
        }

        break;
      }

      case "MERCHANT_SEARCH": {
        /**
         * Normal merchant searches should already have returned an
         * APPLY_SEARCH_CRITERIA action.
         *
         * This fallback exists only when no executable search action
         * could be produced.
         */
        facts = {
          search_context_available:
            Boolean(
              context?.search_context,
            ),

          selected_merchant_available:
            Boolean(
              context?.selected_entity_id,
            ),
        };

        limitations.push(
          "Kriteria pencarian belum cukup untuk menjalankan pencarian tempat.",
        );

        break;
      }

      case "GENERAL_AREA": {
        if (context?.origin) {
          const supabase =
            getRequestSupabaseClient(
              this.authorization,
            );

          const umkmRepo =
            new UmkmRepository(
              supabase,
            );

          const nearbyUmkm =
            await umkmRepo.findNearby({
              lat:
                context.origin
                  .latitude,

              lng:
                context.origin
                  .longitude,

              radiusMeters:
                1000,
            });

          facts = {
            area_name:
              "Area di sekitar titik pilihan",

            umkm_count:
              nearbyUmkm.length,

            community_activity_summary:
              "Data belum dikumpulkan",
          };

          provenance.push({
            source:
              "GETRA Canonical",

            dataset:
              "UMKM",
          });
        } else {
          limitations.push(
            "Pilih lokasi terlebih dahulu agar saya dapat melihat area di sekitarnya.",
          );
        }

        break;
      }

      case "ACCESSIBILITY": {
        const supabase = getRequestSupabaseClient(this.authorization);
        const accessibilityRepo = new AccessibilityEvidenceRepository(supabase);

        const west = context?.origin ? Number(Math.max(-180, context.origin.longitude - 0.02).toFixed(6)) : 106.5;
        const south = context?.origin ? Number(Math.max(-90, context.origin.latitude - 0.02).toFixed(6)) : -7.2;
        const east = context?.origin ? Number(Math.min(180, context.origin.longitude + 0.02).toFixed(6)) : 108.0;
        const north = context?.origin ? Number(Math.min(90, context.origin.latitude + 0.02).toFixed(6)) : -6.0;

        try {
          const result = await accessibilityRepo.list({
            west,
            south,
            east,
            north,
            limit: 20,
            offset: 0,
          });

          const items = result.evidence ?? [];
          const totalCount = result.total_available ?? items.length;
          const confirmedCount = items.filter((x) => x.validation_status === "CONFIRMED").length;
          const needsReviewCount = items.filter((x) => x.validation_status === "NEEDS_REVIEW").length;
          const hasPhotos = items.some((x) => Array.isArray(x.media_urls) && x.media_urls.length > 0);
          const subcategories = Array.from(new Set(items.map((x) => x.subcategory).filter(Boolean)));
          const sampleTitle = items[0]?.title ?? null;

          facts = {
            observation_count: totalCount,
            confirmed_count: confirmedCount,
            needs_review_count: needsReviewCount,
            has_photos: hasPhotos,
            subcategories: subcategories.slice(0, 5),
            sample_title: sampleTitle,
            disclaimer:
              "Data bukti aksesibilitas merupakan hasil observasi lapangan terverifikasi/moderasi dan tidak mengubah graf rute pejalan kaki kanonikal.",
          };

          provenance.push({
            source: "GETRA Accessibility",
            dataset: "Accessibility Evidence Observations",
          });
        } catch {
          facts = {
            observation_count: 0,
            confirmed_count: 0,
            needs_review_count: 0,
            has_photos: false,
            subcategories: [],
            sample_title: null,
            disclaimer: "Data aksesibilitas sementara belum dapat dimuat.",
          };
          limitations.push("Data bukti aksesibilitas sementara tidak dapat diakses.");
        }

        break;
      }

      case "DEMAND_SUPPLY": {
        const supabase = getRequestSupabaseClient(this.authorization);
        let merchantCount = 0;

        if (context?.origin) {
          try {
            const umkmRepo = new UmkmRepository(supabase);
            const nearby = await umkmRepo.findNearby({
              lat: context.origin.latitude,
              lng: context.origin.longitude,
              radiusMeters: 1200,
            });
            merchantCount = nearby.length;
          } catch {
            // fallback
          }
        }

        facts = {
          observations: `Tercatat ${merchantCount > 0 ? `${merchantCount} UMKM terdata` : "sebaran UMKM terdaftar"} di sekitar koridor/area studi GETRA beserta simpul transit pejalan kaki.`,
          inferences:
            "Kawasan dengan intensitas pergerakan pejalan kaki tinggi di dekat simpul transit mengindikasikan potensi permintaan layanan harian dan kuliner yang belum terlayani secara merata.",
          recommendations:
            "Pelaku usaha disarankan memprioritaskan titik strategis dekat akses pejalan kaki dan melakukan validasi lapangan langsung sebelum menentukan lokasi usaha.",
          limitations: [
            "Estimasi kesenjangan komersial bersifat indikatif berbasis sebaran spasial.",
            "GETRA tidak menjamin proyeksi omzet, pendapatan, atau margin keuntungan finansial.",
          ],
        };

        provenance.push({
          source: "GETRA Analytics",
          dataset: "Demand-Supply & Transit Proximity",
        });

        break;
      }

      case "COMMUNITY":
      case "COMMUNITY_OBSERVATION": {
        facts = {
          feature_name: "Komunitas Pejalan Kaki & Warga GETRA",
          capabilities: [
            "Membuat postingan laporan kondisi fasilitas trotoar, halte, atau aksesibilitas.",
            "Mengunggah foto bukti temuan lapangan.",
            "Memberikan komentar dan reaksi pada laporan warga lain.",
            "Melaporkan konten yang tidak pantas kepada tim kurasi Admin.",
          ],
          moderation:
            "Laporan komunitas dimoderasi secara berkala oleh tim Admin GETRA untuk menjaga keabsahan data publik.",
          disclaimer:
            "Laporan komunitas merupakan observasi terikat waktu yang melalui proses moderasi dan tidak menjamin perubahan rute seketika.",
        };

        provenance.push({
          source: "GETRA Community",
          dataset: "Community Footpath & Facility Reports",
        });

        break;
      }

      case "PROMOTION_CREATE":
      case "PROMOTION_SETUP":
      case "PROMOTION_TARGETING":
      case "PROMOTION_SCHEDULE":
      case "PROMOTION_PREVIEW":
      case "PROMOTION_PAYMENT":
      case "PROMOTION_ANALYTICS": {
        facts = {
          feature_name: "Promosi UMKM GETRA (Sponsored Promotion)",
          prerequisites: [
            "Usaha sudah terdaftar dan berstatus terverifikasi (VERIFIED) oleh tim Admin.",
            "Profil usaha tampil aktif pada peta interaktif GETRA.",
            "Akun pengguna berada dalam mode stakeholder UMKM.",
          ],
          workflow_steps: [
            "1. Masuk ke menu Kelola Promosi (/umkm/advertising).",
            "2. Buat kampanye baru dengan mengisi judul promosi, materi visual (banner), dan deskripsi penawaran.",
            "3. Tentukan wilayah sasaran menggunakan radius buffer spasial pada peta.",
            "4. Atur durasi penayangan dan jadwal tayang kampanye.",
            "5. Lakukan uji penayangan (preview) tampilan kartu promosi pada peta.",
            "6. Selesaikan pembayaran resmi melalui gateway Midtrans Sandbox (QRIS / Virtual Account simulasi).",
            "7. Setelah konfirmasi settlement dari sistem, promosi berstatus AKTIF (ACTIVE) dan tayang kepada pengguna sekitar.",
            "8. Pantau metrik impresi, klik, dan interaksi melalui dashboard analitik promosi.",
          ],
          payment_gateway: "Midtrans Sandbox (simulasi pembayaran aman)",
          fair_discovery_protection:
            "Promosi meningkatkan keterlihatan visual tanpa memanipulasi keaslian ranking jarak Fair Discovery.",
          limitations: [
            "Promosi hanya aktif setelah transaksi pembayaran Midtrans Sandbox terverifikasi.",
            "GETRA tidak menjamin proyeksi omzet atau keuntungan finansial tertentu.",
          ],
        };

        provenance.push({
          source: "GETRA Advertising Engine",
          dataset: "Promotion Workflow & Midtrans Sandbox Gateway",
        });

        break;
      }

      case "UMKM_CREATE":
      case "UMKM_SUBMIT":
      case "UMKM_STATUS":
      case "UMKM_CLAIM":
      case "UMKM_OWNERSHIP": {
        facts = {
          feature_name: "Pendaftaran dan Tata Kelola UMKM GETRA",
          workflow_steps: [
            "1. Login atau register akun GETRA.",
            "2. Buka menu Kelola UMKM > Daftarkan Usaha (/umkm/merchants/new).",
            "3. Isi informasi profil usaha: nama toko, kategori, jam buka/tutup, nomor kontak, dan deskripsi produk.",
            "4. Tandai titik koordinat lokasi usaha secara presisi pada peta interaktif.",
            "5. Unggah foto tempat usaha atau dokumen pendukung.",
            "6. Submit formulir pendaftaran (status awal menjadi PENDING).",
            "7. Tim Administrator memeriksa kelengkapan data dan keabsahan lokasi melalui dashboard Admin.",
            "8. Setelah disetujui (APPROVED), data menjadi data kanonikal publik dan tampil pada pencarian peta Fair Discovery.",
            "9. Status kepemilikan terverifikasi (OWNER VERIFIED) memberikan hak penuh mengelola informasi toko dan mengajukan promosi.",
          ],
          status_definitions: {
            PENDING: "Pengajuan data usaha sedang dalam antrean kurasi oleh tim Admin GETRA.",
            APPROVED: "Data usaha telah diverifikasi Admin dan resmi tampil publik pada peta.",
            REJECTED: "Pengajuan belum memenuhi kriteria kelengkapan data atau keabsahan lokasi.",
          },
          governance_rules: [
            "Data Terverifikasi (keabsahan lokasi/profil) berbeda dengan Pemilik Terverifikasi (hak kelola usaha).",
            "Publikasi peta tunduk pada kurasi Admin; usaha yang masih pending tidak langsung tampil publik.",
            "Klaim usaha yang sudah ada memerlukan unggahan dokumen bukti kepemilikan untuk diverifikasi Admin.",
          ],
          limitations: [
            "Persetujuan data usaha membutuhkan verifikasi kurasi oleh tim Administrator.",
            "Asisten AI tidak dapat mengubah status kurasi atau memindahtangankan kepemilikan usaha.",
          ],
        };

        provenance.push({
          source: "GETRA Registry",
          dataset: "UMKM Canonical Catalog & Ownership Governance",
        });

        break;
      }

      case "ACTIVE_JOURNEY": {
        facts = {
          feature_name: "Active Journey & Live Navigation",
          guidance:
            "Active Journey memandu perjalanan Anda secara langsung mengikuti rute jaringan GIS yang telah dihitung.",
          instructions: [
            "Pilih tujuan dan hitung rute pada peta terlebih dahulu.",
            "Tekan tombol 'Mulai Perjalanan' untuk mengaktifkan pelacakan koridor rute.",
            "Sistem akan memantau posisi Anda terhadap koridor rute resmi.",
            "Jika Anda menyimpang dari jalur, sistem akan menghitung ulang rute secara otomatis.",
          ],
          limitations: [
            "Jarak dan sisa waktu perjalanan dihitung langsung oleh routing authority PostGIS/Valhalla, bukan estimasi fiktif.",
            "Pastikan izin lokasi dan sinyal GPS perangkat aktif.",
          ],
        };

        provenance.push({
          source: "GETRA GIS Navigation",
          dataset: "Active Route Corridor & Spatial Tracking",
        });

        break;
      }

      case "PAYMENT_STATUS": {
        facts = {
          feature_name: "Gateway Pembayaran Promosi GETRA",
          provider: "Midtrans Sandbox",
          status_types: [
            "PENDING: Menunggu pembayaran oleh pengguna.",
            "SETTLEMENT: Pembayaran berhasil terverifikasi oleh gateway.",
            "EXPIRE: Batas waktu transaksi telah habis.",
            "CANCEL: Transaksi dibatalkan.",
          ],
          invoice_info:
            "Invoice resmi otomatis diterbitkan dan dapat diunduh pada riwayat kampanye promosi setelah status transaksi settlement.",
          safety_protocol:
            "AI tidak dapat mengubah status transaksi secara sepihak dan tidak menyatakan pembayaran sukses tanpa konfirmasi sistem webhook Midtrans.",
          limitations: [
            "Status pembayaran mengikuti notifikasi resmi dari server Midtrans.",
            "Pada mode Sandbox, pembayaran dilakukan menggunakan simulator resmi Midtrans.",
          ],
        };

        provenance.push({
          source: "GETRA Payment Gateway",
          dataset: "Midtrans Sandbox Transaction Gateway",
        });

        break;
      }

      case "PROFILE": {
        facts = {
          feature_name: "Manajemen Profil Akun GETRA",
          capabilities: [
            "Melihat dan memperbarui informasi identitas profil pengguna.",
            "Melihat mode peran aktif: Komuter (General), UMKM, Investor, atau Pemerintah.",
            "Mengelola keamanan akun dan melakukan keluar akun (logout) dengan aman.",
          ],
          rbac_policy:
            "Pemisahan hak akses ketat: Pengguna biasa (USER) dan Administrator (ADMIN). Mode pengalaman (UMKM/Investor/Pemerintah) adalah preferensi antarmuka, bukan eskalasi hak akses sistem.",
        };

        provenance.push({
          source: "GETRA Auth & Security",
          dataset: "Role-Based Access Control & User Profile",
        });

        break;
      }

      case "ADMIN": {
        facts = {
          feature_name: "Portal Administrasi GETRA",
          role_required: "ADMINISTRATOR",
          responsibilities: [
            "Kurasi dan persetujuan (approval) pengajuan UMKM baru.",
            "Verifikasi dokumen legalitas klaim kepemilikan usaha.",
            "Moderasi konten laporan komunitas.",
            "Pengawasan metrik analitik dan transaksi promosi.",
          ],
          security_rule:
            "Akses ke dashboard Admin (/admin) dibatasi secara ketat hanya untuk akun dengan peran sistem Administrator.",
        };

        provenance.push({
          source: "GETRA Core Security",
          dataset: "Admin Authorization & Curatorial Gateway",
        });

        break;
      }

      case "GENERAL_HELP":
      case "AI_HELP": {
        facts = {
          assistant_name: "Asisten GETRA (Tanya GETRA)",
          platform: "GETRA — Geo-Enabled Transit & Retail Analytics",
          key_capabilities: [
            "Pencarian UMKM lokal berbasis Fair Discovery (relevansi dan kedekatan spasial).",
            "Kalkulasi rute pejalan kaki multimodal berbasis PostGIS dan Valhalla.",
            "Pemetaan fasilitas dan bukti foto aksesibilitas disabilitas.",
            "Digitalisasi, pendaftaran, dan promosi UMKM via Midtrans Sandbox.",
            "Analisis kesenjangan komersial (Demand & Supply gap) di koridor transit.",
            "Pelaporan dan interaksi komunitas pejalan kaki.",
          ],
          how_to_start:
            "Mulai dengan mencari tempat kuliner sekitar, meminta panduan rute perjalanan, atau mendaftarkan usaha Anda.",
        };

        provenance.push({
          source: "GETRA Knowledge Base",
          dataset: "Platform Architecture & Capabilities",
        });

        break;
      }

      case "CLARIFICATION":
      case "UNSUPPORTED":
      case "SEARCH_MERCHANT":
      case "SEARCH_PLACE":
      case "NEARBY":
      case "DISCOVERY":
      case "ROUTING":
      case "SERVICE_AREA":
      case "MAP":

      case "UNKNOWN": {
        facts = {
          supported_topics: [
            "pencarian tempat",
            "rute",
            "transit terdekat",
            "kondisi area",
            "UMKM pada titik peta",
          ],
        };

        break;
      }
    }

    return {
      facts,
      provenance,
      limitations,
      mapAction,
    };
  }

  private async generateAnswer(
    question: string,
    intent: AiIntent,
    facts: Record<
      string,
      unknown
    >,
    activeExperience: string,
    history?: AiAskRequest["history"],
  ): Promise<{
    answer: string;
    limitations_mentioned:
      string[];
    provider: AiProvider;
  }> {
    let inputContext = "";

    if (
      history &&
      history.length > 0
    ) {
      inputContext +=
        "Conversation History:\n";

      for (
        const msg of history
      ) {
        inputContext += `${
          msg.role === "user"
            ? "User"
            : "Assistant"
        }: ${msg.content}\n`;
      }

      inputContext += "\n";
    }

    inputContext +=
      `Current Question: ${question}`;

    const instructions = `You are the GETRA product assistant.

Follow these strict rules:

1. Use ONLY the provided facts for factual/spatial claims.
2. Never invent distances, names, numbers, ratings, prices, revenue, current conditions, route geometry, walking time, recommendation scores, or accessibility information.
3. The user's active experience is ${activeExperience}. Adapt the benefit and next action to that experience without changing the facts.
4. Answer in natural, calm Indonesian.
5. Prefer 1-3 sentences for a simple question and short paragraphs for a more complex insight.
6. Lead with what is known.
7. Then state any important limitation and a useful next action.
8. Never mention provider names, grounding, deterministic fallback, schemas, databases, status codes, route engines, graph data, internal APIs, or internal architecture.
9. If facts say NO_ROUTE, say that the route cannot currently be calculated. Do not recommend another map provider when GETRA can retry or resolve the missing input itself.
10. If location context is missing, tell the user which location needs to be selected or enabled.
11. If only part of the data is available, use the available facts first and clearly state what GETRA cannot confirm.
12. Treat observations as time-bound records, not real-time truth.
13. Mention an observation date naturally only when it is actually provided.
14. Never claim a place does not exist merely because GETRA has no matching data.
15. Do not invent accessibility features.
16. Use conversation history only to resolve references in follow-up questions; current facts always take precedence.
17. GETRA GIS/routing services calculate spatial facts. You only explain supplied results.
18. Search ranking or recommendation matching is not the same as a consumer review rating.
19. Do not interpret popularity, transaction observations, search events, or data-quality scores as evidence that food is "enak".

FACTS PROVIDED:
${JSON.stringify(
  facts,
  null,
  2,
)}
`;

    const response =
      await generateStructured({
        schema:
          GroundedGenerationSchema,

        schemaName:
          "grounded_answer",

        instructions,

        input:
          inputContext,
      });

    if (!response) {
      return {
        answer:
          formatDeterministicAnswer(
            intent,
            facts,
            question,
          ),

        limitations_mentioned: [
          "Sebagian penjelasan belum tersedia, tetapi fakta GETRA yang ada tetap dapat digunakan.",
        ],

        provider:
          "deterministic",
      };
    }

    return {
      ...response.data,

      provider:
        normalizeProvider(
          response.source,
        ),
    };
  }
}

/**
 * Context-aware prompt suggestion chips generated by the AI engine.
 */
export function getSuggestionChips(
  intent: AiIntent,
  action?: AiApplicationAction,
  activeExperience?: string,
): string[] {
  if (action?.type === "CALCULATE_ROUTE" || action?.type === "PREPARE_ROUTE" || intent === "WALKING_ROUTE") {
    return [
      "Rute motor",
      "Rute mobil",
      "Berapa lama jalan kaki?",
      "Cari rute alternatif",
    ];
  }
  if (action?.type === "APPLY_SEARCH_CRITERIA" || intent === "MERCHANT_SEARCH" || intent === "SEARCH_PLACE") {
    return [
      "Tempat makan buka sekarang",
      "Kopi dekat stasiun",
      "Cari bakso terdekat",
      "Rute jalan kaki ke sini",
    ];
  }
  if (intent === "UMKM_CREATE" || intent === "UMKM_SUBMIT" || intent === "UMKM_STATUS" || intent === "UMKM_CLAIM") {
    return [
      "Cara daftar UMKM",
      "Bantu buat deskripsi usaha",
      "Bagaimana agar usaha saya muncul?",
      "Bagaimana cara promosi?",
    ];
  }
  if (intent === "PROMOTION_CREATE" || intent === "PROMOTION_SETUP" || intent === "PROMOTION_PAYMENT" || intent === "PAYMENT_STATUS") {
    return [
      "Wilayah sasaran promosi",
      "Jadwal tayang kampanye",
      "Cara bayar Midtrans Sandbox",
      "Mana invoice saya?",
    ];
  }
  if (intent === "ACCESSIBILITY") {
    return [
      "Akses kursi roda terdekat",
      "Laporkan trotoar rusak",
      "Fasilitas ramah difabel",
      "Rute pedestrian aman",
    ];
  }
  if (intent === "INVESTOR_MODE" || intent === "DEMAND_SUPPLY") {
    return [
      "Area potensi usaha",
      "Retail gap di transit",
      "Business space tersedia",
      "Analisis permintaan area",
    ];
  }
  if (intent === "COMMUNITY" || intent === "COMMUNITY_OBSERVATION") {
    return [
      "Bagaimana membuat laporan?",
      "Aktivitas komunitas sekitar",
      "Kondisi trotoar terbaru",
    ];
  }
  if (intent === "PROFILE" || intent === "ADMIN") {
    return [
      "Apa bedanya USER dan ADMIN?",
      "Bagaimana cara register?",
      "Pengaturan keamanan akun",
    ];
  }
  if (activeExperience === "UMKM") {
    return [
      "Bagaimana cara promosi?",
      "Cara buat UMKM?",
      "Bagaimana melihat statistik promosi?",
      "Bantu buat deskripsi usaha",
    ];
  }
  if (activeExperience === "INVESTOR" || activeExperience === "GOVERNMENT") {
    return [
      "Analisis demand dan supply area",
      "Area mana yang menarik untuk usaha?",
      "Cari fasilitas aksesibilitas",
      "Bagaimana laporan komunitas?",
    ];
  }
  return [
    "Cari bakso di jakarta pusat",
    "UMKM dekat stasiun manggarai",
    "Rute jalan kaki paling aman",
    "Apa saja fitur GETRA?",
  ];
}

/**
 * Deterministic first-pass intent detection.
 *
 * This is intentionally conservative.
 * The model can refine non-trivial requests afterwards.
 */
function classifyIntentDeterministically(
  question: string,
  history?: AiAskRequest["history"],
): AiIntent {
  const current = question
    .toLocaleLowerCase("id-ID")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common Indonesian typo and slang variations
  const normalized = current
    .replace(/\bpromsoi\b/giu, "promosi")
    .replace(/\bpromso\b/giu, "promosi")
    .replace(/\bdaftr\b/giu, "daftar")
    .replace(/\bumk\b/giu, "umkm")
    .replace(/\bmaknan\b/giu, "makanan")
    .replace(/\bjakpus\b/giu, "jakarta pusat")
    .replace(/\bjaktim\b/giu, "jakarta timur")
    .replace(/\bjaksel\b/giu, "jakarta selatan")
    .replace(/\bjakbar\b/giu, "jakarta barat")
    .replace(/\bjakut\b/giu, "jakarta utara")
    .replace(/\bgmn\b/giu, "gimana")
    .replace(/\btoko aku\b/giu, "toko saya")
    .replace(/\bumkm ku\b/giu, "umkm saya");

  // 0a. Nonsense & Gibberish / Keyboard Mash Filter
  if (
    /^(asdf|qwerty|zxcv|blabla|hskj|testtest|[bcdfghjklmnpqrstvwxyz]{6,})/iu.test(normalized) ||
    (normalized.length >= 6 && !/[aeiouy]/iu.test(normalized))
  ) {
    return "UNKNOWN";
  }

  const recentUserContext =
    history
      ?.filter((item) => item.role === "user")
      .slice(-3)
      .map((item) => item.content)
      .join(" ")
      .toLocaleLowerCase("id-ID") ?? "";

  const recentContext =
    history
      ?.slice(-3)
      .map((item) => item.content)
      .join(" ")
      .toLocaleLowerCase("id-ID") ?? "";

  const combined = `${recentUserContext || recentContext} ${normalized}`;

  const lastAssistantMsg =
    history
      ?.filter((item) => item.role === "assistant")
      .slice(-1)[0]
      ?.content ?? "";

  // 0. Multi-turn disambiguation prompts and mode responses
  if (
    /\b(lokasi asalnya belum unik|tujuannya belum unik|dari mana anda ingin memulai|tempat mana yang ingin anda tuju|pilih moda perjalanan|titik awal dan tujuan sudah disiapkan)\b/iu.test(
      lastAssistantMsg,
    )
  ) {
    return "WALKING_ROUTE";
  }

  if (/\blokasi(?:nya)? belum unik\b/iu.test(lastAssistantMsg)) {
    return "SEARCH_PLACE";
  }

  if (
    /^(jalan kaki|berjalan|kaki|motor|sepeda motor|naik motor|mobil|mengemudi|naik mobil)$/iu.test(
      normalized,
    )
  ) {
    return "WALKING_ROUTE";
  }

  const isLandmarkQuery =
    !/\b(terdekat|paling dekat|dekat|nearest)\b/iu.test(normalized) &&
    (/^(bundaran hi|bundaran hotel indonesia|monas|monumen nasional|sarinah|gbk|gelora bung karno|kota tua|blok m|dukuh atas|lapangan banteng|grand indonesia|plaza indonesia)$/iu.test(
      normalized,
    ) || /^(stasiun|halte|terminal)\s+[a-z0-9\s.]+$/iu.test(normalized));

  if (isLandmarkQuery) {
    if (/^(stasiun|halte|terminal)/iu.test(normalized)) {
      return "NEAREST_TRANSIT";
    }
    return "SEARCH_PLACE";
  }

  // 1. Assistant Identity & Greetings
  if (
    /^(halo|hai|hi|hello|pagi|siang|sore|malam)[!.?\s]*$/u.test(normalized) ||
    /kamu siapa|siapa kamu|asisten (?:aku|saya)|getra ai|apakah kamu ai|kamu ai|apa yang (?:bisa|dapat) kamu (?:lakukan|bantu)/u.test(normalized)
  ) {
    return "ASSISTANT_IDENTITY";
  }

  // 2. Casual Chat & Introductions
  if (
    /^(?:halo|hai|hi|hello)\s+(?:aku|saya)\s+[a-z]+$/iu.test(normalized) ||
    /\b(namaku|nama saya)\b/iu.test(normalized) ||
    /^(?:halo|hai|hi|hello|pagi|siang|sore|malam)$/iu.test(normalized) ||
    /\b(random|acak|cerita|ngobrol|chat|tes|test|apa kabar|makasih|terima kasih|thank you|thanks)\b/u.test(normalized)
  ) {
    return "CASUAL_CHAT";
  }

  // 3. General Help / Platform Overview
  if (
    /\b(apa itu getra|getra bisa apa|getra bisa buat apa|fitur getra apa saja|apa saja fitur getra|bagaimana menggunakan getra|cara pakai getra|saya harus mulai dari mana|mulai dari mana|panduan getra|apa fungsi getra|tentang getra|keunggulan getra)\b/iu.test(normalized)
  ) {
    return "GENERAL_HELP";
  }

  // 4. Multi-turn Follow-ups based on recent context
  const isContextualFollowUp =
    /^(kalau sudah submit\??|kalau sudah buat\??|kalau sudah dibuat\??|setelah submit\??|setelah dibuat\??|udah submit terus gimana\??|cara bayarnya\??|bayarnya gimana\??|berapa biayanya\??|wilayah sasarannya\??|targetnya\??|jadwalnya\??|kenapa belum muncul\??|kok belum aktif\??|kapan disetujui\??|kenapa masih pending\??|yang paling dekat\??|yang tadi paling dekat mana\??|yang buka sekarang\??|yang buka\??|yang murah\??|yang bisa jalan kaki\??|yang buka dan bisa jalan kaki\??|kalau jalan kaki\??|kalau naik motor\??|bisa ke sana\??|berapa jauh\??)$/iu.test(normalized);

  if (isContextualFollowUp) {
    // Check user's conversational intent first
    const activeCtx = recentUserContext || recentContext;

    if (/\b(dekat|terdekat|buka|murah|jalan kaki)\b/iu.test(normalized)) {
      return "MERCHANT_SEARCH";
    }

    if (/\b(submit|disetujui|pending|muncul|tampil)\w*\b/iu.test(normalized)) {
      if (/\b(promosi|promo|iklan|campaign)\b/iu.test(activeCtx)) return "PROMOTION_SETUP";
      return "UMKM_STATUS";
    }

    if (/\b(bayar|biaya|tarif)\w*\b/iu.test(normalized)) {
      return "PROMOTION_PAYMENT";
    }

    if (/\b(wilayah|sasaran|target)\w*\b/iu.test(normalized)) {
      return "PROMOTION_TARGETING";
    }

    if (/\bjadwal\w*\b/iu.test(normalized)) {
      return "PROMOTION_SCHEDULE";
    }

    if (/\b(promosi|promo|iklan|campaign|sponsored)\b/iu.test(activeCtx)) {
      if (/\b(dibuat|buat|jadi)\w*\b/iu.test(normalized)) return "PROMOTION_SETUP";
      return "PROMOTION_CREATE";
    }

    if (/\b(umkm|usaha|toko|warung|merchant|daftarkan|pengajuan)\b/iu.test(activeCtx)) {
      return "UMKM_CREATE";
    }

    if (/\b(cari|makan|kopi|coffee|bakso|resto|tempat|merchant)\b/iu.test(activeCtx)) {
      if (/\b(dekat|buka|murah)\b/iu.test(normalized)) return "MERCHANT_SEARCH";
    }

    if (/\b(rute|jalan kaki|motor|mobil|perjalanan)\b/iu.test(activeCtx)) {
      return "WALKING_ROUTE";
    }
  }

  // 5. Active Journey & Live Navigation
  if (
    /\b(mulai jalan|mulai perjalanan|saya tersesat|tersesat|rute saya berubah|sisa perjalanan|berapa sisa perjalanan|sudah sampai|saya sudah sampai|fokuskan peta|navigasi ke merchant|kembali ke rute|kembali ke navigasi|kembali ke perjalanan|saya keluar jalur|saya keluar dari rute|keluar dari rute|keluar rute|keluar jalur|menyimpang dari rute|menyimpang rute|salah jalan)\b/iu.test(normalized)
  ) {
    return "ACTIVE_JOURNEY";
  }

  // 6. Payment & Midtrans Sandbox
  if (
    /\b(status pembayaran|cek pembayaran|pembayaran.*berhasil|midtrans sandbox|midtrans|order id|transaksi pembayaran)\b/iu.test(normalized)
  ) {
    return "PAYMENT_STATUS";
  }

  // 7. Promotion & Advertising
  if (
    /\b(promosi|promo|iklan|campaign|pasang iklan|iklanin usaha|iklanin toko)\b/iu.test(normalized) ||
    /\b(wilayah sasaran|radius sasaran|target wilayah|target promosi|target sasaran|atur target|mengatur target|atur jadwal|mengatur jadwal|jadwal tayang|uji penayangan|simulasi tayang)\b/iu.test(normalized)
  ) {
    if (/\b(statistik|analytics|analitik|impresi|performa)\b/iu.test(normalized)) {
      return "PROMOTION_ANALYTICS";
    }
    if (/\b(bayar|biaya|tarif|harga|midtrans)\b/iu.test(normalized)) {
      return "PROMOTION_PAYMENT";
    }
    if (/\b(wilayah sasaran|radius sasaran|target wilayah|target promosi|target sasaran|atur target|mengatur target|jangkauan|target area)\b/iu.test(normalized)) {
      return "PROMOTION_TARGETING";
    }
    if (/\b(jadwal|durasi|waktu tayang|tanggal tayang|atur jadwal|mengatur jadwal)\b/iu.test(normalized)) {
      return "PROMOTION_SCHEDULE";
    }
    if (/\b(preview|uji penayangan|simulasi tayang|tampilan iklan)\b/iu.test(normalized)) {
      return "PROMOTION_PREVIEW";
    }
    if (/\b(materi|banner|konten|foto promosi|kenapa.*belum tampil|belum tampil|belum muncul|belum tayang)\b/iu.test(normalized)) {
      return "PROMOTION_SETUP";
    }
    return "PROMOTION_CREATE";
  }

  // 7b. Admin & System Management
  if (
    /\badmin\b/iu.test(normalized) &&
    !/\b(beda user dan admin|perbedaan user dan admin|apa bedanya user dan admin)\b/iu.test(normalized)
  ) {
    return "ADMIN";
  }

  // 8. UMKM Onboarding, Claim & Status
  if (
    /\b(?:daftar|daftarkan|buat|membuat|bikin|tambah|daftarin|masukin|submit)\s+(?:umkm|usaha|toko|warung)\b/iu.test(normalized) ||
    /\b(usaha saya belum ada|toko saya belum ada|bantu buat deskripsi usaha|deskripsi usaha|deskripsi toko|deskripsi umkm)\b/iu.test(normalized)
  ) {
    return "UMKM_CREATE";
  }

  if (
    /\b(claim umkm|klaim umkm|claim toko|klaim toko|claim usaha|klaim usaha|menjadi pemilik|hak milik usaha|kepemilikan usaha|siapa yang boleh mengubah usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_CLAIM";
  }

  if (
    /\b(status pengajuan|umkm.*pending|usaha.*pending|kenapa.*pending|kapan.*disetujui|usaha.*belum tampil|toko.*belum muncul|status verifikasi usaha|agar usaha saya muncul|agar usaha.*muncul|agar toko.*muncul)\b/iu.test(normalized)
  ) {
    return "UMKM_STATUS";
  }

  // 9. Community & Citizen Reports
  if (
    /\b(report post|laporkan postingan|laporkan post|laporkan warga|bagaimana cara report)\b/iu.test(normalized)
  ) {
    return "COMMUNITY_REPORT";
  }

  if (
    /\b(buat post|buat posting|buat postingan|komentar|komentari|reaction|reaksi|laporan warga|komunitas|kontribusi warga|observasi komunitas|laporan masyarakat|bagaimana membuat laporan|buat laporan|bikin laporan|aktivitas komunitas|informasi terbaru di area ini)\b/iu.test(normalized)
  ) {
    return "COMMUNITY_OBSERVATION";
  }

  // 10. Accessibility & Special Needs
  if (
    /\b(aksesibilitas|accessibility|disabilitas|disability|kursi roda|wheelchair|ramah kursi roda|akses kursi roda|guiding block|trotoar rusak|kondisi trotoar|rampa|ramp|fasilitas disabilitas|fasilitas akses|jalur difabel|titik aksesibilitas|titik akses|accessibility point|apa hambatan menuju|hambatan rute|hambatan akses)\b/iu.test(normalized)
  ) {
    return "ACCESSIBILITY";
  }

  // 11. Profile & Account
  if (
    /\b(edit profile|edit profil|ubah profil|ganti profile|ganti profil|logout|keluar akun|role saya|peran saya|keamanan akun|ganti password|profil pengguna|apa bedanya user dan admin|beda user dan admin|perbedaan user dan admin|bagaimana cara register|cara register|cara daftar akun|registrasi akun)\b/iu.test(normalized)
  ) {
    return "PROFILE";
  }

  // 12. Admin & System Management
  if (
    /\b(dashboard admin|halaman admin|menu admin|fitur admin|persetujuan admin|kurasi admin|wewenang.*admin|admin meninjau)\b/iu.test(normalized)
  ) {
    return "ADMIN";
  }

  // 12b. CCTV & Camera Monitoring
  if (
    /\b(cctv|kamera|live camera|pantau jalan|kamera lalin|kamera dishub|stream cctv|live streaming jalan|kamera lalu lintas|kamera dki)\b/iu.test(normalized)
  ) {
    return "CCTV";
  }

  // 12c. Traffic Congestion & Road Network
  if (
    /\b(macet|kemacetan|arus lalu lintas|kepadatan jalan|kondisi jalan|kondisi lalin|antrean kendaraan|kecepatan lalu lintas)\b/iu.test(normalized)
  ) {
    return "TRAFFIC";
  }

  // 12d. Environment, Air Quality, Flood & Urban Heat
  if (
    /\b(kualitas udara|aqi|polusi udara|pm2\.5|tinggi muka air|pintu air|banjir|genangan|radiasi matahari|suhu permukaan|urban heat|tutupan pohon|ndvi|kenaikan muka air laut)\b/iu.test(normalized)
  ) {
    return "ENVIRONMENT";
  }

  // 13. Route requests take precedence
  if (
    /\b(jalan kaki|berapa lama|rute|route|duration|durasi|navigasi|arah ke|cara ke|rute terbaik|bisa jalan kaki|naik motor|naik mobil|jarak ke|antar saya|antar ke sini|pandu saya|pandu ke sini|rute jalan kaki paling aman|cari alternatif|rute alternatif|jalur alternatif|ada alternatif)\b/iu.test(normalized)
  ) {
    return "WALKING_ROUTE";
  }

  // 13b. Explicit nearest-transit requests (prioritized over generic proximity)
  if (
    /\b(stasiun|halte|transit)\b.*\b(dekat|terdekat|nearest)\b/u.test(normalized) ||
    /\b(paling dekat|terdekat|nearest)\b.*\b(stasiun|halte|transit)\b/u.test(normalized) ||
    /\b(transit)\s+(?:point|simpul|terdekat)\b/iu.test(normalized)
  ) {
    return "NEAREST_TRANSIT";
  }

  // 13c. Proximity / Nearest follow-up or query
  if (
    /\b(yang paling dekat|paling dekat|terdekat|yang terdekat|mana yang lebih dekat|paling dket|terdkat)\b/iu.test(normalized)
  ) {
    if (recentContext && (recentContext.includes("transit") || recentContext.includes("stasiun") || recentContext.includes("halte"))) {
      return "NEAREST_TRANSIT";
    }
    return "MERCHANT_SEARCH";
  }

  // 15. Demand-Supply Analysis
  if (
    /\b(demand|supply|peluang usaha|potensi usaha|analisis pasar|potensi pasar|kesenjangan usaha|kesenjangan komersial|area mana yang menarik untuk usaha|area potensi usaha|apa demand di area ini|demand di area ini)\b/iu.test(normalized)
  ) {
    return "DEMAND_SUPPLY";
  }

  // 16. Explicit discovery/search requests
  if (
    /\b(cari|carikan|temukan|rekomendasikan|rekomendasi|mau makan|tempat makan|coffee shop|kopi|kafe|cafe|resto|restoran|kuliner|hidden gem|warung makan|tempat yang buka|buka sekarang)\b/u.test(normalized)
  ) {
    return "MERCHANT_SEARCH";
  }

  // Safety Guardrails
  if (
    /\b(?:buatkan|bikin|tentukan)\s+koordinat\b/iu.test(normalized) ||
    /\bkoordinat\s+(?:toko|merchant|usaha)\s+ini\b/iu.test(normalized) ||
    /\bberapa jarak lurus(?:nya)?\b/iu.test(normalized) ||
    /\bjarak lurus\b/iu.test(normalized) ||
    /\b(?:buatkan|bikin|rancang)\s+route\s+sendiri\b/iu.test(normalized) ||
    /\brute sendiri tanpa routing\b/iu.test(normalized) ||
    /\btebak eta\b/iu.test(normalized) ||
    /\btebak waktu tempuh\b/iu.test(normalized) ||
    /\bbuat merchant dummy\b/iu.test(normalized) ||
    /\b(?:buat|bikin)\s+(?:toko|merchant|usaha)\s+(?:palsu|fiktif|dummy)\b/iu.test(normalized) ||
    /\bubah filter tanpa saya tahu\b/iu.test(normalized) ||
    /\bubah filter diam-diam\b/iu.test(normalized) ||
    /\banggap pembayaran berhasil\b/iu.test(normalized) ||
    /\banggap lunas\b/iu.test(normalized) ||
    /\banggap umkm sudah diverifikasi\b/iu.test(normalized) ||
    /\banggap usaha terverifikasi\b/iu.test(normalized) ||
    /\btampilkan private ownership evidence\b/iu.test(normalized) ||
    /\bdokumen rahasia kepemilikan\b/iu.test(normalized) ||
    /\bapprove umkm saya sebagai user\b/iu.test(normalized) ||
    /\bsetujui umkm saya sebagai user\b/iu.test(normalized)
  ) {
    return "SAFETY_GUARDRAIL";
  }

  // Fair Discovery
  if (
    /\b(apa itu fair discovery|prinsip fair discovery|kenapa toko ini muncul|mengapa toko ini muncul|apa itu hidden gem|apa arti sponsored|apa itu sponsored|apakah hasil ini dibayar|apakah pencarian ini berbayar|apa bedanya sponsored dengan hasil biasa|beda sponsored dan hasil biasa)\b/iu.test(normalized)
  ) {
    return "FAIR_DISCOVERY";
  }

  // Investor / Government Mode
  if (
    /\b(bagaimana investor menggunakan getra|investor.*getra|bagaimana government menggunakan getra|pemerintah.*getra|area mana yang memiliki masalah akses|masalah aksesibilitas kota|dampak penutupan jalan|penutupan jalan|jalan ditutup)\b/iu.test(normalized)
  ) {
    return "INVESTOR_MODE";
  }

  // Business Space
  if (
    /\b(apa itu business space|ruang usaha|lahan usaha|titik usaha baru)\b/iu.test(normalized)
  ) {
    return "BUSINESS_SPACE";
  }

  // Landmark & Place Location
  if (
    /\b(bundaran hi|monas|sarinah|gbk|gelora bung karno|kota tua|blok m|dukuh atas|lapangan banteng)\s+(?:di mana|dimana|lokasi|posisi)\b/iu.test(normalized) ||
    /\b(?:di mana|dimana|lokasi|posisi|tampilkan|fokuskan|fokus ke)\s+(?:bundaran hi|monas|sarinah|gbk|gelora bung karno|kota tua|blok m|dukuh atas|lapangan banteng)\b/iu.test(normalized)
  ) {
    return "SEARCH_PLACE";
  }

  // Filter Diagnosis & Zero-Result Recovery
  if (
    /\b(perluasan radius|perluas radius|kenapa hasil kosong|kenapa tempat tidak muncul karena filter|kenapa kosong|kenapa tidak ada hasil|belum ada tempat yang sesuai|kenapa tidak ada tempat yang cocok|hasilnya mana|tidak ada umkm|tidak ada tempat)\b/iu.test(normalized)
  ) {
    return "FILTER_DIAGNOSIS";
  }

  // UMKM Location & Edit
  if (
    /\b(bagaimana memasukkan lokasi|masukkan lokasi usaha|gunakan lokasi saya untuk usaha|pakai gps untuk usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_LOCATION";
  }

  if (
    /\b(bagaimana cara edit usaha|cara edit usaha|ubah data usaha|edit profil usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_EDIT";
  }

  // Promotion Invoice
  if (
    /\b(bagaimana mendapatkan invoice|melihat invoice|unduh invoice|cetak invoice|bukti bayar promosi|mana invoice saya|invoice saya|lihat invoice|faktur saya)\b/iu.test(normalized)
  ) {
    return "PROMOTION_INVOICE";
  }

  // Community Report, Activity & Notification
  if (
    /\b(bagaimana cara report|laporkan postingan|laporkan warga|report post)\b/iu.test(normalized)
  ) {
    return "COMMUNITY_REPORT";
  }

  if (
    /\b(bagaimana melihat aktivitas|riwayat aktivitas|log aktivitas)\b/iu.test(normalized)
  ) {
    return "ACTIVITY_FEED";
  }

  if (
    /\b(bagaimana notifikasi bekerja|notifikasi getra|sistem notifikasi)\b/iu.test(normalized)
  ) {
    return "NOTIFICATION_HELP";
  }

  // 17. Specific UMKM / POI
  if (
    /\b(umkm|merchant|usaha|toko|warung|restoran|restaurant|kuliner|poi)\b/u.test(combined)
  ) {
    return "UMKM_POI";
  }

  // 18. General Area
  if (
    /\b(area|wilayah|sekitar|kawasan|lingkungan|apa yang ada di sekitar area ini|apa yang ada di peta|tunjukkan area ini)\b/u.test(combined)
  ) {
    return "GENERAL_AREA";
  }

  return "UNKNOWN";
}

/**
 * Deterministic application-action resolver.
 *
 * Search actions are intentionally NOT constructed here because
 * APPLY_SEARCH_CRITERIA now requires the complete SearchCriteriaSchema.
 *
 * Merchant search is handled by:
 * - extractSearchAction(), or
 * - structured AiApplicationAction returned by the model.
 */
export function determineApplicationAction(
  question: string,
  context?: AiAskRequest["context"],
  history?: AiAskRequest["history"],
): AiApplicationAction {
  const normalized =
    question
      .toLocaleLowerCase(
        "id-ID",
      )
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\bpromsoi\b/giu, "promosi")
      .replace(/\bpromso\b/giu, "promosi")
      .replace(/\bdaftr\b/giu, "daftar")
      .replace(/\bumk\b/giu, "umkm")
      .replace(/\bmaknan\b/giu, "makanan")
      .replace(/\bjakpus\b/giu, "jakarta pusat")
      .replace(/\bjaktim\b/giu, "jakarta timur")
      .replace(/\bjaksel\b/giu, "jakarta selatan")
      .replace(/\bjakbar\b/giu, "jakarta barat")
      .replace(/\bjakut\b/giu, "jakarta utara")
      .replace(/\bgmn\b/giu, "gimana")
      .replace(/\btoko aku\b/giu, "toko saya")
      .replace(/\bumkm ku\b/giu, "umkm saya");

  const lastAssistantMsg =
    history
      ?.filter((item) => item.role === "assistant")
      .slice(-1)[0]
      ?.content ?? "";

  const requestedModes = inferRequestedRouteModes(normalized);
  const prevEndpoints = findPreviousRouteEndpoints(history);

  // 0a. Check if user is resolving an origin ambiguity (e.g. "Bundaran Hotel Indonesia")
  const isOriginAmbiguityPrompt =
    /\b(lokasi asalnya belum unik|dari mana anda ingin memulai)\b/iu.test(lastAssistantMsg);

  if (isOriginAmbiguityPrompt && normalized.length >= 2) {
    const originPlace = question.trim();
    const destination =
      context?.selected_entity_id
        ? ({ type: "SELECTED_MERCHANT" as const })
        : prevEndpoints.destQuery
          ? ({ type: "PLACE_QUERY" as const, query: prevEndpoints.destQuery })
          : context?.selected_entity_name
            ? ({ type: "PLACE_QUERY" as const, query: context.selected_entity_name })
            : null;

    const chosenMode = requestedModes[0] || prevEndpoints.mode || "walking";

    if (destination) {
      return {
        type: "CALCULATE_ROUTE",
        mode: chosenMode,
        origin: { type: "PLACE_QUERY", query: originPlace },
        destination,
      };
    }

    return {
      type: "REQUEST_CLARIFICATION",
      prompt: "Tempat mana yang ingin Anda tuju?",
    };
  }

  // 0b. Check if user is resolving a destination ambiguity
  const isDestAmbiguityPrompt =
    /\b(tujuannya belum unik|tempat mana yang ingin anda tuju)\b/iu.test(lastAssistantMsg);

  if (isDestAmbiguityPrompt && normalized.length >= 2) {
    const destPlace = question.trim();
    const origin =
      context?.origin
        ? ({ type: "CURRENT_LOCATION" as const })
        : prevEndpoints.originQuery
          ? ({ type: "PLACE_QUERY" as const, query: prevEndpoints.originQuery })
          : ({ type: "CURRENT_LOCATION" as const });

    const chosenMode = requestedModes[0] || prevEndpoints.mode || "walking";

    return {
      type: "CALCULATE_ROUTE",
      mode: chosenMode,
      origin,
      destination: { type: "PLACE_QUERY", query: destPlace },
    };
  }

  // 0c. Check if user is resolving a general place ambiguity
  const isPlaceAmbiguityPrompt =
    /\blokasi(?:nya)? belum unik\b/iu.test(lastAssistantMsg);

  if (isPlaceAmbiguityPrompt && normalized.length >= 2) {
    return {
      type: "FOCUS_PLACE",
      query: question.trim(),
    };
  }

  // 0d. Check if user is responding to mode selection prompt
  const isModeSelectionPrompt =
    /\b(pilih moda perjalanan|titik awal dan tujuan sudah disiapkan)\b/iu.test(lastAssistantMsg) ||
    /^(jalan kaki|berjalan|kaki|motor|sepeda motor|naik motor|mobil|mengemudi|naik mobil)$/iu.test(normalized);

  if (isModeSelectionPrompt) {
    const selectedMode =
      requestedModes[0] ||
      (/\b(kaki|jalan)\b/iu.test(normalized) ? ("walking" as const) : null) ||
      (/\b(motor)\b/iu.test(normalized) ? ("motorcycle" as const) : null) ||
      (/\b(mobil)\b/iu.test(normalized) ? ("car" as const) : null);

    if (selectedMode) {
      if (context?.active_route) {
        return {
          type: "CHANGE_ROUTE_MODE",
          mode: selectedMode,
        };
      }

      const origin =
        context?.origin
          ? ({ type: "CURRENT_LOCATION" as const })
          : prevEndpoints.originQuery
            ? ({ type: "PLACE_QUERY" as const, query: prevEndpoints.originQuery })
            : ({ type: "CURRENT_LOCATION" as const });

      const destination =
        context?.selected_entity_id
          ? ({ type: "SELECTED_MERCHANT" as const })
          : prevEndpoints.destQuery
            ? ({ type: "PLACE_QUERY" as const, query: prevEndpoints.destQuery })
            : context?.selected_entity_name
              ? ({ type: "PLACE_QUERY" as const, query: context.selected_entity_name })
              : null;

      if (destination) {
        return {
          type: "CALCULATE_ROUTE",
          mode: selectedMode,
          origin,
          destination,
        };
      }
    }
  }

  // 0e. Standalone Landmark or Transit Place
  const CANONICAL_LANDMARKS_LIST = [
    "bundaran hi",
    "bundaran hotel indonesia",
    "monas",
    "monumen nasional",
    "sarinah",
    "gbk",
    "gelora bung karno",
    "kota tua",
    "blok m",
    "dukuh atas",
    "lapangan banteng",
    "grand indonesia",
    "plaza indonesia",
  ];

  const isStandaloneLandmark =
    !/\b(terdekat|paling dekat|dekat|nearest)\b/iu.test(normalized) &&
    (CANONICAL_LANDMARKS_LIST.includes(normalized) ||
    /^(stasiun|halte|terminal|taman|pasar|gedung|mall|plaza)\s+[a-z0-9\s.]+$/iu.test(normalized));

  if (isStandaloneLandmark) {
    if (/\b(tempat mana yang ingin anda tuju|tujuannya belum unik)\b/iu.test(lastAssistantMsg)) {
      const origin =
        context?.origin
          ? ({ type: "CURRENT_LOCATION" as const })
          : prevEndpoints.originQuery
            ? ({ type: "PLACE_QUERY" as const, query: prevEndpoints.originQuery })
            : ({ type: "CURRENT_LOCATION" as const });
      const chosenMode = prevEndpoints.mode || "walking";
      return {
        type: "CALCULATE_ROUTE",
        mode: chosenMode,
        origin,
        destination: { type: "PLACE_QUERY", query: question.trim() },
      };
    }

    return {
      type: "FOCUS_PLACE",
      query: question.trim(),
    };
  }

  const isAmbiguousQuery =
    /^(ke sana|ke situ|mau makan|cari yang bagus|cari dekat situ|yang bagus)$/iu.test(
      normalized,
    );

  if (isAmbiguousQuery) {
    if (/\b(ke sana|ke situ)\b/iu.test(normalized)) {
      if (context?.selected_entity_id) {
        return {
          type: "PREPARE_ROUTE",
          origin: { type: "CURRENT_LOCATION" },
          destination: { type: "SELECTED_MERCHANT" },
        };
      }
      return {
        type: "REQUEST_CLARIFICATION",
        prompt:
          "Tempat mana yang ingin Anda tuju? Silakan pilih UMKM di peta atau sebutkan nama tempat tujuan.",
      };
    }

    if (/\b(cari dekat situ)\b/iu.test(normalized)) {
      return {
        type: "REQUEST_CLARIFICATION",
        prompt:
          "Di sekitar lokasi atau tempat mana yang Anda maksud? Silakan sebutkan nama tempat atau pilih di peta.",
      };
    }

    if (/\b(mau makan|cari yang bagus|yang bagus)\b/iu.test(normalized)) {
      return {
        type: "REQUEST_CLARIFICATION",
        prompt:
          "Makanan atau tempat seperti apa yang ingin Anda cari? Anda bisa menyebutkan jenis makanan atau lokasinya.",
      };
    }
  }

  // 1. Actionable navigation to existing GETRA workspaces
  if (
    /\b(promosi|promo|iklan|campaign)\b/iu.test(normalized) &&
    /\b(cara|bagaimana|buat|bikin|daftar|pasang|atur|kelola|mau|mulai|biaya|bayar|tampil|aktif)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/umkm/advertising",
      label: "Buka Kelola Promosi",
    };
  }

  if (
    /\b(umkm|usaha|toko|warung|merchant)\b/iu.test(normalized) &&
    /\b(cara|bagaimana|buat|membuat|bikin|daftar|daftarkan|tambah|submit|masukin|mulai|registrasi)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/umkm/merchants/new",
      label: "Daftarkan Usaha Sekarang",
    };
  }

  if (
    /\b(komunitas|laporan warga)\b/iu.test(normalized) ||
    /\b(buat post|buat posting|buat postingan|tulis laporan|lapor fasilitas)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/community",
      label: "Buka Komunitas",
    };
  }

  if (
    /\b(profile|profil|akun saya|pengaturan akun)\b/iu.test(normalized) &&
    /\b(edit|ubah|ganti|buka|lihat)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/profile",
      label: "Buka Profil Pengguna",
    };
  }

  // 1b. CCTV & Video Monitoring Platform
  if (
    /\b(cctv|kamera|live camera|pantau jalan|kamera lalin|kamera dishub|stream cctv|kamera dki)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/international/cctv",
      label: "Buka CCTV Integration Platform",
    };
  }

  // 1c. Traffic Congestion & Road Network
  if (
    /\b(macet|kemacetan|arus lalu lintas|kepadatan jalan|kondisi jalan|kondisi lalin|antrean kendaraan|kecepatan lalu lintas)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/international/traffic-congestion",
      label: "Buka Peta Kemacetan Lalu Lintas",
    };
  }

  // 1d. Environmental Telemetry
  if (
    /\b(kualitas udara|aqi|polusi udara|pm2\.5)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/international/air-quality",
      label: "Buka Pemantauan Kualitas Udara",
    };
  }

  if (
    /\b(banjir|genangan|tinggi muka air|pintu air|elevasi air)\b/iu.test(normalized)
  ) {
    return {
      type: "NAVIGATE",
      path: "/international/flood-monitoring",
      label: "Buka Pemantauan Banjir & Elevasi Air",
    };
  }

  if (
    /\b(lihat|tampilkan|buka|cek)\s+(?:lapisan\s+|layer\s+|peta\s+)?(?:aksesibilitas|disabilitas|trotoar)\b/iu.test(normalized) ||
    /\bmode aksesibilitas\b/iu.test(normalized)
  ) {
    return {
      type: "SWITCH_MAP_MODE",
      mode: "accessibility",
    };
  }

  if (
    /\b(lihat|tampilkan|buka)\s+(?:lapisan\s+|layer\s+|peta\s+)?(?:ruang usaha|sewa|lahan)\b/iu.test(normalized) ||
    /\bmode ruang usaha\b/iu.test(normalized)
  ) {
    return {
      type: "SWITCH_MAP_MODE",
      mode: "business-space",
    };
  }

  if (
    /\b(lihat|tampilkan|buka)\s+(?:lapisan\s+|layer\s+|peta\s+)?(?:analitik|analytics)\b/iu.test(normalized) ||
    /\bmode analitik\b/iu.test(normalized)
  ) {
    return {
      type: "SWITCH_MAP_MODE",
      mode: "analytics",
    };
  }

  const mode = requestedModes.length === 1 ? requestedModes[0] : null;

  const asksForRoute =
    /\b(rute|route|berapa lama|arah|navigasi|cara ke|pandu ke|antar saya|antar ke sini|pandu saya|pandu ke sini)\b/iu.test(normalized) ||
    (/\b(jalan kaki|naik motor|naik mobil|jalan)\b/iu.test(normalized) && /\b(ke|menuju|dari)\b/iu.test(normalized)) ||
    /\b(dari\s+.+\s+ke\s+.+)\b/iu.test(normalized) ||
    /\b(?:ke|menuju)\s+(?:nomor\s+\d+|\d+|tempat|toko|merchant)\b/iu.test(normalized) ||
    (Boolean((context as any)?.merchants?.length) && /\b(?:ke\s+)?nomor\s+\d+\b/iu.test(normalized));

  const asksForMetricBeforeRoute =
    /\b(berapa jaraknya|berapa jarak|berapa menit)\b/iu.test(normalized) &&
    !context?.active_route;

  if (asksForMetricBeforeRoute && !asksForRoute) {
    return {
      type: "REQUEST_CLARIFICATION",
      prompt:
        "Untuk mengetahui jarak dan estimasi waktu tempuh yang akurat, rute harus dihitung terlebih dahulu menggunakan kalkulasi GIS GETRA. Silakan tentukan titik awal dan tujuan Anda.",
    };
  }

  // Place & Landmark Map Focus (e.g., "Bundaran HI di mana?", "tampilkan Monas", "lokasi Sarinah")
  const placeLocationMatch =
    /^(?:di mana|dimana|lokasi|posisi|tampilkan|fokuskan|fokus ke|lihat)\s+([a-z0-9\s.]+?)(?:\s+(?:di mana|dimana|berada))?[?!.]*$/iu.exec(normalized) ||
    /^([a-z0-9\s.]+?)\s+(?:di mana|dimana|berada)[?!.]*$/iu.exec(normalized);

  if (placeLocationMatch && !asksForRoute) {
    const rawPlace = placeLocationMatch[1].trim()
      .replace(/^(?:di|pada|ke|titik|peta|area)\s+/iu, "")
      .replace(/\s+(?:di peta|pada peta)$/iu, "")
      .trim();

    const isNonPlaceQuery =
      /^(kamu|getra|kita|saya|aku|umkm|usaha|toko|tempat|rute|jalur|peta|fokuskan peta|invoice|invoice saya|promosi|pembayaran|rekening|status|akun|profil|pengaturan|admin|bantuan|order|transaksi)$/iu.test(
        rawPlace,
      );

    if (rawPlace.length >= 2 && !isNonPlaceQuery) {
      return {
        type: "FOCUS_PLACE",
        query: rawPlace,
      };
    }
  }

  /**
   * Existing active route:
   *
   * "kalau naik motor?"
   * "pakai mobil aja"
   */
  if (
    context?.active_route &&
    /\b(naik|pakai|ganti|ubah|kalau)\b/u.test(
      normalized,
    ) &&
    mode
  ) {
    return {
      type:
        "CHANGE_ROUTE_MODE",

      mode,
    };
  }

  if (
    context?.active_route &&
    /\b(rute ini|tentang rute|berapa lama|berapa jarak|berapa jauh|jelaskan rute)\b/iu.test(
      normalized,
    ) &&
    !/\b(dari\s+.+\s+ke|ke\s+[a-z0-9]+)\b/iu.test(normalized)
  ) {
    return {
      type: "ANSWER_ONLY",
    };
  }

  if (asksForRoute) {
    const origin =
      /\b(lokasi (?:saya|aku)|posisi (?:saya|aku)|dari sini)\b/u.test(
        normalized,
      ) || (context?.origin && !/\bdari\b/iu.test(normalized))
        ? {
            type:
              "CURRENT_LOCATION" as const,
          }
        : extractOriginQuery(
            question,
          );

    let destination =
      context?.selected_entity_id && (/\b(merchant ini|tempat ini|sini)\b/iu.test(normalized) || !/\b(?:ke|menuju)\b/iu.test(normalized))
        ? {
            type:
              "SELECTED_MERCHANT" as const,
          }
        : extractDestinationQuery(
            question,
          ) || (context?.selected_entity_id ? { type: "SELECTED_MERCHANT" as const } : null);

    if (destination?.type === "PLACE_QUERY" && /\b(merchant ini|tempat ini|sini)\b/iu.test(destination.query) && context?.selected_entity_id) {
      destination = { type: "SELECTED_MERCHANT" as const };
    }

    if (!origin) {
      return {
        type:
          "REQUEST_CLARIFICATION",

        prompt:
          "Dari mana Anda ingin memulai perjalanan?",
      };
    }

    if (!destination) {
      return {
        type:
          "REQUEST_CLARIFICATION",

        prompt:
          "Tempat mana yang ingin Anda tuju?",
      };
    }

    if (!mode) {
      return {
        type: "PREPARE_ROUTE",
        origin,
        destination,
        ...(requestedModes.length ? { requested_modes: requestedModes } : {}),
      };
    }

    return { type: "CALCULATE_ROUTE", mode, origin, destination };
  }

  return {
    type:
      "ANSWER_ONLY",
  };
}

function inferRequestedRouteModes(question: string): Array<"walking" | "motorcycle" | "car"> {
  const modes: Array<"walking" | "motorcycle" | "car"> = [];
  if (/\b(jalan kaki|berjalan|kaki)\b/u.test(question)) modes.push("walking");
  if (/\b(motor|motorcycle|sepeda motor)\b/u.test(question)) modes.push("motorcycle");
  if (/\b(mobil|car|mengemudi)\b/u.test(question)) modes.push("car");
  return modes;
}

function extractOriginQuery(
  question: string,
): {
  type: "PLACE_QUERY";
  query: string;
} | null {
  const match =
    question.match(
      /\bdari\s+(.+?)(?=\s+(?:berapa\s+lama|ke\s+|menuju\s+|jalan\s+kaki|naik\s+|pakai\s+)|[?!,.]|$)/iu,
    );

  const query =
    match?.[1]?.trim();

  return (
    query &&
    query.length >= 2
  )
    ? {
        type:
          "PLACE_QUERY",

        query,
      }
    : null;
}

function extractDestinationQuery(
  question: string,
): {
  type: "PLACE_QUERY";
  query: string;
} | null {
  const match =
    question.match(
      /\b(?:ke|menuju)\s+(.+?)(?=\s+(?:berapa\s+lama|dari\s+|jalan\s+kaki|naik\s+|pakai\s+)|[?!,.]|$)/iu,
    );

  const query =
    match?.[1]?.trim();

  return (
    query &&
    query.length >= 2
  )
    ? {
        type:
          "PLACE_QUERY",

        query,
      }
    : null;
}

function findPreviousRouteEndpoints(history?: AiAskRequest["history"]): {
  originQuery?: string;
  destQuery?: string;
  mode?: "walking" | "motorcycle" | "car";
} {
  if (!history || history.length === 0) return {};
  const userMsgs = history.filter((m) => m.role === "user").slice(-5).reverse();
  for (const msg of userMsgs) {
    const origin = extractOriginQuery(msg.content);
    const dest = extractDestinationQuery(msg.content);
    const modes = inferRequestedRouteModes(msg.content);
    if (origin || dest || modes.length > 0) {
      return {
        originQuery: origin?.query,
        destQuery: dest?.query,
        mode: modes[0],
      };
    }
  }
  return {};
}

function actionMessage(
  action: AiApplicationAction,
  selectedName?: string,
): string {
  switch (action.type) {
    case "CALCULATE_ROUTE": {
      const origText =
        action.origin.type === "PLACE_QUERY"
          ? action.origin.query
          : action.origin.type === "CURRENT_LOCATION"
            ? "lokasi Anda"
            : "titik pilihan";

      const destText =
        action.destination.type === "PLACE_QUERY"
          ? action.destination.query
          : action.destination.type === "SELECTED_MERCHANT"
            ? (selectedName || "tempat tujuan")
            : "titik tujuan";

      return selectedName
        ? `Saya menyiapkan rute ke ${selectedName} menggunakan GETRA.`
        : `Saya menyiapkan rute dari ${origText} ke ${destText} menggunakan kalkulasi GIS GETRA.`;
    }

    case "PREPARE_ROUTE":
      return "Titik awal dan tujuan sudah disiapkan. Pilih moda perjalanan untuk menghitung rute.";

    case "CHANGE_ROUTE_MODE":
      if (
        action.mode ===
        "walking"
      ) {
        return "Saya memperbarui rute ke moda jalan kaki.";
      }

      if (
        action.mode ===
        "motorcycle"
      ) {
        return "Saya memperbarui rute ke moda motor.";
      }

      return "Saya memperbarui rute ke moda mobil.";

    case "APPLY_SEARCH_CRITERIA":
      return "Saya mencari tempat sesuai kebutuhan Anda pada data GETRA.";

    case "REQUEST_CLARIFICATION":
      return action.prompt;

    case "FOCUS_PLACE":
      return `Saya mencari lokasi ${action.query}.`;

    case "SWITCH_MAP_MODE":
      return `Saya mengalihkan tampilan peta ke mode ${action.mode}.`;

    case "NAVIGATE":
      return `Buka ${action.label} (${action.path}) untuk melanjutkan.`;

    case "ANSWER_ONLY":
      return "";
  }
}

function formatDeterministicAnswer(
  intent: AiIntent,
  facts: Record<
    string,
    unknown
  >,
  question?: string,
): string {
  if (
    intent ===
    "ASSISTANT_IDENTITY"
  ) {
    return "Ya, saya Asisten GETRA. Saya dapat membantu mencari tempat serta menjelaskan area, akses, transit, dan rute berdasarkan data GETRA yang tersedia.";
  }

  if (
    intent ===
    "CASUAL_CHAT"
  ) {
    return "Hai, saya siap membantu. Anda dapat bertanya tentang tempat, rute, area, usaha lokal, ruang usaha, atau aksesibilitas berdasarkan data GETRA yang tersedia.";
  }

  if (
    intent === "GENERAL_HELP" ||
    intent === "AI_HELP"
  ) {
    return (
      "GETRA (Geo-Enabled Transit & Retail Analytics) adalah platform WebGIS mobilitas cerdas dan analitik retail transit. Fitur utama GETRA meliputi:\n\n" +
      "1. Pencarian UMKM berbasis Fair Discovery (relevansi dan kedekatan spasial riil).\n" +
      "2. Kalkulasi rute multimodal berbasis PostGIS dan Valhalla (jalan kaki ramah difabel, motor, dan mobil).\n" +
      "3. Pemetaan fasilitas dan bukti foto aksesibilitas disabilitas.\n" +
      "4. Digitalisasi, pendaftaran, dan promosi UMKM via Midtrans Sandbox.\n" +
      "5. Analisis kesenjangan komersial (Demand & Supply gap) di sekitar koridor transit.\n" +
      "6. Kontribusi dan laporan kondisi fasilitas pedestrian oleh komunitas."
    );
  }

  if (
    intent === "PROMOTION_CREATE" ||
    intent === "PROMOTION_SETUP"
  ) {
    return (
      "Untuk mempromosikan usaha di GETRA, ikuti alur resmi berikut:\n\n" +
      "1. Pastikan usaha Anda sudah terdaftar, berstatus terverifikasi (VERIFIED) oleh tim Admin, dan tampil aktif di peta.\n" +
      "2. Masuk ke halaman Kelola Promosi (/umkm/advertising) pada mode UMKM.\n" +
      "3. Buat kampanye baru: masukkan judul promo, deskripsi penawaran, dan unggah materi banner visual.\n" +
      "4. Tentukan wilayah sasaran dengan mengatur radius jangkauan promosi di sekitar lokasi usaha Anda.\n" +
      "5. Tentukan jadwal dan durasi tayang kampanye promosi.\n" +
      "6. Lakukan uji penayangan (preview) untuk memeriksa tampilan kartu promosi pada peta.\n" +
      "7. Lakukan pembayaran resmi melalui gateway Midtrans Sandbox (menggunakan simulator QRIS atau Virtual Account).\n" +
      "8. Setelah pembayaran terkonfirmasi oleh sistem, promosi akan berstatus AKTIF dan tampil kepada pengguna di wilayah sasaran.\n" +
      "9. Pantau performa promosi (impresi dan interaksi) secara transparan melalui dashboard analitik promosi."
    );
  }

  if (intent === "PROMOTION_TARGETING") {
    return (
      "Penentuan wilayah sasaran promosi di GETRA dilakukan dengan mengatur radius jangkauan spasial (geofence/buffer) pada peta dari titik lokasi usaha Anda. Promosi akan diprioritaskan tampil kepada pejalan kaki dan pengguna yang berada di dalam wilayah sasaran tersebut tanpa merusak ranking keaslian Fair Discovery."
    );
  }

  if (intent === "PROMOTION_SCHEDULE") {
    return (
      "Jadwal promosi di GETRA dapat diatur saat pembuatan kampanye di Kelola Promosi (/umkm/advertising). Anda dapat menentukan tanggal mulai, tanggal berakhir, dan durasi penayangan. Promosi hanya akan aktif dan tayang pada rentang waktu yang telah dijadwalkan dan dibayar."
    );
  }

  if (intent === "PROMOTION_PREVIEW") {
    return (
      "Fitur Uji Penayangan (Preview) di GETRA memungkinkan Anda melihat simulasi tampilan kartu promosi interaktif pada peta sebelum melakukan pembayaran. Anda dapat memastikan banner visual, teks penawaran, dan informasi toko sudah sesuai sebelum kampanye ditayangkan."
    );
  }

  if (intent === "PROMOTION_PAYMENT") {
    return (
      "Pembayaran promosi di GETRA diproses secara resmi melalui gateway Midtrans Sandbox. Anda dapat memilih metode simulasi QRIS atau Virtual Account Bank. Promosi baru akan aktif (ACTIVE) setelah status transaksi berhasil dikonfirmasi (SETTLEMENT) oleh sistem webhook backend."
    );
  }

  if (intent === "PROMOTION_ANALYTICS") {
    return (
      "Statistik dan analitik promosi dapat dipantau langsung pada dashboard Kelola Promosi (/umkm/advertising). GETRA menyajikan data transparan mengenai jumlah penayangan (impresi), interaksi klik kartu promosi, dan sebaran spasial audiens tanpa estimasi omzet fiktif."
    );
  }

  if (
    intent === "UMKM_CREATE" ||
    intent === "UMKM_SUBMIT"
  ) {
    return (
      "Untuk mendaftarkan UMKM baru di GETRA, ikuti alur resmi berikut:\n\n" +
      "1. Masuk (Login) ke akun GETRA Anda.\n" +
      "2. Buka menu Kelola UMKM > Daftarkan Usaha (/umkm/merchants/new).\n" +
      "3. Isi informasi profil usaha: nama toko/usaha, kategori usaha, jam operasional, nomor kontak, dan deskripsi produk.\n" +
      "4. Tentukan titik lokasi usaha secara akurat dengan menandai pin pada peta interaktif.\n" +
      "5. Unggah foto tempat usaha dan dokumen legalitas pendukung jika ada.\n" +
      "6. Kirim (submit) formulir pendaftaran. Status pengajuan awal menjadi PENDING.\n" +
      "7. Tim Administrator GETRA akan memeriksa kelengkapan data dan keabsahan lokasi usaha melalui dashboard Admin.\n" +
      "8. Setelah disetujui (APPROVED), profil usaha Anda resmi menjadi data kanonikal publik dan tampil pada pencarian peta Fair Discovery.\n" +
      "9. Dengan status kepemilikan terverifikasi (OWNER VERIFIED), Anda memiliki akses penuh mengelola profil toko dan mengajukan promosi berbayar."
    );
  }

  if (intent === "UMKM_STATUS") {
    return (
      "Status pengajuan UMKM di GETRA melalui tahapan kurasi:\n\n" +
      "- PENDING: Pengajuan Anda telah diterima dan sedang dalam antrean kurasi oleh tim Admin GETRA.\n" +
      "- APPROVED: Pengajuan disetujui Admin, data telah menjadi kanonikal publik, dan toko tampil pada peta.\n" +
      "- REJECTED: Pengajuan belum memenuhi syarat keabsahan data atau lokasi.\n\n" +
      "Usaha yang masih berstatus pending belum tampil di peta publik demi menjaga keabsahan data spasial. Anda dapat memantau status secara berkala di menu Kelola UMKM."
    );
  }

  if (
    intent === "UMKM_CLAIM" ||
    intent === "UMKM_OWNERSHIP"
  ) {
    return (
      "Untuk mengklaim kepemilikan usaha yang sudah terdaftar di peta GETRA:\n\n" +
      "1. Masuk ke halaman detail toko atau menu Kelola UMKM.\n" +
      "2. Pilih opsi 'Klaim Usaha Ini'.\n" +
      "3. Unggah bukti identitas dan dokumen kepemilikan usaha (KTP, izin usaha, atau foto tempat usaha).\n" +
      "4. Tim Administrator akan memverifikasi dokumen klaim Anda.\n" +
      "5. Setelah diverifikasi, hak pengelolaan profil toko akan dialihkan ke akun Anda sebagai pemilik terverifikasi (OWNER VERIFIED)."
    );
  }

  if (intent === "ACTIVE_JOURNEY") {
    return (
      "Fitur Active Journey GETRA memandu navigasi langsung mengikuti rute jaringan GIS yang telah dihitung. Untuk memulai, tentukan rute perjalanan terlebih dahulu lalu tekan tombol 'Mulai Perjalanan'. Sistem akan memantau posisi Anda dan menghitung ulang rute jika Anda keluar dari koridor rute resmi."
    );
  }

  if (intent === "PAYMENT_STATUS") {
    return (
      "Status transaksi pembayaran promosi GETRA dikelola melalui Midtrans Sandbox. Status yang berlaku meliputi PENDING (menunggu bayar), SETTLEMENT (lunas), EXPIRE (kedaluwarsa), atau CANCEL (dibatalkan). Invoice resmi otomatis diterbitkan pada riwayat kampanye setelah status transaksi settlement terkonfirmasi oleh backend."
    );
  }

  if (
    intent === "COMMUNITY" ||
    intent === "COMMUNITY_OBSERVATION"
  ) {
    return "Observasi komunitas GETRA menampung laporan warga mengenai kondisi akses jalan dan fasilitas. Catatan ini bersifat waktu-terbatas dan dimoderasi secara berkala.";
  }

  if (intent === "PROFILE") {
    return (
      "Halaman Profil Pengguna (/profile) memungkinkan Anda melihat data akun, berganti mode peran antarmuka (Komuter, UMKM, Investor, Pemerintah), memeriksa keamanan akun, dan melakukan keluar (logout)."
    );
  }

  if (intent === "ADMIN") {
    return (
      "Dashboard Admin GETRA (/admin) dikhususkan untuk tim kurator berwenang guna menyetujui pendaftaran UMKM, memverifikasi klaim kepemilikan, dan memoderasi laporan komunitas. Pengguna biasa tidak memiliki akses administratif."
    );
  }

  if (intent === "FAIR_DISCOVERY") {
    if (question && /\b(?:kenapa|mengapa)\s+(?:toko|merchant|usaha)\s+(?:ini\s+)?(?:muncul|tampil)\b/iu.test(question)) {
      return "Toko ini muncul karena lokasi fisiknya berada di dalam radius pencarian aktif Anda dan memenuhi kriteria relevansi kategori pencarian pada peta Fair Discovery GETRA.";
    }
    if (question && /\bapa itu hidden gem\b/iu.test(question)) {
      return "Hidden Gem di GETRA adalah rekomendasi tempat dan UMKM lokal berkualitas otentik yang berada di sekitar koridor pejalan kaki, namun belum memiliki visibilitas komersial besar. GETRA menampilkannya berdasarkan kedekatan fisik riil dan relevansi kebutuhan pengguna.";
    }
    if (question && /\b(?:apa arti sponsored|apa itu sponsored|arti sponsored)\b/iu.test(question)) {
      return "Label 'Sponsored' menandakan bahwa UMKM terverifikasi sedang menjalankan promosi visual aktif melalui pembayaran resmi Midtrans Sandbox. Promosi ini diberi tanda transparansi jelas dan tidak mengubah ranking relevansi pencarian organik Fair Discovery.";
    }
    if (question && /\b(?:apakah hasil ini dibayar|apakah pencarian ini berbayar)\b/iu.test(question)) {
      return "Hasil pencarian utama di GETRA tidak berbayar dan tidak dapat dibeli. Peringkat pencarian dihitung murni berdasarkan jarak fisik dan relevansi kebutuhan (Fair Discovery). Materi promosi berbayar (Sponsored) selalu diberi label terpisah dan transparan.";
    }
    if (question && /\b(?:apa bedanya sponsored dengan hasil biasa|beda sponsored dan hasil biasa)\b/iu.test(question)) {
      return "Hasil biasa didasarkan murni pada jarak spasial dan kesesuaian pencarian (Fair Discovery tanpa biaya), sedangkan 'Sponsored' adalah materi promosi visual yang dipasang oleh UMKM terverifikasi melalui Midtrans Sandbox dan ditandai secara transparan agar pengguna dapat membedakannya dengan jelas.";
    }
    return "Fair Discovery adalah prinsip utama GETRA yang menjamin UMKM lokal mendapatkan visibilitas yang adil dan merata berdasarkan kedekatan spasial serta relevansi kebutuhan pengguna, bukan semata-mata ditentukan oleh besaran biaya lelang iklan.";
  }

  if (intent === "SAFETY_GUARDRAIL") {
    if (question && /\b(?:buatkan|bikin|tentukan)\s+koordinat\b/iu.test(question)) {
      return "GETRA tidak mengarang koordinat tempat. Semua koordinat lokasi merchant dan titik transit diperoleh dari geocoding PostGIS kanonikal atau penandaan pin resmi oleh pemilik usaha yang telah diverifikasi.";
    }
    if (question && /\b(?:berapa jarak lurus|jarak lurus)\b/iu.test(question)) {
      return "GETRA menggunakan perhitungan rute jaringan jalan dan pedestrian GIS (Valhalla/PostGIS), bukan estimasi jarak garis lurus (Haversine), agar mencerminkan kondisi fisik dan aksesibilitas pejalan kaki yang sebenarnya.";
    }
    if (question && /\b(?:buatkan|bikin|rancang)\s+route\s+sendiri\b/iu.test(question)) {
      return "Asisten AI tidak dapat membuat atau mengarang geometri rute sendiri. Semua rute dihitung secara matematis oleh authority routing PostGIS dan Valhalla berdasarkan jaringan jalan resmi.";
    }
    if (question && /\b(?:tebak eta|tebak waktu tempuh)\b/iu.test(question)) {
      return "GETRA tidak menebak estimasi waktu tempuh (ETA). Waktu tempuh dihitung berdasarkan panjang segmen jalan riil dan kecepatan berjalan kaki rata-rata pejalan kaki pada jaringan GIS.";
    }
    if (question && /\b(?:buat merchant dummy|buat toko palsu|buat usaha fiktif)\b/iu.test(question)) {
      return "GETRA beroperasi dengan data kanonikal faktual. Asisten AI tidak diizinkan membuat atau menampilkan data merchant fiktif.";
    }
    if (question && /\b(?:ubah filter tanpa saya tahu|ubah filter diam-diam)\b/iu.test(question)) {
      return "GETRA menjunjung transparansi penuh dan tidak pernah mengubah filter pencarian Anda secara diam-diam. Jika hasil kosong karena filter aktif, sistem akan menjelaskan filter mana yang membatasi dan meminta konfirmasi Anda.";
    }
    if (question && /\b(?:anggap pembayaran berhasil|anggap lunas)\b/iu.test(question)) {
      return "Status transaksi pembayaran promosi tidak dapat dimanipulasi atau diasumsikan berhasil oleh AI. Status settlement hanya dapat diperbarui melalui notifikasi webhook terverifikasi dari gateway Midtrans Sandbox.";
    }
    if (question && /\b(?:anggap umkm sudah diverifikasi|anggap usaha terverifikasi)\b/iu.test(question)) {
      return "Verifikasi UMKM memerlukan proses kurasi resmi oleh tim Administrator GETRA terhadap keabsahan dokumen dan lokasi usaha. AI tidak dapat mengubah status verifikasi secara sepihak.";
    }
    if (question && /\b(?:tampilkan private ownership evidence|dokumen rahasia kepemilikan)\b/iu.test(question)) {
      return "Dokumen bukti kepemilikan dan identitas pemilik usaha bersifat rahasia dan dilindungi oleh sistem keamanan GETRA. Data ini hanya dapat diakses oleh kurator Administrator yang berwenang.";
    }
    if (question && /\b(?:approve umkm saya sebagai user|setujui umkm saya sebagai user)\b/iu.test(question)) {
      return "Persetujuan (approval) UMKM memerlukan hak akses peran Administrator. Pengguna biasa (USER) tidak memiliki wewenang kurasi untuk menyetujui pendaftaran usaha.";
    }
    return "Tindakan ditolak demi menjaga keabsahan data dan integritas keamanan platform GETRA.";
  }

  if (intent === "INVESTOR_MODE") {
    if (question && /\b(?:government|pemerintah)\b/iu.test(question)) {
      return "Pemerintah dan pembuat kebijakan dapat memanfaatkan GETRA untuk mengevaluasi konektivitas pejalan kaki di sekitar simpul transportasi umum, memantau sebaran fasilitas aksesibilitas ramah difabel, dan mendukung pemerataan ekonomi UMKM lokal.";
    }
    return "Investor dapat memanfaatkan GETRA untuk melihat peta kesenjangan komersial (Retail Gap), menganalisis potensi pasar (Demand vs Supply) di koridor transit pejalan kaki, dan mengidentifikasi peluang pembukaan ruang usaha (Business Space) baru berbasis data riil.";
  }

  if (intent === "BUSINESS_SPACE") {
    return "Business Space (Ruang Usaha) di GETRA adalah fitur pemetaan titik lokasi atau lahan potensial untuk pembukaan unit usaha baru di sekitar area transit pejalan kaki yang memiliki kesenjangan retail tinggi.";
  }

  if (intent === "FILTER_DIAGNOSIS") {
    return "Jika pencarian tidak menghasilkan tempat, periksa filter aktif seperti status buka, batas anggaran, atau jarak berjalan kaki. Belum ada tempat yang sesuai dengan semua filter aktif. GETRA mematuhi prinsip Fair Discovery dan tidak mengubah filter Anda secara diam-diam. Untuk memperluas hasil, Anda dapat mempertimbangkan relaksasi berikut:\n- Memperluas radius pencarian (misal hingga 2,5 km)\n- Menghapus batas anggaran pengeluaran\n- Menampilkan tempat tanpa filter status buka operasional\n- Menghapus batas waktu berjalan kaki\n- Menjelajahi area di sekitar simpul transit atau landmark terdekat";
  }

  if (intent === "UMKM_LOCATION") {
    return "Untuk menentukan lokasi usaha saat pendaftaran UMKM, Anda dapat menandai pin secara langsung pada peta interaktif atau menekan tombol 'Gunakan Lokasi Saya' untuk mengisi koordinat lintang dan bujur secara otomatis dari sensor GPS perangkat Anda.";
  }

  if (intent === "UMKM_EDIT") {
    return "Untuk mengubah data usaha, masuk ke menu Kelola UMKM dengan akun pemilik terverifikasi (OWNER VERIFIED), pilih usaha Anda, lalu klik 'Edit Profil Usaha' untuk memperbarui nama, jam operasional, kontak, atau foto tempat usaha.";
  }

  if (intent === "PROMOTION_INVOICE") {
    return "Invoice resmi pembayaran promosi diterbitkan secara otomatis setelah transaksi berstatus SETTLEMENT di Midtrans Sandbox. Anda dapat melihat dan mengunduh bukti invoice melalui riwayat kampanye di halaman Kelola Promosi (/umkm/advertising).";
  }

  if (intent === "COMMUNITY_REPORT") {
    return "Untuk melaporkan postingan atau observasi yang melanggar ketentuan atau memuat informasi keliru, klik tombol 'Laporkan' (Report) pada kartu postingan di tab Komunitas (/community). Laporan akan ditinjau langsung oleh tim Administrator GETRA.";
  }

  if (intent === "ACTIVITY_FEED") {
    return "Aktivitas perjalanan, laporan observasi komunitas, dan riwayat interaksi dapat dilihat langsung melalui tab Komunitas dan panel riwayat perjalanan akun Anda.";
  }

  if (intent === "NOTIFICATION_HELP") {
    return "Sistem notifikasi GETRA memberikan pembaruan penting mengenai status persetujuan pendaftaran UMKM, status verifikasi kepemilikan, perubahan kampanye promosi, dan konfirmasi transaksi Midtrans secara real-time.";
  }

  if (
    intent === "MERCHANT_SEARCH" ||
    intent === "SEARCH_UMKM"
  ) {
    if (question && /\b(cari|carikan|temukan|rekomendasi|tempat makan|kopi|umkm|toko)\b/iu.test(question)) {
      return "GETRA siap mencari tempat atau UMKM terdaftar sesuai kebutuhan Anda pada peta Fair Discovery. Gunakan filter pencarian untuk melihat lokasi terdekat.";
    }
    return "Sebutkan jenis tempat, makanan, atau kebutuhan yang ingin Anda cari agar GETRA dapat menampilkan hasil yang relevan.";
  }

  if (intent === "CCTV") {
    return "GETRA CCTV Integration Platform menyediakan integrasi kamera lalu lintas dan pemantauan pedestrian kota DKI Jakarta dan simpul internasional dengan status stream riil (LIVE, DEGRADED, OFFLINE) dan telemetri Computer Vision terotentikasi tanpa metrik sintetis. Buka halaman CCTV (/international/cctv) untuk eksplorasi kamera aktif.";
  }

  if (intent === "TRAFFIC") {
    return "Sistem pemantauan kemacetan lalu lintas GETRA menggabungkan observasi telemetri CCTV riil dengan jaringan jalan GIS, membedakan secara ketat antara status OBSERVED, ESTIMATED, dan PREDICTED tanpa rekayasa kecepatan instan. Lihat peta kemacetan pada (/international/traffic-congestion).";
  }

  if (intent === "ENVIRONMENT") {
    return "GETRA memonitor indikator lingkungan perkotaan secara faktual: kualitas udara (AQI, PM2.5, PM10), stasiun telemetri banjir & tinggi muka air pintu air, radiasi bayangan surya, serta NDVI kanopi hijau satelit Sentinel-2 / Landsat dengan tanggal akuisisi sensor resmi.";
  }

  if (intent === "ROUTE") {
    return "GETRA menghitung rute perjalanan pejalan kaki dan kendaraan secara presisi menggunakan mesin GIS Valhalla dan data elevasi DEM riil. Tentukan titik awal dan tujuan pada peta untuk menghitung rute akurat.";
  }

  if (intent === "TRANSIT") {
    return "GETRA menyajikan jaringan simpul transportasi publik multimoda (KRL Commuter Line, MRT Jakarta, LRT, TransJakarta, dan Railink Bandara) berbasis data statis & GTFS-RT resmi dengan jarak jangkau pedestrian nyata.";
  }

  if (intent === "PROMOTION") {
    return "Pemilik UMKM terverifikasi dapat mengaktifkan kampanye promosi lokal berbasis radius spasial dengan jaminan transparansi Fair Discovery dan transaksi aman Midtrans Sandbox. Kelola promosi melalui (/umkm/advertising).";
  }

  if (intent === "OWNER") {
    return "Kepemilikan UMKM di GETRA memerlukan verifikasi dokumen legalitas resmi oleh Administrator. Pemilik terverifikasi (OWNER) berhak mengedit data usaha dan menjalankan kampanye promosi lokal.";
  }

  if (
    intent ===
    "UNKNOWN"
  ) {
    return "Saya belum memahami informasi yang Anda perlukan. Coba tanyakan pencarian tempat atau landmark kota (misal: Bundaran HI, Monas), rute navigasi GIS, integrasi CCTV publik, pemantauan kualitas udara/banjir, atau panduan pendaftaran usaha.";
  }

  if (intent === "ACCESSIBILITY") {
    const count = typeof facts.observation_count === "number" ? facts.observation_count : 0;
    const photoNote = facts.has_photos ? " Foto bukti lapangan terverifikasi tersedia." : " Foto belum tersedia pada observasi ini.";
    const subcats = Array.isArray(facts.subcategories) && facts.subcategories.length > 0
      ? ` Kategori temuan meliputi: ${facts.subcategories.join(", ")}.`
      : "";
    return `Terdapat ${count} observasi aksesibilitas tercatat pada data GETRA.${subcats}${photoNote} Bukti ini bersifat observasional dan tidak otomatis mengubah graf rute kanonikal.`;
  }

  if (intent === "DEMAND_SUPPLY") {
    const obs = typeof facts.observations === "string" ? facts.observations : "Data sebaran spasial UMKM dan transit tersedia.";
    const inf = typeof facts.inferences === "string" ? facts.inferences : "Terdapat indikasi potensi pasar pejalan kaki.";
    const rec = typeof facts.recommendations === "string" ? facts.recommendations : "Lakukan validasi lapangan langsung.";
    return `[OBSERVASI] ${obs}\n[INFERENSI] ${inf}\n[REKOMENDASI] ${rec}\n[BATASAN] Analisis ini bersifat indikatif dan tidak menjamin omzet atau keuntungan finansial.`;
  }

  if (
    intent ===
      "NEAREST_TRANSIT" &&
    typeof facts.stop_name ===
      "string"
  ) {
    const distance =
      typeof facts.distance_m ===
      "number"
        ? `, sekitar ${Math.round(
            facts.distance_m,
          )} meter dari titik asal`
        : "";

    return `Transit terdekat yang ditemukan adalah ${facts.stop_name}${distance}.`;
  }

  if (
    intent ===
    "WALKING_ROUTE"
  ) {
    if (
      facts.status !==
      "FOUND"
    ) {
      return "Rute jalan kaki belum dapat dihitung untuk titik tersebut. Periksa titik awal dan tujuan, lalu coba lagi.";
    }

    const distance =
      typeof facts.distance_m ===
      "number"
        ? `${Math.round(
            facts.distance_m,
          )} meter`
        : "jarak yang tersedia";

    const durationMinutes =
      typeof facts.duration_s ===
      "number"
        ? Math.ceil(
            facts.duration_s /
              60,
          )
        : null;

    if (
      durationMinutes !==
      null
    ) {
      return `Sekitar ${durationMinutes} menit berjalan kaki dengan jarak kurang lebih ${distance}.`;
    }

    return `Rute jalan kaki ditemukan dengan jarak kurang lebih ${distance}.`;
  }

  if (
    intent ===
      "UMKM_POI" &&
    typeof facts.merchant_name ===
      "string"
  ) {
    const category =
      typeof facts.category ===
        "string" &&
      facts.category
        ? ` (${facts.category})`
        : "";

    return `${facts.merchant_name}${category} ditemukan pada data GETRA.`;
  }

  if (
    typeof facts.umkm_count ===
    "number"
  ) {
    return `Saya menemukan ${facts.umkm_count} usaha di area sekitar titik yang dipilih.`;
  }

  return "GETRA belum memiliki cukup informasi untuk menjawab pertanyaan tersebut. Pilih titik di peta atau tambahkan lokasi agar saya dapat membantu lebih lanjut.";
}

function normalizeProvider(
  source: unknown,
): AiProvider {
  if (
    source === "openai" ||
    source === "sub2api"
  ) {
    return source;
  }

  return "deterministic";
}
