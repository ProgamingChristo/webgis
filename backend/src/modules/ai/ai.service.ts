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

    // 2. Guardrail: Unauthorized Privilege Escalation
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

    if (/\b(berapa macet|kemacetan sekarang|macet sekarang|live traffic)\b/iu.test(normalizedQuestion)) {
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

    if (/^getra bisa (?:bantu )?apa\b/iu.test(normalizedQuestion)) {
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
          "Anda dapat mendaftarkan usaha Anda melalui menu UMKM > Daftarkan Usaha di GETRA dengan mengisi nama usaha, alamat lengkap, kategori usaha, dan menandai koordinat lokasi pada peta untuk diverifikasi tim Admin.",
        intent: "UMKM_POI",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bkenapa belum bisa (?:promosi|bayar)\b/iu.test(normalizedQuestion) || /\bbagaimana promosi di getra\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Promosi berbayar (Midtrans Sandbox) di GETRA mensyaratkan usaha Anda telah berstatus terverifikasi (VERIFIED) oleh tim Admin, dipublikasikan aktif di peta, dan akun Anda berada pada mode stakeholder UMKM.",
        intent: "UMKM_POI",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
        provider: "deterministic",
      };
    }

    if (/\bapa itu sponsored\b/iu.test(normalizedQuestion)) {
      return {
        answer:
          "Fitur Promosi (Sponsored) di GETRA memungkinkan UMKM terverifikasi meningkatkan jangkauan promosi visual pada peta dan panel rekomendasi melalui pembayaran resmi Midtrans Sandbox tanpa mengorbankan relevansi hasil pencarian Fair Discovery.",
        intent: "UMKM_POI",
        limitations: [],
        evidence: [],
        action: { type: "ANSWER_ONLY" },
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
    if (context?.enable_search) {
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
              context.origin
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
          !context.origin
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
        "CHANGE_ROUTE_MODE"
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
      "ANSWER_ONLY"
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
     * Greetings / identity questions do not need an external model.
     */
    if (
      deterministicIntent ===
        "ASSISTANT_IDENTITY" ||
      deterministicIntent ===
        "CASUAL_CHAT"
    ) {
      return {
        intent:
          deterministicIntent,

        provider:
          "deterministic",
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

- GENERAL_AREA:
  Questions about what exists or is happening in an area generally.

- NEAREST_TRANSIT:
  Questions where the requested target itself is nearby public transit, such as the nearest station or bus stop.

- WALKING_ROUTE:
  Requests involving route calculation, directions, travel duration, navigation, or walking to a destination.
  This historical intent name may still accompany routes that later change transport mode through an application action.

- UMKM_POI:
  Questions about a specific already-selected merchant, business, UMKM, or POI.

- MERCHANT_SEARCH:
  Requests to search, discover, find, filter, or recommend merchants, food, shops, restaurants, or UMKM.

- UNKNOWN:
  The request cannot be classified safely.

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
  const current =
    question
      .toLocaleLowerCase(
        "id-ID",
      )
      .replace(/\s+/g, " ")
      .trim();

  const recentContext =
    history
      ?.slice(-2)
      .map(
        (item) =>
          item.content,
      )
      .join(" ")
      .toLocaleLowerCase(
        "id-ID",
      ) ?? "";

  const combined =
    `${recentContext} ${current}`;

  if (
    /^(halo|hai|hi|hello|pagi|siang|sore|malam)[!.?\s]*$/u.test(
      current,
    ) ||
    /kamu siapa|siapa kamu|asisten (?:aku|saya)|getra ai|apakah kamu ai|kamu ai|apa yang (?:bisa|dapat) kamu (?:lakukan|bantu)/u.test(
      current,
    )
  ) {
    return "ASSISTANT_IDENTITY";
  }

  if (
    /\b(halo|hai|hi|hello|pagi|siang|sore|malam)\b/u.test(
      current,
    ) ||
    /\b(aku|saya|namaku|nama saya)\b/u.test(
      current,
    ) ||
    /\b(random|acak|cerita|ngobrol|chat|tes|test|apa kabar|makasih|terima kasih)\b/u.test(
      current,
    )
  ) {
    return "CASUAL_CHAT";
  }

  /**
   * Route requests take precedence.
   */
  if (
    /\b(jalan kaki|berapa lama|rute|route|duration|durasi|navigasi|arah ke)\b/u.test(
      current,
    )
  ) {
    return "WALKING_ROUTE";
  }

  /**
   * Explicit nearest-transit requests.
   *
   * Important:
   * "bakso dekat stasiun"
   * should NOT automatically become NEAREST_TRANSIT.
   */
  if (
    /\b(stasiun|halte|transit)\b.*\b(dekat|terdekat|nearest)\b/u.test(
      current,
    ) ||
    /\b(paling dekat|terdekat|nearest)\b.*\b(stasiun|halte|transit)\b/u.test(
      current,
    )
  ) {
    return "NEAREST_TRANSIT";
  }

  /**
   * Explicit discovery/search requests.
   */
  if (
    /\b(cari|carikan|temukan|rekomendasikan|rekomendasi|mau makan|tempat makan)\b/u.test(
      current,
    )
  ) {
    return "MERCHANT_SEARCH";
  }

  if (
    /\b(umkm|merchant|usaha|toko|warung|restoran|restaurant|kuliner|poi)\b/u.test(
      combined,
    )
  ) {
    return "UMKM_POI";
  }

  if (
    /\b(area|wilayah|sekitar|kawasan)\b/u.test(
      combined,
    )
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
      .trim();

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
    intent ===
    "MERCHANT_SEARCH"
  ) {
    return "Sebutkan jenis tempat, makanan, atau kebutuhan yang ingin Anda cari agar GETRA dapat menampilkan hasil yang relevan.";
  }

  if (
    intent ===
    "UNKNOWN"
  ) {
    return "Saya belum memahami informasi yang Anda perlukan. Coba tanyakan pencarian tempat, rute, transit terdekat, kondisi area, atau usaha pada titik peta.";
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
