import {
  extractSearchAction,
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

export class AiService {
  constructor(
    private readonly authorization: string,
  ) {}

  async handleAskRequest(
    req: AiAskRequest,
  ): Promise<AiAskResponse> {
    const {
      question,
      active_experience,
      context,
      history,
    } = req;

    const normalizedQuestion = question.toLocaleLowerCase("id-ID").trim();

    // 1. Guardrail: Secret Exfiltration & Prompt Injection
    const isSecretExfiltration =
      /\b(server[_\s-]?key|service[_\s-]?role|api[_\s-]?key|secret[_\s-]?key|password|kunci rahasia|credential)\b/iu.test(
        normalizedQuestion,
      ) &&
      /\b(tampilkan|lihat|berikan|bocorkan|print|show|reveal|abaikan|ignore|dump|get)\b/iu.test(
        normalizedQuestion,
      );

    // 2. Guardrail: Unauthorized Privilege Escalation & Admin/Owner Action Refusal
    if (/\b(approve|setujui|verifikasi)\s+(?:merchant|toko|usaha|warung|pengajuan|submission)\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Persetujuan pendaftaran UMKM hanya dapat dilakukan oleh Administrator berwenang melalui dashboard Admin (/admin). GETRA AI beroperasi dengan pemisahan hak akses dan tidak memiliki kewenangan mengubah status kurasi merchant.",
        intent: "UNKNOWN",
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
        intent: "UNKNOWN",
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
        intent: "UNKNOWN",
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
        intent: "UNKNOWN",
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
        intent: "UNKNOWN",
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
          "Merchant tampil pada GETRA berdasarkan prinsip Fair Discovery: kedekatan jarak spasial, kesesuaian kategori pencarian, serta status buka/tutup toko. GETRA tidak mendahulukan usaha semata-mata karena biaya lelang iklan.",
        intent: "ASSISTANT_IDENTITY",
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
        intent: "ASSISTANT_IDENTITY",
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

    // 4. Deterministic Product Guidance (Category A, P, Q, R, S)
    if (/\bapa itu fair discovery\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Fair Discovery adalah prinsip utama GETRA yang menjamin UMKM lokal mendapatkan visibilitas yang adil dan merata berdasarkan kedekatan spasial serta relevansi kebutuhan pengguna, bukan semata-mata ditentukan oleh besaran biaya lelang iklan.",
        intent: "ASSISTANT_IDENTITY",
        limitations: [],
        evidence: [],
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

    if (/\bapa itu sponsored\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Fitur Promosi (Sponsored) di GETRA memungkinkan UMKM terverifikasi meningkatkan jangkauan promosi visual pada peta dan panel rekomendasi melalui pembayaran resmi Midtrans Sandbox tanpa mengorbankan relevansi hasil pencarian Fair Discovery.",
        intent: "PROMOTION_SETUP",
        limitations: [],
        evidence: [{ source: "GETRA Advertising Engine", dataset: "Promotion Definition" }],
        action: { type: "NAVIGATE", path: "/umkm/advertising", label: "Buka Kelola Promosi" },
        provider: "deterministic",
      };
    }

    /**
     * Merchant/search requests use the dedicated structured
     * search extractor first.
     *
     * IMPORTANT:
     * AiAskResponse no longer exposes `search_action`.
     * All executable application behavior now goes through
     * the canonical `action` property.
     */
    const isProductGuidanceQuestion = /\b(bagaimana|gmn|gimana|cara\s+(?:buat|bikin|daftar|daftarin|promosi|pasang|klaim|claim)|status\s+(?:pembayaran|pengajuan|verifikasi)|observasi\s+komunitas|aksesibilitas|accessibility)\b/iu.test(req.question);
    if (!isProductGuidanceQuestion && (context?.enable_search || /\b(cari|carikan|temukan|rekomendasi|mau makan|tempat makan|coffee)\b/iu.test(req.question))) {
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
        "CHANGE_ROUTE_MODE" ||
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
      return {
        answer:
          actionMessage(
            action,
            context?.selected_entity_name,
          ),

        intent,

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

    /**
     * Known GETRA product knowledge & operational intents do not need external LLM uncertainty.
     */
    const deterministicProductKnowledgeIntents: readonly AiIntent[] = [
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
      "UMKM_CREATE",
      "UMKM_SUBMIT",
      "UMKM_STATUS",
      "UMKM_CLAIM",
      "UMKM_OWNERSHIP",
      "ACTIVE_JOURNEY",
      "PAYMENT_STATUS",
      "COMMUNITY",
      "COMMUNITY_OBSERVATION",
      "PROFILE",
      "ADMIN",
    ];

    if (deterministicProductKnowledgeIntents.includes(deterministicIntent)) {
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

  const recentContext =
    history
      ?.slice(-3)
      .map((item) => item.content)
      .join(" ")
      .toLocaleLowerCase("id-ID") ?? "";

  const combined = `${recentContext} ${normalized}`;

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
    /^(kalau sudah submit\??|kalau sudah buat\??|kalau sudah dibuat\??|setelah submit\??|setelah dibuat\??|udah submit terus gimana\??|cara bayarnya\??|bayarnya gimana\??|berapa biayanya\??|wilayah sasarannya\??|targetnya\??|jadwalnya\??|kenapa belum muncul\??|kok belum aktif\??|kapan disetujui\??|kenapa masih pending\??|yang paling dekat\??|yang tadi paling dekat mana\??|yang buka sekarang\??|kalau jalan kaki\??|kalau naik motor\??|bisa ke sana\??|berapa jauh\??)$/iu.test(normalized);

  if (isContextualFollowUp) {
    if (/\b(promosi|promo|iklan|campaign|sponsored)\b/iu.test(recentContext)) {
      if (/\b(bayar|biaya)\w*\b/iu.test(normalized)) return "PROMOTION_PAYMENT";
      if (/\b(wilayah|sasaran|target)\w*\b/iu.test(normalized)) return "PROMOTION_TARGETING";
      if (/\bjadwal\w*\b/iu.test(normalized)) return "PROMOTION_SCHEDULE";
      if (/\b(dibuat|buat|jadi)\w*\b/iu.test(normalized)) return "PROMOTION_SETUP";
      return "PROMOTION_CREATE";
    }

    if (/\b(umkm|usaha|toko|warung|merchant|daftarkan|pengajuan)\b/iu.test(recentContext)) {
      if (/\b(submit|disetujui|pending|muncul|tampil)\w*\b/iu.test(normalized)) return "UMKM_STATUS";
      return "UMKM_CREATE";
    }

    if (/\b(cari|makan|kopi|coffee|bakso|resto|tempat|merchant)\b/iu.test(recentContext)) {
      if (/\b(dekat|buka|murah)\b/iu.test(normalized)) return "MERCHANT_SEARCH";
    }

    if (/\b(rute|jalan kaki|motor|mobil|perjalanan)\b/iu.test(recentContext)) {
      return "WALKING_ROUTE";
    }
  }

  // 5. Active Journey & Live Navigation
  if (
    /\b(mulai jalan|mulai perjalanan|saya tersesat|tersesat|rute saya berubah|sisa perjalanan|berapa sisa perjalanan|sudah sampai|saya sudah sampai|fokuskan peta|navigasi ke merchant)\b/iu.test(normalized)
  ) {
    return "ACTIVE_JOURNEY";
  }

  // 6. Payment & Midtrans Sandbox
  if (
    /\b(status pembayaran|cek pembayaran|pembayaran.*berhasil|midtrans sandbox|midtrans|invoice saya|lihat invoice|bukti bayar|order id|transaksi pembayaran)\b/iu.test(normalized)
  ) {
    return "PAYMENT_STATUS";
  }

  // 7. Promotion & Advertising
  if (
    /\b(promosi|promo|iklan|campaign|pasang iklan|iklanin usaha|iklanin toko)\b/iu.test(normalized) ||
    /\b(wilayah sasaran|radius sasaran|target wilayah|atur jadwal|mengatur jadwal|jadwal tayang|uji penayangan|simulasi tayang)\b/iu.test(normalized)
  ) {
    if (/\b(statistik|analytics|analitik|impresi|performa)\b/iu.test(normalized)) {
      return "PROMOTION_ANALYTICS";
    }
    if (/\b(bayar|biaya|tarif|harga|midtrans)\b/iu.test(normalized)) {
      return "PROMOTION_PAYMENT";
    }
    if (/\b(wilayah sasaran|radius sasaran|target wilayah|jangkauan)\b/iu.test(normalized)) {
      return "PROMOTION_TARGETING";
    }
    if (/\b(jadwal|durasi|waktu tayang|tanggal tayang|atur jadwal|mengatur jadwal)\b/iu.test(normalized)) {
      return "PROMOTION_SCHEDULE";
    }
    if (/\b(preview|uji penayangan|simulasi tayang|tampilan iklan)\b/iu.test(normalized)) {
      return "PROMOTION_PREVIEW";
    }
    if (/\b(materi|banner|konten|foto promosi)\b/iu.test(normalized)) {
      return "PROMOTION_SETUP";
    }
    return "PROMOTION_CREATE";
  }

  // 8. UMKM Onboarding, Claim & Status
  if (
    /\b(daftar umkm|daftarkan umkm|buat umkm|bikin umkm|tambah umkm|daftar usaha|daftarkan usaha|buat usaha|bikin usaha|tambah toko|daftarin toko|masukin usaha|usaha saya belum ada|submit umkm|submit usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_CREATE";
  }

  if (
    /\b(claim umkm|klaim umkm|claim toko|klaim toko|claim usaha|klaim usaha|menjadi pemilik|hak milik usaha|kepemilikan usaha|siapa yang boleh mengubah usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_CLAIM";
  }

  if (
    /\b(status pengajuan|umkm.*pending|usaha.*pending|kenapa.*pending|kapan.*disetujui|usaha.*belum tampil|toko.*belum muncul|status verifikasi usaha)\b/iu.test(normalized)
  ) {
    return "UMKM_STATUS";
  }

  // 9. Community & Citizen Reports
  if (
    /\b(buat post|buat posting|buat postingan|komentar|komentari|reaction|reaksi|report post|laporkan postingan|laporan warga|komunitas|kontribusi warga|observasi komunitas|laporan masyarakat)\b/iu.test(normalized)
  ) {
    return "COMMUNITY_OBSERVATION";
  }

  // 10. Accessibility & Special Needs
  if (
    /\b(aksesibilitas|accessibility|disabilitas|disability|kursi roda|wheelchair|ramah kursi roda|guiding block|trotoar rusak|kondisi trotoar|rampa|ramp|fasilitas disabilitas|jalur difabel|titik aksesibilitas|titik akses|accessibility point)\b/iu.test(normalized)
  ) {
    return "ACCESSIBILITY";
  }

  // 11. Profile & Account
  if (
    /\b(edit profile|edit profil|ubah profil|ganti profile|ganti profil|logout|keluar akun|role saya|peran saya|keamanan akun|ganti password|profil pengguna)\b/iu.test(normalized)
  ) {
    return "PROFILE";
  }

  // 12. Admin & System Management
  if (
    /\b(dashboard admin|halaman admin|menu admin|fitur admin|persetujuan admin|kurasi admin)\b/iu.test(normalized)
  ) {
    return "ADMIN";
  }

  // 13. Route requests take precedence
  if (
    /\b(jalan kaki|berapa lama|rute|route|duration|durasi|navigasi|arah ke|cara ke|rute terbaik|bisa jalan kaki|naik motor|naik mobil|jarak ke)\b/iu.test(normalized)
  ) {
    return "WALKING_ROUTE";
  }

  // 13b. Proximity / Nearest follow-up or query
  if (
    /\b(yang paling dekat|paling dekat|terdekat|yang terdekat|mana yang lebih dekat|paling dket|terdkat)\b/iu.test(normalized)
  ) {
    if (recentContext && (recentContext.includes("transit") || recentContext.includes("stasiun") || recentContext.includes("halte"))) {
      return "NEAREST_TRANSIT";
    }
    return "MERCHANT_SEARCH";
  }

  // 14. Explicit nearest-transit requests
  if (
    /\b(stasiun|halte|transit)\b.*\b(dekat|terdekat|nearest)\b/u.test(normalized) ||
    /\b(paling dekat|terdekat|nearest)\b.*\b(stasiun|halte|transit)\b/u.test(normalized)
  ) {
    return "NEAREST_TRANSIT";
  }

  // 15. Demand-Supply Analysis
  if (
    /\b(demand|supply|peluang usaha|potensi usaha|analisis pasar|potensi pasar|kesenjangan usaha|kesenjangan komersial)\b/iu.test(normalized)
  ) {
    return "DEMAND_SUPPLY";
  }

  // 16. Explicit discovery/search requests
  if (
    /\b(cari|carikan|temukan|rekomendasikan|rekomendasi|mau makan|tempat makan|coffee shop|kopi|kafe|cafe|resto|restoran|kuliner|hidden gem|warung makan)\b/u.test(normalized)
  ) {
    return "MERCHANT_SEARCH";
  }

  // 17. Specific UMKM / POI
  if (
    /\b(umkm|merchant|usaha|toko|warung|restoran|restaurant|kuliner|poi)\b/u.test(combined)
  ) {
    return "UMKM_POI";
  }

  // 18. General Area
  if (
    /\b(area|wilayah|sekitar|kawasan|lingkungan)\b/u.test(combined)
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
    /\b(cara|bagaimana|buat|bikin|daftar|daftarkan|tambah|submit|masukin|mulai|registrasi)\b/iu.test(normalized)
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

  const requestedModes = inferRequestedRouteModes(normalized);
  const mode = requestedModes.length === 1 ? requestedModes[0] : null;

  const asksForRoute =
    /\b(rute|route|berapa lama|arah|navigasi|cara ke|pandu ke)\b/iu.test(normalized) ||
    (/\b(jalan kaki|naik motor|naik mobil|jalan)\b/iu.test(normalized) && /\b(ke|menuju|dari)\b/iu.test(normalized)) ||
    /\b(dari\s+.+\s+ke\s+.+)\b/iu.test(normalized);

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
      /\b(?:ke|menuju)\s+(.+?)(?=\s+(?:berapa\s+lama|jalan\s+kaki|naik\s+|pakai\s+)|[?!,.]|$)/iu,
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

function actionMessage(
  action: AiApplicationAction,
  selectedName?: string,
): string {
  switch (action.type) {
    case "CALCULATE_ROUTE":
      return selectedName
        ? `Saya menyiapkan rute ke ${selectedName} menggunakan GETRA.`
        : "Saya menyiapkan rute menggunakan GETRA.";

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

  if (
    intent ===
    "MERCHANT_SEARCH"
  ) {
    if (question && /\b(cari|carikan|temukan|rekomendasi|tempat makan|kopi|umkm|toko)\b/iu.test(question)) {
      return "GETRA siap mencari tempat atau UMKM terdaftar sesuai kebutuhan Anda pada peta Fair Discovery. Gunakan filter pencarian untuk melihat lokasi terdekat.";
    }
    return "Sebutkan jenis tempat, makanan, atau kebutuhan yang ingin Anda cari agar GETRA dapat menampilkan hasil yang relevan.";
  }

  if (
    intent ===
    "UNKNOWN"
  ) {
    return "Saya belum memahami informasi yang Anda perlukan. Coba tanyakan pencarian tempat, rute, transit terdekat, kondisi area, atau usaha pada titik peta.";
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
