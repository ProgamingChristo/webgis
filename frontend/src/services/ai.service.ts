import type {
  AiSearchAction,
  SearchCriteria,
} from "@/types/search-recommendation";

import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";

/**
 * Supported GETRA AI route modes.
 *
 * This contract must stay aligned with the backend AiRouteModeSchema.
 */
export type AiRouteMode =
  | "walking"
  | "motorcycle"
  | "car";

/**
 * Chat history item sent to Tanya GETRA.
 */
export interface AiAskMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Origin contract used by AI application actions.
 *
 * AI may identify what the user means, but coordinates must still
 * be resolved/validated by GETRA.
 */
export type AiActionOrigin =
  | {
      type: "CURRENT_LOCATION";
    }
  | {
      type: "PLACE_QUERY";
      query: string;
    }
  | {
      type: "MAP_POINT";
      longitude: number;
      latitude: number;
    };

/**
 * Destination contract used by AI routing actions.
 */
export type AiActionDestination =
  | {
      type: "SELECTED_MERCHANT";
    }
  | {
      type: "MERCHANT_ID";
      merchant_id: string;
    }
  | {
      type: "PLACE_QUERY";
      query: string;
    };

/**
 * Canonical application action returned by Tanya GETRA.
 *
 * Architecture:
 *
 * AI
 *   -> understands intent
 *   -> returns structured action
 *
 * GETRA application
 *   -> executes search / routing / map behavior
 *
 * GIS / routing engine
 *   -> calculates authoritative spatial metrics
 */
export type AiApplicationAction =
  | {
      type: "ANSWER_ONLY";
    }
  | {
      type: "APPLY_SEARCH_CRITERIA";
      criteria: SearchCriteria;
    }
  | {
      type: "CALCULATE_ROUTE";
      mode: AiRouteMode;
      origin: AiActionOrigin;
      destination: AiActionDestination;
    }
  | {
      type: "PREPARE_ROUTE";
      origin: AiActionOrigin;
      destination: AiActionDestination;
      requested_modes?: AiRouteMode[];
    }
  | {
      type: "CHANGE_ROUTE_MODE";
      mode: AiRouteMode;
    }
  | {
      type: "FOCUS_PLACE";
      query: string;
    }
  | {
      type: "REQUEST_CLARIFICATION";
      prompt: string;
    };

/**
 * Legacy/specialized map entity focus action.
 *
 * This remains separate from AiApplicationAction because existing
 * grounded GETRA answers may still return map_action.
 */
export interface AiMapAction {
  type: "FOCUS_ENTITY";

  entity_type:
    | "TRANSPORT_NODE"
    | "UMKM";

  entity_id: string;

  label?: string;
}

/**
 * Request sent to /api/ai/ask.
 */
export interface AiAskRequest {
  question: string;

  active_experience?:
    | "GENERAL"
    | "UMKM"
    | "INVESTOR"
    | "GOVERNMENT";

  context?: {
    /**
     * Enables merchant-search orchestration.
     */
    enable_search?: boolean;

    /**
     * Existing search state for conversational refinement.
     *
     * Examples:
     * - "yang paling dekat"
     * - "budget 20 ribu"
     * - "yang buka sekarang"
     */
    search_context?: SearchCriteria;

    study_area_id?: string;

    selected_entity_id?: string;

    selected_entity_name?: string;

    origin?: {
      latitude: number;
      longitude: number;
    };

    destination?: {
      latitude: number;
      longitude: number;
    };

    /**
     * Real route state calculated by GETRA.
     *
     * These values must NOT come from the language model.
     */
    active_route?: {
      mode: AiRouteMode;
      distance_meters: number;
      duration_seconds: number;
    };
  };

  history?: AiAskMessage[];
}

/**
 * Evidence/provenance returned with grounded GETRA answers.
 */
export interface AiEvidence {
  source: string;
  dataset: string;
  description?: string;
}

/**
 * Response from Tanya GETRA.
 */
export interface AiAskResponse {
  answer: string;

  intent: string;

  limitations: string[];

  evidence: AiEvidence[];

  /**
   * Existing entity-focus response.
   */
  map_action?: AiMapAction;

  /**
   * Canonical unified application action.
   *
   * This is the preferred contract going forward.
   *
   * Examples:
   * - APPLY_SEARCH_CRITERIA
   * - CALCULATE_ROUTE
   * - CHANGE_ROUTE_MODE
   * - FOCUS_PLACE
   * - REQUEST_CLARIFICATION
   */
  action?: AiApplicationAction;

  /**
   * @deprecated
   *
   * Compatibility only.
   *
   * Older frontend consumers may still reference search_action.
   * New code should use:
   *
   * response.action
   *
   * where:
   *
   * response.action.type === "APPLY_SEARCH_CRITERIA"
   *
   * The backend does not need to keep producing this field.
   */
  search_action?: AiSearchAction;

  provider:
    | "openai"
    | "sub2api"
    | "deterministic";
}

/**
 * Merchant-description assistant modes.
 */
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
  /**
   * Ask Tanya GETRA.
   */
  static async askQuestion(
    req: AiAskRequest,
  ): Promise<AiAskResponse> {
    const url =
      getGetraApiUrl(
        "/api/ai/ask",
      );

    const response =
      await authenticatedFetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              req,
            ),
        },
      );

    if (!response.ok) {
      let code:
        | string
        | undefined;

      try {
        const errorData =
          await response.json();

        code =
          typeof errorData
            ?.error?.code ===
          "string"
            ? errorData.error
                .code
            : undefined;
      } catch {
        /**
         * Response did not contain a readable JSON error body.
         * The HTTP status is still handled below.
         */
      }

      throw new Error(
        aiErrorMessage(
          code,
          response.status,
        ),
      );
    }

    const json =
      await response.json();

    if (
      !json.success ||
      !json.data
    ) {
      throw new Error(
        "Jawaban belum dapat disiapkan. Coba lagi.",
      );
    }

    /**
     * Fail closed if the backend returns an unknown provider.
     *
     * This is not used to decide which provider should run.
     * Provider selection happens server-side.
     */
    if (
      ![
        "openai",
        "sub2api",
        "deterministic",
      ].includes(
        json.data.provider,
      )
    ) {
      throw new Error(
        "Jawaban belum dapat disiapkan. Coba lagi.",
      );
    }

    return json.data as AiAskResponse;
  }

  /**
   * Assist UMKM owners with merchant-description writing.
   */
  static async assistMerchantDescription(
    request:
      MerchantDescriptionAssistRequest,

    options: {
      signal?: AbortSignal;
    } = {},
  ): Promise<MerchantDescriptionAssistResponse> {
    const response =
      await authenticatedFetch(
        getGetraApiUrl(
          "/api/ai/merchant-description",
        ),

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              request,
            ),

          signal:
            options.signal,
        },
      );

    const body =
      (await response.json()) as {
        success: boolean;

        data?:
          MerchantDescriptionAssistResponse;
      };

    if (
      !response.ok ||
      !body.success ||
      !body.data
        ?.description ||
      body.data.description
        .length > 450
    ) {
      throw new Error(
        "Deskripsi belum dapat disiapkan. Coba lagi.",
      );
    }

    return body.data;
  }
}

/**
 * Translate backend/API failures into safe user-facing messages.
 *
 * Never expose:
 * - provider credentials
 * - OpenAI errors directly
 * - internal route engines
 * - database implementation
 */
function aiErrorMessage(
  code: string | undefined,
  status: number,
): string {
  if (
    code ===
      "UNAUTHORIZED" ||
    status === 401
  ) {
    return "Sesi Anda telah berakhir. Masuk kembali untuk menggunakan Asisten GETRA.";
  }

  if (
    code ===
      "RATE_LIMIT_EXCEEDED" ||
    status === 429
  ) {
    return "Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar lagi.";
  }

  if (
    code ===
      "VALIDATION_ERROR" ||
    status === 400 ||
    status === 422
  ) {
    return "Pertanyaan belum dapat diproses. Periksa kembali lalu coba lagi.";
  }

  if (
    code ===
    "AI_PROVIDER_TIMEOUT"
  ) {
    return "Asisten membutuhkan waktu terlalu lama untuk menjawab. Coba lagi.";
  }

  return "Asisten sedang tidak dapat digunakan. Coba lagi beberapa saat nanti.";
}
