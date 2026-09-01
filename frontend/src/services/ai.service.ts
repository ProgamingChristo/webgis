import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";

export interface AiAskMessage {
  role: "user" | "assistant";
  content: string;
}

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
  history?: AiAskMessage[];
}

export interface AiAskResponse {
  answer: string;
  intent: string;
  limitations: string[];
  evidence: { source: string; dataset: string; description?: string }[];
  provider: "sub2api" | "deterministic";
}

export type MerchantDescriptionMode =
  | "generate"
  | "improve"
  | "engaging"
  | "shorten"
  | "proofread";

export interface MerchantDescriptionAssistRequest {
  mode: MerchantDescriptionMode;
  businessName?: string;
  category?: string;
  products?: string;
  priceRange?: string;
  advantages?: string;
  description: string;
}

export interface MerchantDescriptionAssistResponse {
  description: string;
}

export class AiService {
  static async askQuestion(req: AiAskRequest): Promise<AiAskResponse> {
    const url = getGetraApiUrl("/api/ai/ask");
    
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

    if (!["sub2api", "deterministic"].includes(json.data.provider)) {
      throw new Error("Invalid provider metadata from AI service");
    }

    return json.data as AiAskResponse;
  }

  static async assistMerchantDescription(
    request: MerchantDescriptionAssistRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<MerchantDescriptionAssistResponse> {
    const response = await authenticatedFetch(
      getGetraApiUrl("/api/ai/merchant-description"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: options.signal,
      },
    );

    const body = await response.json() as {
      success: boolean;
      data?: MerchantDescriptionAssistResponse;
    };

    if (
      !response.ok ||
      !body.success ||
      !body.data?.description ||
      body.data.description.length > 450
    ) {
      throw new Error("Gagal membuat deskripsi. Coba lagi.");
    }

    return body.data;
  }
}
