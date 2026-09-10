import { generateStructured } from "@/lib/ai/provider";
import {
  type AiAskRequest,
  type AiAskResponse,
  type AiIntent,
  type AiMapAction,
  IntentClassificationSchema,
  GroundedGenerationSchema,
} from "./ai.schema";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { UmkmRepository } from "@/src/repositories/umkm.repository";
import { CommuterNetworkRepository } from "@/src/features/commuter";

export class AiService {
  constructor(private readonly authorization: string) {}

  async handleAskRequest(req: AiAskRequest): Promise<AiAskResponse> {
    const { question, active_experience, context, history } = req;

    // 1. Determine Intent
    const intent = await this.determineIntent(question, history);

    // 2. Fetch Facts based on intent
    const { facts, provenance, limitations, mapAction } = await this.fetchGroundingFacts(intent, context);

    // 3. Generate Answer
    const answer = await this.generateAnswer(question, intent, facts, active_experience, history);

    return {
      answer: answer.answer,
      intent,
      limitations: [...limitations, ...answer.limitations_mentioned],
      evidence: provenance,
      map_action: mapAction,
      provider: answer.provider,
    };
  }

  private async determineIntent(question: string, history?: AiAskRequest["history"]): Promise<AiIntent> {
    const deterministicIntent = classifyIntentDeterministically(question, history);
    if (
      deterministicIntent === "ASSISTANT_IDENTITY" ||
      deterministicIntent === "CASUAL_CHAT"
    ) {
      return deterministicIntent;
    }

    let inputContext = "";
    if (history && history.length > 0) {
      inputContext += "Conversation History:\n";
      for (const msg of history) {
        inputContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      }
      inputContext += "\n";
    }
    inputContext += `Current Question: ${question}`;

    const response = await generateStructured({
      schema: IntentClassificationSchema,
      schemaName: "intent_classification",
      instructions: `You are a classifier for the GETRA spatial analytics system. Classify the user's question into one of the following intents:
- ASSISTANT_IDENTITY: Greetings or questions about whether this is GETRA AI, who the assistant is, or what it can do.
- CASUAL_CHAT: Simple conversation, user introductions, non-spatial small talk, or random lightweight questions that do not require GIS facts.
- GENERAL_AREA: Questions about what is in the area generally.
- NEAREST_TRANSIT: Questions specifically about the closest public transit (bus, train, etc.).
- WALKING_ROUTE: Questions about walking distance, route, or how to get somewhere.
- UMKM_POI: Questions about specific businesses, POIs, or merchants.
- UNKNOWN: Cannot determine.`,
      input: inputContext,
    });

    return response?.data.intent ?? deterministicIntent;
  }

  private async fetchGroundingFacts(intent: AiIntent, context: AiAskRequest["context"]) {
    const limitations: string[] = [];
    const provenance: { source: string; dataset: string }[] = [];
    let mapAction: AiMapAction | undefined;
    let facts: Record<string, unknown> = {};

    switch (intent) {
      case "ASSISTANT_IDENTITY": {
        facts = {
          assistant_name: "Asisten GETRA",
          capabilities: ["rute", "area", "akses", "transit", "titik peta", "UMKM"],
          grounding_policy: "Jawaban analisis menggunakan data GETRA yang tersedia.",
        };
        break;
      }

      case "CASUAL_CHAT": {
        facts = {
          assistant_name: "Asisten GETRA",
          chat_mode: "Percakapan umum ringan",
          safe_topics: [
            "pertanyaan sederhana",
            "bantuan memakai GETRA",
            "penjelasan rute dan area jika konteks peta tersedia",
          ],
          grounding_policy:
            "Pertanyaan umum boleh dijawab langsung; klaim spasial tetap harus berdasarkan data GETRA.",
        };
        break;
      }

      case "NEAREST_TRANSIT": {
        if (!context?.origin) {
          limitations.push("Lokasi asal tidak tersedia untuk mencari transit terdekat.");
          break;
        }
        const supabase = getRequestSupabaseClient(this.authorization);
        const transportRepo = new TransportNodeRepository(supabase);
        const nearStops = await transportRepo.findNear(
          {
            latitude: context.origin.latitude,
            longitude: context.origin.longitude,
            radius_meters: 1500,
          },
          {
            limit: 1,
            offset: 0,
            page: 1,
            sort: "created_at",
            order: "desc",
          },
        );
        if (nearStops.items.length > 0) {
          const stop = nearStops.items[0];
          facts = {
            stop_name: stop.name,
            distance_m: Number.isFinite(Number((stop as any).distance_meters))
              ? Number((stop as any).distance_meters)
              : null,
            corridor: stop.corridor_id,
            accessibility_status: "INSUFFICIENT", // Default fallback if no clear data
          };
          mapAction = {
            entity_id: stop.id,
            entity_type: "TRANSPORT_NODE",
            label: stop.name,
            type: "FOCUS_ENTITY",
          };
          provenance.push({ source: "GETRA Canonical", dataset: "Transport Nodes" });
        } else {
          limitations.push("Belum ada titik transit yang ditemukan dalam jarak 1,5 km.");
        }
        break;
      }

      case "WALKING_ROUTE": {
        if (!context?.origin || !context?.destination) {
          limitations.push("Lokasi asal atau tujuan tidak tersedia untuk menghitung rute.");
          break;
        }
        const supabase = getRequestSupabaseClient(this.authorization);
        const routingService = new CommuterNetworkRepository(supabase);
        try {
          const route = await routingService.route(
            { ...context.origin, source: "EXPLICIT_ORIGIN" },
            context.destination,
          );
          if (route.status !== "ROUTABLE") throw new Error("NO_ROUTE");
          facts = {
            distance_m: Number(route.distance_meters),
            duration_s: Number(route.duration_seconds),
            status: "FOUND",
          };
          provenance.push({ source: "pgRouting", dataset: "Pedestrian Network" });
        } catch {
          facts = { status: "NO_ROUTE" };
          limitations.push("Rute jalan kaki belum dapat ditemukan untuk kedua titik tersebut.");
        }
        break;
      }

      case "UMKM_POI": {
        if (context?.selected_entity_id) {
          const supabase = getRequestSupabaseClient(this.authorization);
          const umkmRepo = new UmkmRepository(supabase);
          const merchant = await umkmRepo.findById(context.selected_entity_id);

          if (merchant) {
            facts = {
              merchant_name: merchant.name,
              category: merchant.category ?? null,
              status: merchant.provenance?.validation_status ?? null,
              price_evidence_available: false,
            };
            mapAction = {
              entity_id: merchant.id,
              entity_type: "UMKM",
              label: merchant.name,
              type: "FOCUS_ENTITY",
            };
            provenance.push({ source: "GETRA Canonical", dataset: "UMKM" });
          } else {
            limitations.push("Tempat yang dipilih belum ditemukan pada data GETRA.");
          }
        } else {
          limitations.push("Pilih usaha pada peta terlebih dahulu agar GETRA dapat menjelaskannya.");
        }
        break;
      }

      case "GENERAL_AREA": {
        if (context?.origin) {
          const supabase = getRequestSupabaseClient(this.authorization);
          const umkmRepo = new UmkmRepository(supabase);
          const nearbyUmkm = await umkmRepo.findNearby({
            lat: context.origin.latitude,
            lng: context.origin.longitude,
            radiusMeters: 1000,
          });
          facts = {
            area_name: "Area di sekitar titik pilihan",
            umkm_count: nearbyUmkm.length,
            community_activity_summary: "Data belum dikumpulkan",
          };
          provenance.push({ source: "GETRA Canonical", dataset: "UMKM" });
        } else {
          limitations.push("Pilih lokasi terlebih dahulu agar saya dapat melihat area di sekitarnya.");
        }
        break;
      }

      case "UNKNOWN": {
        facts = {
          supported_topics: ["rute", "transit terdekat", "kondisi area", "UMKM pada titik peta"],
        };
        break;
      }
    }

    return { facts, provenance, limitations, mapAction };
  }

  private async generateAnswer(
    question: string,
    intent: AiIntent,
    facts: Record<string, unknown>,
    activeExperience: string,
    history?: AiAskRequest["history"]
  ): Promise<{
    answer: string;
    limitations_mentioned: string[];
    provider: "sub2api" | "deterministic";
  }> {
    let inputContext = "";
    if (history && history.length > 0) {
      inputContext += "Conversation History:\n";
      for (const msg of history) {
        inputContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      }
      inputContext += "\n";
    }
    inputContext += `Current Question: ${question}`;

    const instructions = `You are the GETRA product assistant. Follow these strict rules:
1. Use ONLY the provided facts. Never invent distances, names, numbers, ratings, revenue, or current conditions.
2. The user's active experience is ${activeExperience}. Adapt the benefit and next action to that experience without changing facts.
3. Answer in natural, calm Indonesian. Prefer 1-3 sentences for a simple question and short paragraphs for an insight.
4. Lead with what is known. Then state any important limitation and a useful next action.
5. Never mention provider names, grounding, deterministic fallback, schemas, databases, status codes, route engines, graph data, or internal architecture.
6. If facts say NO_ROUTE, say that the walking route cannot be calculated right now. Do not name the routing technology.
7. If location context is missing, tell the user which location to select or enable.
8. If only part of the data is available, use the available facts first and clearly say what GETRA cannot confirm.
9. Treat observations as time-bound records, not real-time truth. Mention the observation date naturally when it is provided.
10. Never claim a place does not exist merely because GETRA has no matching data.
11. Do not invent accessibility features when they are not provided.
12. Use conversation history only to resolve references in follow-up questions; current facts always take precedence.

FACTS PROVIDED:
${JSON.stringify(facts, null, 2)}
`;

    const response = await generateStructured({
      schema: GroundedGenerationSchema,
      schemaName: "grounded_answer",
      instructions,
      input: inputContext,
    });

    if (!response) {
      return {
        answer: formatDeterministicAnswer(intent, facts),
        limitations_mentioned: ["Sebagian penjelasan belum tersedia, tetapi fakta GETRA yang ada tetap dapat digunakan."],
        provider: "deterministic",
      };
    }
    return {
      ...response.data,
      provider: response.source === "sub2api" ? "sub2api" : "deterministic",
    };
  }
}

function classifyIntentDeterministically(
  question: string,
  history?: AiAskRequest["history"],
): AiIntent {
  const current = question.toLocaleLowerCase("id-ID");
  const recentContext = history?.slice(-2).map((item) => item.content).join(" ").toLocaleLowerCase("id-ID") ?? "";
  const combined = `${recentContext} ${current}`;

  if (
    /^(halo|hai|hi|hello|pagi|siang|sore|malam)[!.?\s]*$/u.test(current.trim()) ||
    /kamu siapa|siapa kamu|asisten (?:aku|saya)|getra ai|apakah kamu ai|kamu ai|apa yang (?:bisa|dapat) kamu (?:lakukan|bantu)/u.test(current)
  ) {
    return "ASSISTANT_IDENTITY";
  }
  if (
    /\b(halo|hai|hi|hello|pagi|siang|sore|malam)\b/u.test(current) ||
    /\b(aku|saya|namaku|nama saya)\b/u.test(current) ||
    /\b(random|acak|cerita|ngobrol|chat|tes|test|apa kabar|makasih|terima kasih)\b/u.test(current)
  ) {
    return "CASUAL_CHAT";
  }
  if (/jalan kaki|berapa lama|rute|route|duration|durasi/.test(current)) return "WALKING_ROUTE";
  if (/paling dekat|terdekat|nearest|stasiun|halte|transit/.test(combined)) return "NEAREST_TRANSIT";
  if (/umkm|merchant|usaha|toko|warung|poi/.test(combined)) return "UMKM_POI";
  if (/area|wilayah|sekitar|kawasan/.test(combined)) return "GENERAL_AREA";
  return "UNKNOWN";
}

function formatDeterministicAnswer(intent: AiIntent, facts: Record<string, unknown>): string {
  if (intent === "ASSISTANT_IDENTITY") {
    return "Ya, saya Asisten GETRA. Saya dapat membantu mencari tempat serta menjelaskan area, akses, transit, dan rute berdasarkan data GETRA yang tersedia.";
  }

  if (intent === "CASUAL_CHAT") {
    return "Hai, saya siap membantu. Anda dapat bertanya tentang tempat, rute, area, usaha lokal, ruang usaha, atau aksesibilitas berdasarkan data GETRA yang tersedia.";
  }

  if (intent === "UNKNOWN") {
    return "Saya belum memahami informasi yang Anda perlukan. Coba tanyakan rute, transit terdekat, kondisi area, atau usaha pada titik peta.";
  }

  if (intent === "NEAREST_TRANSIT" && typeof facts.stop_name === "string") {
    const distance = typeof facts.distance_m === "number" ? `, sekitar ${Math.round(facts.distance_m)} meter dari titik asal` : "";
    return `Transit terdekat yang ditemukan adalah ${facts.stop_name}${distance}.`;
  }

  if (intent === "WALKING_ROUTE") {
    if (facts.status !== "FOUND") return "Rute jalan kaki belum dapat dihitung untuk titik tersebut. Periksa titik awal dan tujuan, lalu coba lagi.";
    const distance = typeof facts.distance_m === "number" ? `${Math.round(facts.distance_m)} meter` : "jarak yang tersedia";
    const duration = typeof facts.duration_s === "number" ? ` dengan estimasi ${Math.ceil(facts.duration_s / 60)} menit` : "";
    return `Sekitar ${duration ? duration.replace(" dengan estimasi ", "") : "beberapa menit"} berjalan kaki dengan jarak kurang lebih ${distance}.`;
  }

  if (typeof facts.umkm_count === "number") {
    return `Saya menemukan ${facts.umkm_count} usaha di area sekitar titik yang dipilih.`;
  }

  return "GETRA belum memiliki cukup informasi untuk menjawab pertanyaan tersebut. Pilih titik di peta atau tambahkan lokasi agar saya dapat membantu lebih lanjut.";
}
