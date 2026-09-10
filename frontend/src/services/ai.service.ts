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
      let code: string | undefined;
      try {
        const errorData = await response.json();
        code = typeof errorData?.error?.code === "string"
          ? errorData.error.code
          : undefined;
      } catch {}
      throw new Error(aiErrorMessage(code, response.status));
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      throw new Error("Jawaban belum dapat disiapkan. Coba lagi.");
    }

    if (!["sub2api", "deterministic"].includes(json.data.provider)) {
      throw new Error("Jawaban belum dapat disiapkan. Coba lagi.");
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
      throw new Error("Deskripsi belum dapat disiapkan. Coba lagi.");
    }

    return body.data;
  }
}

function aiErrorMessage(code: string | undefined, status: number): string {
  if (code === "UNAUTHORIZED" || status === 401) {
    return "Sesi Anda telah berakhir. Masuk kembali untuk menggunakan Asisten GETRA.";
  }
  if (code === "RATE_LIMIT_EXCEEDED" || status === 429) {
    return "Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar lagi.";
  }
  if (code === "VALIDATION_ERROR" || status === 400 || status === 422) {
    return "Pertanyaan belum dapat diproses. Periksa kembali lalu coba lagi.";
  }
  if (code === "AI_PROVIDER_TIMEOUT") {
    return "Asisten membutuhkan waktu terlalu lama untuk menjawab. Coba lagi.";
  }
  return "Asisten sedang tidak dapat digunakan. Coba lagi beberapa saat nanti.";
}
