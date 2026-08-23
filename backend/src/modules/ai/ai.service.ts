import { generateStructured } from "@/lib/ai/provider";
import {
  type AiAskRequest,
  type AiAskResponse,
  type AiIntent,
  IntentClassificationSchema,
  GroundedGenerationSchema,
} from "./ai.schema";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { UmkmRepository } from "@/src/repositories/umkm.repository";
import { RoutingService } from "@/src/modules/pedestrian-network/routing.service";

export class AiService {
  constructor(private readonly authorization: string) {}

  async handleAskRequest(req: AiAskRequest): Promise<AiAskResponse> {
    const { question, active_experience, context } = req;

    // 1. Determine Intent
    const intent = await this.determineIntent(question);

    // 2. Fetch Facts based on intent
    const { facts, provenance, limitations } = await this.fetchGroundingFacts(intent, context);

    // 3. Generate Answer
    const answer = await this.generateAnswer(question, intent, facts, active_experience);

    return {
      answer: answer.answer,
      intent,
      limitations: [...limitations, ...answer.limitations_mentioned],
      evidence: provenance,
    };
  }

  private async determineIntent(question: string): Promise<AiIntent> {
    const response = await generateStructured({
      schema: IntentClassificationSchema,
      schemaName: "intent_classification",
      instructions: `You are a classifier for the GETRA spatial analytics system. Classify the user's question into one of the following intents:
- GENERAL_AREA: Questions about what is in the area generally.
- NEAREST_TRANSIT: Questions specifically about the closest public transit (bus, train, etc.).
- WALKING_ROUTE: Questions about walking distance, route, or how to get somewhere.
- UMKM_POI: Questions about specific businesses, POIs, or merchants.
- UNKNOWN: Cannot determine.`,
      input: question,
    });

    return response?.data.intent ?? "UNKNOWN";
  }

  private async fetchGroundingFacts(intent: AiIntent, context: AiAskRequest["context"]) {
    const supabase = getRequestSupabaseClient(this.authorization);
    const limitations: string[] = [];
    const provenance: { source: string; dataset: string }[] = [];
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
            distance_m: null,
            corridor: null,
            accessibility_status: "INSUFFICIENT", // Default fallback if no clear data
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
        const routingService = new RoutingService(supabase);
        try {
          const route = await routingService.getRoute(
            context.origin.latitude,
            context.origin.longitude,
            context.destination.latitude,
            context.destination.longitude
          );
          facts = {
            distance_m: route.distanceMeters,
            duration_s: route.durationSeconds,
            status: "FOUND",
          };
          provenance.push({ source: "pgRouting", dataset: "Pedestrian Network" });
        } catch {
          facts = { status: "NO_ROUTE" };
          limitations.push("Rute tidak dapat ditemukan pada jaringan pedestrian yang tersedia.");
        }
        break;

      case "UMKM_POI":
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

    return { facts, provenance, limitations };
  }

  private async generateAnswer(
    question: string,
    intent: AiIntent,
    facts: Record<string, unknown>,
    activeExperience: string,
  ) {
    const instructions = `You are the GETRA AI Assistant. You must follow these strict rules:
1. ONLY use the provided facts. DO NOT invent distances, names, or numbers.
2. The user's active experience is: ${activeExperience}. Tailor the explanation to this persona, but do not change the underlying facts.
3. If facts say NO_ROUTE, explicitly say a walking route couldn't be found on the network.
4. Keep the answer concise and in Indonesian.
5. Do not hallucinate accessibility features if they aren't provided.

FACTS PROVIDED:
${JSON.stringify(facts, null, 2)}
`;

    const response = await generateStructured({
      schema: GroundedGenerationSchema,
      schemaName: "grounded_answer",
      instructions,
      input: question,
    });

    if (!response) {
      return {
        answer: "Maaf, sistem AI sedang tidak tersedia.",
        limitations_mentioned: ["AI Timeout"],
      };
    }
    return response.data;
  }
}
