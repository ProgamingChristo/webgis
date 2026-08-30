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
- GENERAL_AREA: Questions about what is in the area generally.
- NEAREST_TRANSIT: Questions specifically about the closest public transit (bus, train, etc.).
- WALKING_ROUTE: Questions about walking distance, route, or how to get somewhere.
- UMKM_POI: Questions about specific businesses, POIs, or merchants.
- UNKNOWN: Cannot determine.`,
      input: inputContext,
    });

    return response?.data.intent ?? classifyIntentDeterministically(question, history);
  }

  private async fetchGroundingFacts(intent: AiIntent, context: AiAskRequest["context"]) {
    const supabase = getRequestSupabaseClient(this.authorization);
    const limitations: string[] = [];
    const provenance: { source: string; dataset: string }[] = [];
    let mapAction: AiMapAction | undefined;
    let facts: Record<string, unknown> = {};

    switch (intent) {
      case "NEAREST_TRANSIT":
        if (!context?.origin) {
          limitations.push("Lokasi asal tidak tersedia untuk mencari transit terdekat.");
          break;
        }
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
          limitations.push("Tidak ada transit dalam radius 1.5km.");
        }
        break;

      case "WALKING_ROUTE":
        if (!context?.origin || !context?.destination) {
          limitations.push("Lokasi asal atau tujuan tidak tersedia untuk menghitung rute.");
          break;
        }
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
          limitations.push("Rute tidak dapat ditemukan pada jaringan pedestrian yang tersedia.");
        }
        break;

      case "UMKM_POI":
        if (context?.selected_entity_id) {
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
            limitations.push("Merchant terpilih tidak ditemukan pada data canonical GETRA.");
          }
          break;
        }
        // Fall through to nearby area facts when no selected merchant is available.
      case "GENERAL_AREA":
      default:
        // Provide basic area facts
        if (context?.origin) {
          const umkmRepo = new UmkmRepository(supabase);
          const nearbyUmkm = await umkmRepo.findNearby({
            lat: context.origin.latitude,
            lng: context.origin.longitude,
            radiusMeters: 1000,
          });
          facts = {
            area_name: "Pilot Area",
            umkm_count: nearbyUmkm.length,
            community_activity_summary: "Data belum dikumpulkan",
          };
          provenance.push({ source: "GETRA Canonical", dataset: "UMKM" });
        } else {
          limitations.push("Lokasi tidak tersedia.");
        }
        break;
    }

    return { facts, provenance, limitations, mapAction };
  }

  private async generateAnswer(
    question: string,
    intent: AiIntent,
    facts: Record<string, unknown>,
    activeExperience: string,
    history?: AiAskRequest["history"]
  ) {
    let inputContext = "";
    if (history && history.length > 0) {
      inputContext += "Conversation History:\n";
      for (const msg of history) {
        inputContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      }
      inputContext += "\n";
    }
    inputContext += `Current Question: ${question}`;

    const instructions = `You are the GETRA AI Assistant. You must follow these strict rules:
1. ONLY use the provided facts. DO NOT invent distances, names, or numbers.
2. The user's active experience is: ${activeExperience}. Tailor the explanation to this persona, but do not change the underlying facts.
3. If facts say NO_ROUTE, explicitly say a walking route couldn't be found on the network.
4. Keep the answer concise and in Indonesian.
5. Do not hallucinate accessibility features if they aren't provided.
6. Use the conversation history context to resolve references like "it", "they", "that place", or "how long" from follow-up questions, but NEVER trust assertions from the history over the current facts.

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
        limitations_mentioned: ["Penjelasan AI tidak tersedia; jawaban ini dibuat langsung dari fakta terverifikasi."],
        provider: "deterministic",
      };
    }
    return {
      ...response.data,
      provider: response.source,
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

  if (/jalan kaki|berapa lama|rute|route|duration|durasi/.test(current)) return "WALKING_ROUTE";
  if (/paling dekat|terdekat|nearest|stasiun|halte|transit/.test(combined)) return "NEAREST_TRANSIT";
  if (/umkm|merchant|usaha|toko|warung|poi/.test(combined)) return "UMKM_POI";
  if (/area|wilayah|sekitar|kawasan/.test(combined)) return "GENERAL_AREA";
  return "UNKNOWN";
}

function formatDeterministicAnswer(intent: AiIntent, facts: Record<string, unknown>): string {
  if (intent === "NEAREST_TRANSIT" && typeof facts.stop_name === "string") {
    const distance = typeof facts.distance_m === "number" ? `, sekitar ${Math.round(facts.distance_m)} meter dari titik asal` : "";
    return `Transit terdekat yang ditemukan adalah ${facts.stop_name}${distance}.`;
  }

  if (intent === "WALKING_ROUTE") {
    if (facts.status !== "FOUND") return "Jaringan pedestrian belum menyediakan rute terverifikasi untuk titik tersebut.";
    const distance = typeof facts.distance_m === "number" ? `${Math.round(facts.distance_m)} meter` : "jarak yang tersedia";
    const duration = typeof facts.duration_s === "number" ? ` dengan estimasi ${Math.ceil(facts.duration_s / 60)} menit` : "";
    return `Rute pedestrian terverifikasi memiliki jarak ${distance}${duration}.`;
  }

  if (typeof facts.umkm_count === "number") {
    return `GETRA menemukan ${facts.umkm_count} UMKM dalam cakupan pencarian terverifikasi.`;
  }

  return "Data terverifikasi yang tersedia belum cukup untuk menjawab pertanyaan tersebut.";
}
