import { authenticatedFetch } from "@/src/lib/auth-client";

export interface AiAskRequest {
  question: string;
  active_experience?: "GENERAL" | "UMKM" | "INVESTOR" | "GOVERNMENT";
  context?: {
    study_area_id?: string;
    selected_entity_id?: string;
    origin?: {
      latitude: number;
      longitude: number;
    };
    destination?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface AiAskResponse {
  answer: string;
  intent: string;
  limitations: string[];
  evidence: { source: string; dataset: string; description?: string }[];
}

export class AiService {
  static async askQuestion(req: AiAskRequest): Promise<AiAskResponse> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/ai/ask`;
    
    const response = await authenticatedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      let message = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          message = errorData.error.message;
        }
      } catch {}
      throw new Error(message);
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error("Invalid response format from AI service");
    }

    return json.data as AiAskResponse;
  }
}
