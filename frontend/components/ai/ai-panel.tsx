"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Eraser,
  LoaderCircle,
  Minus,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { useAi } from "@/src/hooks/use-ai";

import type {
  AiApplicationAction,
  AiRouteMode,
} from "@/src/services/ai.service";

import type {
  AiSearchAction,
  SearchCriteria,
} from "@/types/search-recommendation";

export type {
  AiSearchAction,
} from "@/types/search-recommendation";

export interface AiActionExecutionResult {
  status:
    | "COMPLETED"
    | "ROUTE_PENDING"
    | "REJECTED";

  message?: string;
}

interface AiPanelProps {
  activeExperience:
    | "GENERAL"
    | "UMKM"
    | "INVESTOR"
    | "GOVERNMENT";

  currentOrigin?: {
    latitude: number;
    longitude: number;
  };

  currentDestination?: {
    latitude: number;
    longitude: number;
  };

  selectedEntityId?: string;

  selectedEntityName?: string;

  studyAreaId?: string;

  /**
   * Search state currently active in GETRA.
   *
   * This allows conversational follow-ups such as:
   * - "yang paling dekat"
   * - "budget 20 ribu"
   * - "yang buka sekarang"
   */
  searchContext?: SearchCriteria;

  /**
   * Temporary compatibility callback.
   *
   * Older parent components may still execute search actions
   * through onSearchAction().
   *
   * New integrations should prefer onAction().
   */
  onSearchAction?: (
    action: AiSearchAction,
  ) => Promise<string>;

  /**
   * Protects newer manual search state from being overwritten
   * by an older AI request.
   */
  getSearchRevision?: () => number;

  /**
   * Actual route state produced by GETRA.
   *
   * AI does not calculate these metrics.
   */
  activeRoute?: {
    mode: AiRouteMode;
    distance_meters: number;
    duration_seconds: number;
  };

  /**
   * Canonical application action executor.
   *
   * Expected actions:
   * - APPLY_SEARCH_CRITERIA
   * - CALCULATE_ROUTE
   * - PREPARE_ROUTE
   * - CHANGE_ROUTE_MODE
   * - FOCUS_PLACE
   */
  onAction?: (
    action: AiApplicationAction,
  ) => Promise<AiActionExecutionResult>;

  onMinimize?: () => void;

  onClose?: () => void;
}

interface PendingRoute {
  mode: AiRouteMode;
  previousSignature: string | null;
}

export function AiPanel({
  activeExperience,
  currentOrigin,
  currentDestination,
  selectedEntityId,
  selectedEntityName,
  studyAreaId,
  searchContext,
  onSearchAction,
  getSearchRevision,
  activeRoute,
  onAction,
  onMinimize,
  onClose,
}: AiPanelProps) {
  const {
    state,
    messages,
    askQuestion,
    appendAssistantMessage,
    clearChat,
  } = useAi();

  const [
    question,
    setQuestion,
  ] = useState("");

  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  /**
   * Stores a routing request until the REAL GETRA route state
   * changes.
   *
   * This prevents Tanya GETRA from fabricating:
   * - distance
   * - duration
   * - walking time
   */
  const pendingRouteRef =
    useRef<PendingRoute | null>(
      null,
    );

  /**
   * Keep the conversation positioned on the latest message.
   */
  useEffect(() => {
    const node =
      scrollRef.current;

    if (!node) {
      return;
    }

    node.scrollTop =
      node.scrollHeight;
  }, [
    messages,
    state,
  ]);

  /**
   * Watch the actual GETRA routing result.
   *
   * Only after activeRoute changes do we tell the user
   * the real distance and duration.
   */
  useEffect(() => {
    const pendingRoute =
      pendingRouteRef.current;

    if (
      !pendingRoute ||
      !activeRoute
    ) {
      return;
    }

    /**
     * Ignore another route mode.
     */
    if (
      activeRoute.mode !==
      pendingRoute.mode
    ) {
      return;
    }

    const signature =
      routeSignature(
        activeRoute,
      );

    /**
     * No new route result yet.
     */
    if (
      signature ===
      pendingRoute.previousSignature
    ) {
      return;
    }

    const durationMinutes =
      Math.max(
        1,
        Math.ceil(
          activeRoute.duration_seconds /
            60,
        ),
      );

    appendAssistantMessage(
      `Rute ${routeModeLabel(
        activeRoute.mode,
      ).toLocaleLowerCase(
        "id-ID",
      )} sudah saya tampilkan di peta. ` +
        `Perjalanannya sekitar ${durationMinutes} menit dengan jarak ${formatDistance(
          activeRoute.distance_meters,
        )}.`,
    );

    pendingRouteRef.current =
      null;
  }, [
    activeRoute,
    appendAssistantMessage,
  ]);

  /**
   * Execute merchant search.
   *
   * New architecture:
   *
   * response.action
   * → APPLY_SEARCH_CRITERIA
   * → onAction()
   *
   * Compatibility:
   *
   * response.action
   * → APPLY_SEARCH_CRITERIA
   * → onSearchAction()
   */
  const executeSearchAction =
    useCallback(
      async (
        action: Extract<
          AiApplicationAction,
          {
            type:
              "APPLY_SEARCH_CRITERIA";
          }
        >,
        searchRevision:
          | number
          | undefined,
      ): Promise<void> => {
        /**
         * The user changed the search manually while the AI
         * request was still processing.
         *
         * Do not overwrite newer user state.
         */
        if (
          getSearchRevision &&
          getSearchRevision() !==
            searchRevision
        ) {
          appendAssistantMessage(
            "Pencarian sudah Anda ubah. Kirim ulang pertanyaan agar saya menggunakan kebutuhan terbaru.",
          );

          return;
        }

        /**
         * Preferred unified architecture.
         */
        if (onAction) {
          try {
            const result =
              await onAction(
                action,
              );

            if (
              result.message
            ) {
              appendAssistantMessage(
                result.message,
              );
            }

            if (
              result.status ===
                "REJECTED" &&
              !result.message
            ) {
              appendAssistantMessage(
                "Pencarian tersebut belum dapat dijalankan. Periksa kriterianya lalu coba lagi.",
              );
            }
          } catch {
            appendAssistantMessage(
              "Pencarian belum dapat dijalankan saat ini. Coba lagi.",
            );
          }

          return;
        }

        /**
         * Compatibility for the old search integration.
         */
        if (onSearchAction) {
          try {
            const legacyAction: AiSearchAction = {
              type:
                "APPLY_SEARCH_CRITERIA",
              criteria:
                action.criteria,
            };

            const resultMessage =
              await onSearchAction(
                legacyAction,
              );

            if (
              resultMessage
            ) {
              appendAssistantMessage(
                resultMessage,
              );
            }
          } catch {
            appendAssistantMessage(
              "Pencarian belum dapat dijalankan saat ini. Coba lagi.",
            );
          }

          return;
        }

        appendAssistantMessage(
          "Pencarian dari Tanya GETRA belum tersedia pada tampilan ini.",
        );
      },
      [
        appendAssistantMessage,
        getSearchRevision,
        onAction,
        onSearchAction,
      ],
    );

  /**
   * Execute route / mode / map actions.
   */
  const executeApplicationAction =
    useCallback(
      async (
        action: AiApplicationAction,
      ): Promise<void> => {
        if (!onAction) {
          appendAssistantMessage(
            "Tindakan tersebut belum dapat dijalankan pada tampilan ini.",
          );

          return;
        }

        const isRouteAction =
          action.type ===
            "CALCULATE_ROUTE" ||
          action.type ===
            "CHANGE_ROUTE_MODE";

        /**
         * Set pending route BEFORE awaiting onAction().
         *
         * This is important because the parent component may
         * update activeRoute immediately.
         */
        if (isRouteAction) {
          pendingRouteRef.current =
            {
              mode:
                action.mode,

              previousSignature:
                activeRoute
                  ? routeSignature(
                      activeRoute,
                    )
                  : null,
            };
        }

        try {
          const result =
            await onAction(
              action,
            );

          /**
           * Rejected route means there will be no route state
           * to wait for.
           */
          if (
            result.status ===
              "REJECTED" &&
            isRouteAction
          ) {
            pendingRouteRef.current =
              null;
          }

          if (
            result.message
          ) {
            appendAssistantMessage(
              result.message,
            );
          }

          if (
            result.status ===
              "REJECTED" &&
            !result.message
          ) {
            appendAssistantMessage(
              isRouteAction
                ? "Rute belum dapat dijalankan. Periksa titik awal dan tujuan lalu coba lagi."
                : "Tindakan tersebut belum dapat dijalankan. Coba lagi.",
            );
          }

          /**
           * For route actions:
           *
           * ROUTE_PENDING:
           * wait for activeRoute.
           *
           * COMPLETED:
           * also allow the activeRoute effect to observe the
           * actual route result if the parent updates route state.
           *
           * We therefore do NOT clear pendingRouteRef here.
           */
          if (
            !isRouteAction &&
            result.status ===
              "COMPLETED"
          ) {
            pendingRouteRef.current =
              null;
          }
        } catch {
          if (isRouteAction) {
            pendingRouteRef.current =
              null;
          }

          appendAssistantMessage(
            isRouteAction
              ? "Rute belum dapat dihitung saat ini. Periksa titik awal dan tujuan lalu coba lagi."
              : "Tindakan tersebut belum dapat dijalankan saat ini. Coba lagi.",
          );
        }
      },
      [
        activeRoute,
        appendAssistantMessage,
        onAction,
      ],
    );

  /**
   * Main Tanya GETRA flow:
   *
   * user text
   * ↓
   * askQuestion()
   * ↓
   * backend AI
   * ↓
   * validated response.action
   * ↓
   * GETRA application action
   * ↓
   * map/sidebar state
   */
  const submit =
    useCallback(
      async (
        text: string,
      ): Promise<void> => {
        const trimmed =
          text.trim();

        if (
          !trimmed ||
          state === "LOADING"
        ) {
          return;
        }

        const searchRevision =
          getSearchRevision?.();

        /**
         * Clear the input immediately after sending.
         */
        setQuestion("");

        try {
          const response =
            await askQuestion({
              question:
                trimmed,

              active_experience:
                activeExperience,

              context: {
                study_area_id:
                  studyAreaId,

                selected_entity_id:
                  selectedEntityId,

                selected_entity_name:
                  selectedEntityName,

                origin:
                  currentOrigin,

                destination:
                  currentDestination,

                active_route:
                  activeRoute,

                enable_search:
                  Boolean(
                    onAction ||
                      onSearchAction,
                  ),

                search_context:
                  searchContext,
              },
            });

          /**
           * Normal conversational response.
           */
          if (
            !response?.action
          ) {
            return;
          }

          const action =
            response.action;

          /**
           * Nothing needs to change in the application.
           */
          if (
            action.type ===
            "ANSWER_ONLY"
          ) {
            return;
          }

          /**
           * The assistant answer itself already contains
           * the clarification prompt.
           */
          if (
            action.type ===
            "REQUEST_CLARIFICATION"
          ) {
            return;
          }

          /**
           * Search.
           */
          if (
            action.type ===
            "APPLY_SEARCH_CRITERIA"
          ) {
            await executeSearchAction(
              action,
              searchRevision,
            );

            return;
          }

          /**
           * Routing, mode changes, place focus.
           */
          await executeApplicationAction(
            action,
          );
        } catch {
          appendAssistantMessage(
            "Tanya GETRA belum dapat menjalankan permintaan tersebut. Coba lagi.",
          );
        }
      },
      [
        activeExperience,
        activeRoute,
        appendAssistantMessage,
        askQuestion,
        currentDestination,
        currentOrigin,
        executeApplicationAction,
        executeSearchAction,
        getSearchRevision,
        onAction,
        onSearchAction,
        searchContext,
        selectedEntityId,
        selectedEntityName,
        state,
        studyAreaId,
      ],
    );

  /**
   * Contextual suggestions.
   */
  const suggestions =
    activeRoute
      ? [
          "Kalau naik motor?",
          "Apa yang ada di sekitar rute ini?",
          "Cari tempat lain di sekitar tujuan",
        ]
      : selectedEntityId
        ? [
            "Berikan rute ke tempat ini",
            "Yang paling dekat saja",
            "Tempat lain di sekitar sini",
          ]
        : searchContext
          ? [
              "Yang paling dekat saja",
              "Budget 20 ribu",
              "Tempat lain di sekitar sini",
            ]
          : [
              "Cari tempat makan di sekitar saya",
              "Apa yang menarik di area ini?",
              "Cari tempat sesuai kebutuhan saya",
            ];

  return (
    <section
      className="tanya-getra"
      aria-label="Tanya GETRA"
    >
      <header className="tanya-getra__header">
        <Sparkles
          size={25}
          aria-hidden="true"
        />

        <div>
          <h3>
            Tanya GETRA
          </h3>

          <p>
            Asisten Mobilitas Cerdas
          </p>
        </div>

        <div className="tanya-getra__actions">
          {onMinimize ? (
            <button
              type="button"
              aria-label="Minimalkan Tanya GETRA"
              onClick={
                onMinimize
              }
            >
              <Minus
                size={17}
              />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              aria-label="Tutup Tanya GETRA"
              onClick={
                onClose
              }
            >
              <X
                size={18}
              />
            </button>
          ) : null}
        </div>
      </header>

      <div
        className="tanya-getra__messages"
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {!messages.length ? (
          <div className="tanya-getra__welcome">
            <Sparkles
              size={24}
              aria-hidden="true"
            />

            <strong>
              Apa yang ingin Anda cari?
            </strong>

            <p>
              Ceritakan kebutuhan Anda. Saya dapat membantu mencari tempat, memahami area, dan menyiapkan rute.
            </p>
          </div>
        ) : null}

        {messages.map(
          (
            message,
            index,
          ) => (
            <div
              key={`${message.role}-${index}`}
              className="tanya-getra__message"
              data-role={
                message.role
              }
            >
              {message.role ===
              "assistant" ? (
                <span
                  className="tanya-getra__avatar"
                  aria-hidden="true"
                >
                  <Sparkles
                    size={16}
                  />
                </span>
              ) : null}

              <p>
                {
                  message.content
                }
              </p>
            </div>
          ),
        )}

        {state ===
        "LOADING" ? (
          <p
            className="tanya-getra__loading"
            role="status"
          >
            <LoaderCircle
              size={16}
              className="animate-spin"
            />

            Memproses kebutuhan Anda...
          </p>
        ) : null}

        {state ===
        "ERROR" ? (
          <div
            className="tanya-getra__error"
            role="alert"
          >
            <p>
              Tanya GETRA belum dapat memproses permintaan ini. Coba lagi.
            </p>

            <button
              type="button"
              onClick={() => {
                const last =
                  [
                    ...messages,
                  ]
                    .reverse()
                    .find(
                      (
                        message,
                      ) =>
                        message.role ===
                        "user",
                    );

                if (last) {
                  void submit(
                    last.content,
                  );
                }
              }}
            >
              Coba lagi
            </button>
          </div>
        ) : null}
      </div>

      <div className="tanya-getra__suggestions">
        {suggestions.map(
          (text) => (
            <button
              type="button"
              key={text}
              disabled={
                state ===
                "LOADING"
              }
              onClick={() => {
                void submit(
                  text,
                );
              }}
            >
              {text}
            </button>
          ),
        )}
      </div>

      <form
        className="tanya-getra__form"
        onSubmit={(
          event,
        ) => {
          event.preventDefault();

          void submit(
            question,
          );
        }}
      >
        <input
          ref={inputRef}
          aria-label="Pertanyaan untuk Tanya GETRA"
          maxLength={1000}
          value={question}
          onChange={(
            event,
          ) => {
            setQuestion(
              event.target.value,
            );
          }}
          placeholder="Tanyakan rute atau tempat..."
          disabled={
            state ===
            "LOADING"
          }
        />

        <button
          type="submit"
          aria-label="Kirim pertanyaan"
          disabled={
            !question.trim() ||
            state ===
              "LOADING"
          }
        >
          <SendHorizontal
            size={18}
          />
        </button>
      </form>

      <footer>
        {messages.length ? (
          <button
            type="button"
            disabled={
              state ===
              "LOADING"
            }
            onClick={() => {
              clearChat();

              pendingRouteRef.current =
                null;

              inputRef.current?.focus();
            }}
          >
            <Eraser
              size={12}
            />

            Bersihkan percakapan
          </button>
        ) : (
          <span>
            Jawaban berdasarkan data GETRA yang tersedia.
          </span>
        )}
      </footer>
    </section>
  );
}

/**
 * Human-readable route mode.
 */
function routeModeLabel(
  mode: AiRouteMode,
): string {
  if (
    mode === "walking"
  ) {
    return "Jalan kaki";
  }

  if (
    mode === "motorcycle"
  ) {
    return "Motor";
  }

  return "Mobil";
}

/**
 * Display actual GETRA route distance.
 */
function formatDistance(
  distanceMeters: number,
): string {
  if (
    distanceMeters < 1000
  ) {
    return `${Math.round(
      distanceMeters,
    )} m`;
  }

  return `${(
    distanceMeters /
    1000
  ).toLocaleString(
    "id-ID",
    {
      maximumFractionDigits: 1,
    },
  )} km`;
}

/**
 * Detect whether GETRA has produced a new route result.
 */
function routeSignature(
  route: NonNullable<
    AiPanelProps["activeRoute"]
  >,
): string {
  return [
    route.mode,
    route.distance_meters,
    route.duration_seconds,
  ].join(":");
}
