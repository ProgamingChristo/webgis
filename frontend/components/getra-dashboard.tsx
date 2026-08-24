"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  Coffee,
  Database,
  Layers3,
  LocateFixed,
  LogOut,
  MapPinned,
  Megaphone,
  Phone,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { StakeholderModeSwitcher } from "@/src/components/stakeholder/stakeholder-mode-switcher";
import { StakeholderContextShell } from "@/src/components/stakeholder/stakeholder-context-shell";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { AccountMenu } from "@/src/components/profile/account-menu";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { AiPanel } from "@/components/ai/ai-panel";
import { CommunityNotificationsMenu } from "@/src/features/community/components/notifications/community-notifications-menu";

import { GetraMap } from "@/components/getra-map";
import { useFairDiscovery, FairDiscoveryResults } from "@/src/features/fair-discovery";
import { useProfilePoster, ProfilePoster } from "@/src/features/umkm-advertising";
import { useRouting } from "@/src/hooks/use-routing";
import {
  mapidLayerService,
} from "@/src/services/mapid-layer.service";
import {
  adminMapImportService,
  type AdminImportedLayer,
} from "@/src/services/admin-map-import.service";
import {
  COFFEE_SHOP_ORIGIN,
  COFFEE_SHOP_SOURCE_NAME,
  COFFEE_SHOPS,
} from "@/data/coffee-shops-jakarta-barat";
import { authenticatedFetch, clearAuthSession } from "@/src/lib/auth-client";
import type { Merchant, UserLocation } from "@/types/getra";

type LocatedMerchant =
  Merchant & {
    userDistanceMeters?: number;
    userWalkingMinutes?: number;
  };

type DatasetId =
  | "all-areas"
  | "admin-import"
  | "coffee-jakarta-barat"
  | "mapid-food-jakarta-pusat";

type RouteSearchTarget =
  | "origin"
  | "destination";

const ROUTE_ORIGIN_USER =
  "USER_LOCATION";

const ROUTE_ORIGIN_CENTER =
  "DATASET_CENTER";

const MAX_ROUTE_SEARCH_RESULTS =
  6;

function distanceMeters(
  a: {
    latitude: number;
    longitude: number;
  },
  b: {
    latitude: number;
    longitude: number;
  },
) {
  const earthRadiusMeters =
    6371008.8;

  const toRad =
    (value: number) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRad(
      b.latitude -
        a.latitude,
    );

  const dLng =
    toRad(
      b.longitude -
        a.longitude,
    );

  const lat1 =
    toRad(
      a.latitude,
    );

  const lat2 =
    toRad(
      b.latitude,
    );

  const h =
    Math.sin(
      dLat / 2,
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2,
      ) ** 2;

  return Math.round(
    earthRadiusMeters *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(
          1 - h,
        ),
      ),
  );
}

function formatDistance(
  meters: number,
) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${meters} m`;
}

function getMerchantAreaLine(
  merchant: Merchant,
) {
  return [
    merchant.address,
    merchant.village,
    merchant.district,
    merchant.city,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getMerchantSearchText(
  merchant: Merchant,
) {
  return [
    merchant.name,
    merchant.brand,
    merchant.category,
    merchant.address,
    merchant.village,
    merchant.district,
    merchant.city,
    merchant.province,
    merchant.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findRouteSearchResults(
  merchants: Merchant[],
  search: string,
) {
  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  if (
    normalizedSearch.length === 0
  ) {
    return [];
  }

  const source =
    merchants.filter(
      (merchant) =>
        getMerchantSearchText(
          merchant,
        ).includes(
          normalizedSearch,
        ),
    );

  return source.slice(
    0,
    MAX_ROUTE_SEARCH_RESULTS,
  );
}

function calculateMerchantBounds(
  merchants: Merchant[],
) {
  if (merchants.length === 0) {
    return {
      west:
        COFFEE_SHOP_ORIGIN.longitude - 0.03,
      south:
        COFFEE_SHOP_ORIGIN.latitude - 0.03,
      east:
        COFFEE_SHOP_ORIGIN.longitude + 0.03,
      north:
        COFFEE_SHOP_ORIGIN.latitude + 0.03,
    };
  }

  return merchants.reduce(
    (
      bounds,
      merchant,
    ) => ({
      west:
        Math.min(
          bounds.west,
          merchant.longitude,
        ),
      south:
        Math.min(
          bounds.south,
          merchant.latitude,
        ),
      east:
        Math.max(
          bounds.east,
          merchant.longitude,
        ),
      north:
        Math.max(
          bounds.north,
          merchant.latitude,
        ),
    }),
    {
      west:
        merchants[0]?.longitude ??
        COFFEE_SHOP_ORIGIN.longitude,
      south:
        merchants[0]?.latitude ??
        COFFEE_SHOP_ORIGIN.latitude,
      east:
        merchants[0]?.longitude ??
        COFFEE_SHOP_ORIGIN.longitude,
      north:
        merchants[0]?.latitude ??
        COFFEE_SHOP_ORIGIN.latitude,
    },
  );
}

function calculateMerchantOrigin(
  merchants: Merchant[],
  fallback: {
    name: string;
    longitude: number;
    latitude: number;
  } = COFFEE_SHOP_ORIGIN,
) {
  const bounds =
    calculateMerchantBounds(
      merchants,
    );

  return {
    id:
      "active-dataset-center",
    name:
      fallback.name,
    longitude:
      (bounds.west + bounds.east) /
      2,
    latitude:
      (bounds.south + bounds.north) /
      2,
  };
}

export function GetraDashboard() {
  const router =
    useRouter();

  const {
    context: authContext,
  } = useAuth();

  const { activeExperience } = useStakeholder();

  const isAdmin =
    authContext?.profile
      ?.account_role ===
    "ADMIN";

  const isUmkm =
    authContext?.stakeholder_modes?.includes("UMKM") ||
    activeExperience === "UMKM";

  const [
    datasetId,
    setDatasetId,
  ] =
    useState<DatasetId>(
      "all-areas",
    );

  const [
    mapidMerchants,
    setMapidMerchants,
  ] =
    useState<Merchant[]>(
      [],
    );

  const [
    mapidLayerName,
    setMapidLayerName,
  ] =
    useState(
      "Makanan dan Minuman Jakarta Pusat",
    );

  const [
    mapidLoading,
    setMapidLoading,
  ] =
    useState(false);

  const [
    mapidError,
    setMapidError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    adminImportedLayer,
    setAdminImportedLayer,
  ] =
    useState<AdminImportedLayer | null>(
      null,
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    brand,
    setBrand,
  ] =
    useState<string>(
      "Semua",
    );

  const [
    openOnly,
    setOpenOnly,
  ] =
    useState(true);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    locating,
    setLocating,
  ] =
    useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    userLocation,
    setUserLocation,
  ] =
    useState<UserLocation | null>(
      null,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    routeOriginValue,
    setRouteOriginValue,
  ] =
    useState<string>(
      ROUTE_ORIGIN_CENTER,
    );

  const [
    routeDestinationId,
    setRouteDestinationId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    originSearch,
    setOriginSearch,
  ] =
    useState("");

  const [
    destinationSearch,
    setDestinationSearch,
  ] =
    useState("");

  const [
    pendingRouteChoice,
    setPendingRouteChoice,
  ] =
    useState<{
      target: RouteSearchTarget;
      merchant: Merchant;
    } | null>(null);

  const {
    state: routingState,
    route,
    error: routingError,
    requestRoute,
    clearRoute,
  } = useRouting();

  const allMerchants =
    useMemo(
      () => [
        ...(adminImportedLayer?.merchants ??
          []),
        ...mapidMerchants,
        ...COFFEE_SHOPS,
      ],
      [
        adminImportedLayer,
        mapidMerchants,
      ],
    );

  const baseMerchants =
    useMemo(
      () =>
        datasetId ===
        "all-areas"
          ? allMerchants
          : datasetId ===
              "admin-import"
            ? adminImportedLayer
                ?.merchants ?? []
            : datasetId ===
                "mapid-food-jakarta-pusat"
              ? mapidMerchants
              : COFFEE_SHOPS,
      [
        adminImportedLayer,
        allMerchants,
        datasetId,
        mapidMerchants,
      ],
    );

  const datasetTitle =
    datasetId ===
      "all-areas"
      ? "Semua data lokasi GETRA"
      : datasetId ===
          "admin-import"
        ? adminImportedLayer
            ?.layer_name ??
          "Data import database"
        : datasetId ===
          "mapid-food-jakarta-pusat"
        ? "Makanan-minuman Jakarta Pusat"
        : "Coffee shop Jakarta Barat";

  const datasetSourceName =
    datasetId ===
      "all-areas"
      ? [
          adminImportedLayer
            ? adminImportedLayer.layer_name
            : null,
          mapidLayerName,
          COFFEE_SHOP_SOURCE_NAME,
        ]
          .filter(Boolean)
          .join(" + ")
      : datasetId ===
          "admin-import"
        ? adminImportedLayer
            ?.limitation ??
          "Data import database"
        : datasetId ===
          "mapid-food-jakarta-pusat"
        ? mapidLayerName
        : COFFEE_SHOP_SOURCE_NAME;

  const datasetOrigin =
    useMemo(
      () =>
        datasetId ===
        "all-areas"
          ? {
              ...calculateMerchantOrigin(
                allMerchants,
                {
                  ...COFFEE_SHOP_ORIGIN,
                  name:
                    "Pusat sebaran semua data GETRA",
                },
              ),
              name:
                "Pusat sebaran semua data GETRA",
            }
          : datasetId ===
              "admin-import"
            ? {
                ...calculateMerchantOrigin(
                  adminImportedLayer
                    ?.merchants ?? [],
                  {
                    ...COFFEE_SHOP_ORIGIN,
                    name:
                      "Pusat sebaran admin import",
                  },
                ),
                name:
                  "Pusat sebaran admin import",
              }
            : datasetId ===
              "mapid-food-jakarta-pusat"
            ? {
                ...calculateMerchantOrigin(
                  mapidMerchants,
                  {
                    ...COFFEE_SHOP_ORIGIN,
                    name:
                      "Pusat sebaran makanan-minuman Jakarta Pusat",
                  },
                ),
                name:
                  "Pusat sebaran makanan-minuman Jakarta Pusat",
              }
            : COFFEE_SHOP_ORIGIN,
      [
        adminImportedLayer,
        allMerchants,
        datasetId,
        mapidMerchants,
      ],
    );

  const [viewMode, setViewMode] = useState<"fair-discovery" | "dataset">("fair-discovery");

  const discoveryQuery = useMemo(() => {
    const origin = userLocation
      ? { longitude: userLocation.longitude, latitude: userLocation.latitude }
      : { longitude: datasetOrigin.longitude, latitude: datasetOrigin.latitude };

    return {
      origin,
      radiusMeters: 3000,
      category: brand !== "Semua" ? brand : undefined,
      query: query || undefined,
      openNow: openOnly,
    };
  }, [userLocation, datasetOrigin, brand, query, openOnly]);

  const {
    result: fairDiscoveryResult,
    isLoading: fairDiscoveryLoading,
    error: fairDiscoveryError,
  } = useFairDiscovery({
    query: discoveryQuery,
    enabled: true,
  });

  const datasetBounds =
    useMemo(
      () =>
        calculateMerchantBounds(
          baseMerchants,
        ),
      [
        baseMerchants,
      ],
    );

  const brandOptions =
    useMemo(
      () => [
        "Semua",
        ...Array.from(
          new Set(
            baseMerchants.map(
              (merchant) =>
                merchant.brand,
            ),
          ),
        ).sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              "id",
            ),
        ),
      ],
      [
        baseMerchants,
      ],
    );

  const merchants =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      const filtered =
        baseMerchants
        .filter((merchant) => {
          if (
            brand !==
              "Semua" &&
            merchant.brand !==
              brand
          ) {
            return false;
          }

          if (
            openOnly &&
            !merchant.openNow
          ) {
            return false;
          }

          if (
            normalizedQuery &&
            !`${merchant.name} ${merchant.brand} ${merchant.address ?? ""} ${merchant.district ?? ""} ${merchant.village ?? ""}`
              .toLowerCase()
              .includes(
                normalizedQuery,
              )
          ) {
            return false;
          }

          return true;
        });

      const withDistance: LocatedMerchant[] =
        userLocation
          ? filtered.map(
              (
                merchant,
              ) => {
                const userDistanceMeters =
                  distanceMeters(
                    userLocation,
                    merchant,
                  );

                return {
                  ...merchant,
                  userDistanceMeters,
                  userWalkingMinutes:
                    Math.max(
                      1,
                      Math.round(
                        userDistanceMeters /
                          80,
                      ),
                    ),
                };
              },
            )
          : filtered;

      return withDistance.sort(
        (
          a,
          b,
        ) => {
          if (
            userLocation &&
            a.userDistanceMeters !==
              undefined &&
            b.userDistanceMeters !==
              undefined &&
            a.userDistanceMeters !==
              b.userDistanceMeters
          ) {
            return (
              a.userDistanceMeters -
              b.userDistanceMeters
            );
          }

          return (
            a.name.localeCompare(
              b.name,
              "id",
            ) ||
            a.longitude -
              b.longitude ||
            a.latitude -
              b.latitude
          );
        },
      );
    }, [
      brand,
      baseMerchants,
      openOnly,
      query,
      userLocation,
    ]);

  const selectedMerchant =
    merchants.find(
      (merchant) =>
        merchant.id ===
        selectedId,
    ) ?? null;

  const { poster: profilePoster } = useProfilePoster({
    merchantId: selectedMerchant?.id ?? null,
  });

  const originSearchResults =
    useMemo(
      () =>
        findRouteSearchResults(
          merchants,
          originSearch,
        ),
      [
        merchants,
        originSearch,
      ],
    );

  const destinationSearchResults =
    useMemo(
      () =>
        findRouteSearchResults(
          merchants,
          destinationSearch,
        ),
      [
        merchants,
        destinationSearch,
      ],
    );

  const routeDestination =
    merchants.find(
      (merchant) =>
        merchant.id ===
        routeDestinationId,
    ) ??
    selectedMerchant ??
    merchants[0] ??
    null;

  const routeOriginMerchant =
    routeOriginValue.startsWith(
      "MERCHANT:",
    )
      ? merchants.find(
          (merchant) =>
            merchant.id ===
            routeOriginValue.replace(
              "MERCHANT:",
              "",
            ),
        ) ?? null
      : null;

  const routeOrigin =
    routeOriginValue ===
      ROUTE_ORIGIN_USER &&
    userLocation
      ? {
          label:
            "Lokasi saya",
          coordinate: {
            latitude:
              userLocation.latitude,
            longitude:
              userLocation.longitude,
          },
        }
      : routeOriginMerchant
        ? {
            label:
              routeOriginMerchant.name,
            coordinate: {
              latitude:
                routeOriginMerchant.latitude,
              longitude:
                routeOriginMerchant.longitude,
            },
          }
        : {
            label:
              datasetOrigin.name,
            coordinate: {
              latitude:
                datasetOrigin.latitude,
              longitude:
                datasetOrigin.longitude,
            },
          };

  const routeIsFallback =
    route?.route_source ===
      "fallback_direct_line" ||
    route?.limitation_flags.includes(
      "ESTIMATED_DIRECT_LINE",
    );

  const routeUsesRoadNetwork =
    route?.route_source ===
      "osrm_road_network" ||
    route?.limitation_flags.includes(
      "ROAD_NETWORK_ROUTE",
    );

  const routeDurationMinutes =
    route
      ? Math.max(
          1,
          Math.ceil(
            route.duration_seconds /
              60,
          ),
        )
      : null;

  const routeOriginPoint = {
    label:
      routeOrigin.label,
    latitude:
      routeOrigin.coordinate.latitude,
    longitude:
      routeOrigin.coordinate.longitude,
  };

  const routeDestinationPoint =
    routeDestination &&
    (
      routeDestinationId ||
      selectedMerchant ||
      route
    )
      ? {
          label:
            routeDestination.name,
          latitude:
            routeDestination.latitude,
          longitude:
            routeDestination.longitude,
        }
      : null;

  const handleSelect =
    useCallback(
      (
        merchant: Merchant,
      ) => {
        setSelectedId(
          merchant.id,
        );
        setRouteDestinationId(
          merchant.id,
        );
        setDestinationSearch(
          merchant.name,
        );
        clearRoute();
      },
      [clearRoute],
    );

  const handleClearSelection =
    useCallback(() => {
      setSelectedId(
        null,
      );
    }, []);

  const loadMapidFoodLayer =
    useCallback(async () => {
      if (
        mapidMerchants.length > 0 ||
        mapidLoading
      ) {
        return;
      }

      setMapidLoading(
        true,
      );
      setMapidError(
        null,
      );

      try {
        const layer =
          await mapidLayerService.getFoodBeverageLayer();

        setMapidMerchants(
          layer.merchants,
        );
        setMapidLayerName(
          layer.layer_name,
        );
      } catch {
        setMapidError(
          "Layer MAPID belum bisa dimuat. Coba ulangi beberapa saat lagi.",
        );
      } finally {
        setMapidLoading(
          false,
        );
      }
    }, [
      mapidLoading,
      mapidMerchants.length,
    ]);

  useEffect(() => {
    let active = true;

    void adminMapImportService
      .list()
      .then((result) => {
        if (!active) {
          return;
        }

        const merchants =
          result.layers.flatMap(
            (layer) =>
              layer.merchants,
          );

        const boundaries =
          result.layers.flatMap(
            (layer) =>
              layer.boundaries
                ?.features ?? [],
          );

        setAdminImportedLayer(
          result.total_features > 0
            ? {
                layer_id:
                  "persisted-admin-imports",
                layer_name:
                  `${result.total_layers} layer import database`,
                source_type:
                  "JSON_PAYLOAD",
                total_features:
                  result.total_features,
                merchants,
                persisted:
                  true,
                limitation:
                  "Data import tersimpan di database sebagai SURVEYED.",
                boundaries: {
                  type:
                    "FeatureCollection",
                  features:
                    boundaries,
                },
              }
            : null,
        );
      })
      .catch(() => {
        if (active) {
          setAdminImportedLayer(
            null,
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let requestId: number | null =
      null;

    if (
      datasetId ===
        "all-areas" ||
      datasetId ===
      "mapid-food-jakarta-pusat"
    ) {
      requestId =
        window.setTimeout(
          () => {
            void loadMapidFoodLayer();
          },
          0,
        );
    }

    return () => {
      if (requestId !== null) {
        window.clearTimeout(
          requestId,
        );
      }
    };
  }, [
    datasetId,
    loadMapidFoodLayer,
  ]);

  const handleDatasetChange =
    useCallback(
      (
        nextDatasetId: DatasetId,
      ) => {
        setDatasetId(
          nextDatasetId,
        );
        setBrand(
          "Semua",
        );
        setQuery(
          "",
        );
        setSelectedId(
          null,
        );
        setRouteDestinationId(
          null,
        );
        setOriginSearch(
          "",
        );
        setDestinationSearch(
          "",
        );
        setPendingRouteChoice(
          null,
        );
        setRouteOriginValue(
          ROUTE_ORIGIN_CENTER,
        );
        clearRoute();

        if (
          nextDatasetId ===
            "all-areas" ||
          nextDatasetId ===
          "mapid-food-jakarta-pusat"
        ) {
          void loadMapidFoodLayer();
        }
      },
      [
        clearRoute,
        loadMapidFoodLayer,
      ],
    );

  const handleBuildRoute =
    useCallback(() => {
      if (!routeDestination) {
        return;
      }

      requestRoute(
        routeOrigin.coordinate,
        {
          latitude:
            routeDestination.latitude,
          longitude:
            routeDestination.longitude,
        },
      );
    }, [
      requestRoute,
      routeDestination,
      routeOrigin.coordinate,
    ]);

  const handleRouteChoice =
    useCallback(
      (
        target: RouteSearchTarget,
        merchant: Merchant,
      ) => {
        setPendingRouteChoice({
          target,
          merchant,
        });
      },
      [],
    );

  const handleConfirmRouteChoice =
    useCallback(() => {
      if (!pendingRouteChoice) {
        return;
      }

      const { target, merchant } =
        pendingRouteChoice;

      if (target === "origin") {
        setRouteOriginValue(
          `MERCHANT:${merchant.id}`,
        );
        setOriginSearch(
          merchant.name,
        );
      } else {
        setRouteDestinationId(
          merchant.id,
        );
        setSelectedId(
          merchant.id,
        );
        setDestinationSearch(
          merchant.name,
        );
      }

      clearRoute();
      setPendingRouteChoice(
        null,
      );
    }, [
      clearRoute,
      pendingRouteChoice,
    ]);

  const handleLocateUser =
    useCallback(() => {
      setLocationError(
        null,
      );

      if (
        !("geolocation" in navigator)
      ) {
        setLocationError(
          "Perangkat atau browser belum mendukung GPS/location.",
        );
        return;
      }

      setLocating(
        true,
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracyMeters:
              Math.round(
                position.coords.accuracy,
              ),
            capturedAt:
              new Date().toISOString(),
          });

          setRouteOriginValue(
            ROUTE_ORIGIN_USER,
          );
          setOriginSearch(
            "",
          );
          clearRoute();

          setLocating(
            false,
          );
        },
        (error) => {
          const message =
            error.code ===
            error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan permission location di browser untuk memakai GPS."
              : error.code ===
                  error.POSITION_UNAVAILABLE
                ? "Lokasi perangkat belum tersedia. Coba nyalakan GPS/Wi-Fi location lalu ulangi."
                : "Pengambilan lokasi terlalu lama. Coba ulangi dari perangkat.";

          setLocationError(
            message,
          );
          setLocating(
            false,
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    }, [clearRoute]);

  const handleUseUserLocationAsOrigin =
    useCallback(() => {
      if (!userLocation) {
        handleLocateUser();
        return;
      }

      setRouteOriginValue(
        ROUTE_ORIGIN_USER,
      );
      setOriginSearch(
        "",
      );
      clearRoute();
    }, [
      clearRoute,
      handleLocateUser,
      userLocation,
    ]);

  const handleUseDatasetCenterAsOrigin =
    useCallback(() => {
      setRouteOriginValue(
        ROUTE_ORIGIN_CENTER,
      );
      setOriginSearch(
        "",
      );
      clearRoute();
    }, [clearRoute]);

  useEffect(() => {
    const requestId =
      window.setTimeout(
        handleLocateUser,
        0,
      );

    return () => {
      window.clearTimeout(
        requestId,
      );
    };
  }, [handleLocateUser]);

  const handleLogout =
    useCallback(async () => {
      if (loggingOut) return;

      setLoggingOut(
        true,
      );

      try {
        try {
          await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
            {
              method:
                "POST",
            },
          );
        } catch {
          // Browser logout must still clear its local session if the API is down.
        }

        await clearAuthSession();
        router.replace(
          "/login",
        );
        router.refresh();
      } catch {
        setLoggingOut(
          false,
        );
      }
    }, [
      loggingOut,
      router,
    ]);

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            G
          </div>
          <div>
            <strong>
              GETRA
            </strong>
            <span>
              Geo-Enabled Transit & Retail Analytics
            </span>
          </div>
        </div>

        <StakeholderModeSwitcher />

        <div className="topbar-actions">
          {isAdmin ? (
            <button
              className="admin-nav-button"
              type="button"
              onClick={() =>
                router.push(
                  "/admin/import",
                )
              }
            >
              <Database size={15} />
              Import data
            </button>
          ) : null}

          {isUmkm ? (
            <button
              className="umkm-ads-nav-button"
              type="button"
              onClick={() =>
                router.push(
                  "/umkm/advertising",
                )
              }
              title="Buka Dasbor Iklan & Promosi UMKM"
            >
              <Megaphone size={15} />
              Advertising UMKM
            </button>
          ) : null}

          <div className="pilot-badge">
            <ShieldCheck size={15} />
            {datasetId ===
            "all-areas"
              ? "All data"
              : datasetId ===
                  "admin-import"
                ? "Admin import"
                : datasetId ===
                  "mapid-food-jakarta-pusat"
                ? "MAPID 2025"
                : "GeoJSON Q2 2026"}
          </div>

          <AccountMenu
            context={authContext}
          />

          <CommunityNotificationsMenu />

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={15} />
            {loggingOut
              ? "Keluar..."
              : "Keluar"}
          </button>
        </div>
      </header>

      <StakeholderContextShell>
        <section className="workspace-grid">
          <aside className="left-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {datasetId ===
                "all-areas"
                  ? "GETRA search"
                  : datasetId ===
                      "admin-import"
                    ? "Admin import search"
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "MAPID search"
                    : "GeoJSON search"}
              </span>
              <h1>
                {datasetTitle}
              </h1>
            </div>
            <Search size={20} />
          </div>

          <div className="origin-box">
            <MapPinned size={17} />
            <div>
              <span>
                Lokasi pengguna
              </span>
              <strong>
                {userLocation
                  ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                  : datasetOrigin.name}
              </strong>
              {userLocation ? (
                <small>
                  Akurasi GPS sekitar {userLocation.accuracyMeters} m
                </small>
              ) : null}
            </div>
          </div>

          <button
            className="locate-button"
            type="button"
            onClick={handleLocateUser}
            disabled={locating}
          >
            <LocateFixed size={16} />
            {locating
              ? "Mengambil lokasi..."
              : userLocation
                ? "Perbarui lokasi saya"
                : "Gunakan lokasi saya"}
          </button>

          {locationError ? (
            <p className="location-error">
              {locationError}
            </p>
          ) : null}

          <section className="dataset-switcher">
            <div>
              <span className="eyebrow">
                Data map
              </span>
              <strong>
                Filter cakupan data
              </strong>
            </div>
            <div className="dataset-switcher__buttons">
              <button
                type="button"
                className={
                  datasetId ===
                  "all-areas"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "all-areas",
                  )
                }
              >
                Semua data
              </button>
              {adminImportedLayer ? (
                <button
                  type="button"
                  className={
                    datasetId ===
                    "admin-import"
                      ? "dataset-button dataset-button--active"
                      : "dataset-button"
                  }
                  onClick={() =>
                    handleDatasetChange(
                      "admin-import",
                    )
                  }
                >
                  Data import
                </button>
              ) : null}
              <button
                type="button"
                className={
                  datasetId ===
                  "coffee-jakarta-barat"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "coffee-jakarta-barat",
                  )
                }
              >
                Jakarta Barat
              </button>
              <button
                type="button"
                className={
                  datasetId ===
                  "mapid-food-jakarta-pusat"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "mapid-food-jakarta-pusat",
                  )
                }
              >
                Jakarta Pusat
              </button>
            </div>
            <small>
              {datasetSourceName}
            </small>
            {mapidLoading &&
            (datasetId ===
              "all-areas" ||
              datasetId ===
                "mapid-food-jakarta-pusat") ? (
              <p className="dataset-message">
                Mengambil layer MAPID...
              </p>
            ) : null}
            {mapidError &&
            (datasetId ===
              "all-areas" ||
              datasetId ===
                "mapid-food-jakarta-pusat") ? (
              <p className="dataset-message dataset-message--error">
                {mapidError}
              </p>
            ) : null}
          </section>

          <section className="route-planner">
            <div className="route-planner__header">
              <div>
                <span className="eyebrow">
                  Rute commuter
                </span>
                <strong>
                  Mulai dari mana?
                </strong>
              </div>
              <Route size={18} />
            </div>

            <div className="route-field">
              <span>
                Titik mulai
              </span>
              <div className="route-quick-actions">
                <button
                  className={
                    routeOriginValue ===
                    ROUTE_ORIGIN_USER
                      ? "route-chip-button route-chip-button--active"
                      : "route-chip-button"
                  }
                  type="button"
                  onClick={handleUseUserLocationAsOrigin}
                >
                  {userLocation
                    ? "Lokasi saya"
                    : locating
                      ? "Mengambil GPS..."
                      : "Aktifkan GPS"}
                </button>
                <button
                  className={
                    routeOriginValue ===
                    ROUTE_ORIGIN_CENTER
                      ? "route-chip-button route-chip-button--active"
                      : "route-chip-button"
                  }
                  type="button"
                  onClick={handleUseDatasetCenterAsOrigin}
                >
                  Pusat data
                </button>
              </div>
              <div className="route-search-box">
                <Search size={15} />
                <input
                  aria-label="Cari titik mulai"
                  placeholder="Cari titik mulai dari data..."
                  type="search"
                  value={originSearch}
                  onChange={(event) =>
                    setOriginSearch(
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="route-search-results">
                {originSearchResults.length >
                0 ? (
                  originSearchResults.map(
                    (merchant) => (
                      <button
                        className={
                          routeOriginValue ===
                          `MERCHANT:${merchant.id}`
                            ? "route-search-result route-search-result--active"
                            : "route-search-result"
                        }
                        key={`origin-search-${merchant.id}`}
                        type="button"
                        onClick={() =>
                          handleRouteChoice(
                            "origin",
                            merchant,
                          )
                        }
                      >
                        <strong>
                          {merchant.name}
                        </strong>
                        <span>
                          {merchant.brand} ·{" "}
                          {merchant.district ??
                            merchant.city ??
                            "Lokasi tersedia"}
                        </span>
                      </button>
                    ),
                  )
                ) : originSearch.trim() ? (
                  <p className="route-search-empty">
                    Titik mulai tidak ditemukan.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="route-field">
              <span>
                Tujuan tersedia
              </span>
              <div className="route-search-box route-search-box--destination">
                <Search size={15} />
                <input
                  aria-label="Cari tujuan"
                  placeholder="Cari nama, brand, alamat, kecamatan..."
                  type="search"
                  value={destinationSearch}
                  onChange={(event) =>
                    setDestinationSearch(
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="route-search-results">
                {destinationSearchResults.length >
                0 ? (
                  destinationSearchResults.map(
                    (merchant) => (
                      <button
                        className={
                          routeDestination?.id ===
                          merchant.id
                            ? "route-search-result route-search-result--active"
                            : "route-search-result"
                        }
                        key={`destination-search-${merchant.id}`}
                        type="button"
                        onClick={() =>
                          handleRouteChoice(
                            "destination",
                            merchant,
                          )
                        }
                      >
                        <strong>
                          {merchant.name}
                        </strong>
                        <span>
                          {getMerchantAreaLine(
                            merchant,
                          ) ||
                            `${merchant.latitude.toFixed(5)}, ${merchant.longitude.toFixed(5)}`}
                        </span>
                      </button>
                    ),
                  )
                ) : destinationSearch.trim() ? (
                  <p className="route-search-empty">
                    Tujuan tidak ditemukan.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="route-summary-card">
              <span>
                {routeOrigin.label}
              </span>
              <strong aria-hidden="true">
                {"->"}
              </strong>
              <span>
                {routeDestination?.name ??
                  "Pilih tujuan"}
              </span>
            </div>

            <div className="route-actions">
              <button
                className="route-primary-button"
                type="button"
                disabled={
                  !routeDestination ||
                  routingState ===
                    "LOADING"
                }
                onClick={handleBuildRoute}
              >
                {routingState ===
                "LOADING"
                  ? "Menghitung rute..."
                  : "Buat rute"}
              </button>
              <button
                className="route-secondary-button"
                type="button"
                onClick={clearRoute}
                disabled={!route}
              >
                Reset
              </button>
            </div>

            {route ? (
              <div
                className={
                  routeIsFallback
                    ? "route-result route-result--warning"
                    : "route-result"
                }
              >
                <strong>
                  {formatDistance(
                    route.distance_meters,
                  )}
                  {" | "}
                  {routeDurationMinutes} menit
                </strong>
                <span>
                  {routeIsFallback
                    ? "Estimasi garis langsung karena network pedestrian belum tersedia."
                    : routeUsesRoadNetwork
                      ? "Jalur mengikuti jaringan jalan seperti peta navigasi. Waktu berjalan masih estimasi GETRA."
                      : "Rute berjalan kaki berhasil dihitung dari backend GETRA."}
                </span>
              </div>
            ) : null}

            {routingError ? (
              <p className="route-message">
                {routingError}
              </p>
            ) : null}
          </section>

          {pendingRouteChoice ? (
            <div
              className="route-choice-backdrop"
              role="presentation"
            >
              <div
                aria-modal="true"
                className="route-choice-modal"
                role="dialog"
              >
                <span className="eyebrow">
                  {pendingRouteChoice.target ===
                  "origin"
                    ? "Konfirmasi titik mulai"
                    : "Konfirmasi tujuan"}
                </span>
                <h3>
                  {pendingRouteChoice.target ===
                  "origin"
                    ? "Gunakan lokasi ini sebagai titik mulai?"
                    : "Mau ke tempat ini?"}
                </h3>
                <strong>
                  {
                    pendingRouteChoice
                      .merchant.name
                  }
                </strong>
                <p>
                  {
                    pendingRouteChoice
                      .merchant.brand
                  }{" "}
                  ·{" "}
                  {
                    pendingRouteChoice
                      .merchant.category
                  }
                </p>
                <dl className="route-choice-details">
                  <div>
                    <dt>
                      Area
                    </dt>
                    <dd>
                      {getMerchantAreaLine(
                        pendingRouteChoice.merchant,
                      ) ||
                        "Detail area belum tersedia"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Koordinat
                    </dt>
                    <dd>
                      {pendingRouteChoice.merchant.latitude.toFixed(
                        6,
                      )}
                      ,{" "}
                      {pendingRouteChoice.merchant.longitude.toFixed(
                        6,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Status
                    </dt>
                    <dd>
                      {pendingRouteChoice.merchant.openNow
                        ? "BUKA"
                        : "TUTUP / belum diketahui"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Sumber
                    </dt>
                    <dd>
                      {
                        pendingRouteChoice
                          .merchant.source
                      }
                    </dd>
                  </div>
                </dl>
                <div className="route-choice-actions">
                  <button
                    className="route-secondary-button"
                    type="button"
                    onClick={() =>
                      setPendingRouteChoice(
                        null,
                      )
                    }
                  >
                    Batal
                  </button>
                  <button
                    className="route-primary-button"
                    type="button"
                    onClick={handleConfirmRouteChoice}
                  >
                    {pendingRouteChoice.target ===
                    "origin"
                      ? "Pakai sebagai start"
                      : "Ya, jadikan tujuan"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <label
            className="field-label"
            htmlFor="search-query"
          >
            Pencarian
          </label>
          <div className="search-box">
            <Search size={17} />
            <input
              id="search-query"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder={
                datasetId ===
                "all-areas"
                  ? "contoh: FOUR LEAVES atau Starbucks Puri"
                  : datasetId ===
                      "admin-import"
                    ? "contoh: nama titik dari import admin"
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "contoh: Holland Bakery"
                    : "contoh: Starbucks Puri"
              }
            />
          </div>

          <div className="filter-grid filter-grid--single">
            <label>
              <span>
                Brand
              </span>
              <select
                value={brand}
                onChange={(event) =>
                  setBrand(
                    event.target
                      .value,
                  )
                }
              >
                {brandOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) =>
                setOpenOnly(
                  event.target
                    .checked,
                )
              }
            />
            <span>
              Hanya status BUKA
            </span>
          </label>

          <div className="section-divider" />

          {/* View Mode Switcher */}
          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("fair-discovery")}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                viewMode === "fair-discovery"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ✨ Penelusuran Adil
            </button>
            <button
              type="button"
              onClick={() => setViewMode("dataset")}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                viewMode === "dataset"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📁 Katalog Dataset
            </button>
          </div>

          {viewMode === "fair-discovery" ? (
            <div className="mb-4">
              <FairDiscoveryResults
                result={fairDiscoveryResult}
                isLoading={fairDiscoveryLoading}
                error={fairDiscoveryError}
                selectedId={selectedId}
                onSelectMerchant={(m) => {
                  const match = baseMerchants.find((bm) => bm.id === m.id || bm.name.toLowerCase() === m.name.toLowerCase());
                  if (match) handleSelect(match);
                }}
                onSelectSponsored={(p) => {
                  const match = baseMerchants.find((bm) => bm.id === p.merchant_id || bm.name.toLowerCase() === p.merchant_name.toLowerCase());
                  if (match) handleSelect(match);
                }}
                onRequestRoute={(item) => {
                  const coords = (item as any).geometry?.coordinates || [(item as any).longitude, (item as any).latitude];
                  if (coords && coords.length >= 2) {
                    setRouteDestinationId((item as any).id || (item as any).merchant_id);
                  }
                }}
              />
            </div>
          ) : (
            <>
              <div className="results-header">
                <div>
                  <span className="eyebrow">
                    {datasetId === "all-areas"
                      ? "Hasil semua data"
                      : datasetId === "admin-import"
                        ? "Hasil admin import"
                        : datasetId === "mapid-food-jakarta-pusat"
                        ? "Hasil MAPID"
                        : "Hasil GeoJSON"}
                  </span>
                  <strong>
                    {merchants.length} dari {baseMerchants.length} titik
                  </strong>
                </div>
                <div className="results-header__actions">
                  {selectedId ? (
                    <button
                      className="show-all-results-button"
                      type="button"
                      onClick={handleClearSelection}
                    >
                      Tampilkan semua
                    </button>
                  ) : null}
                  <span className="source-stamp">
                    {datasetId === "all-areas"
                      ? "ALL"
                      : datasetId === "admin-import"
                        ? "ADMIN"
                        : datasetId === "mapid-food-jakarta-pusat"
                        ? "MAPID"
                        : "2026"}
                  </span>
                </div>
              </div>

              <div className="result-list">
                {merchants.length === 0 ? (
                  <div className="empty-state">
                    Tidak ada titik yang cocok. Ubah brand, kata kunci, atau status buka.
                  </div>
                ) : (
                  merchants.map((merchant, index) => (
                    <button
                      key={merchant.id}
                      className={
                        merchant.id === selectedMerchant?.id
                          ? "result-row result-row--selected"
                          : "result-row"
                      }
                      onClick={() => handleSelect(merchant)}
                    >
                      <span className="result-rank">{index + 1}</span>
                      <span className="result-main">
                        <strong>{merchant.name}</strong>
                        <span>
                          {merchant.brand}
                          {" · "}
                          {merchant.district}
                        </span>
                        <span className="result-meta">
                          {merchant.userDistanceMeters !== undefined ? (
                            <>
                              <LocateFixed size={13} />
                              {formatDistance(merchant.userDistanceMeters)}
                              <span>·</span>
                              {merchant.userWalkingMinutes} menit
                            </>
                          ) : (
                            <>
                              <MapPinned size={13} />
                              {merchant.latitude.toFixed(6)},{" "}
                              {merchant.longitude.toFixed(6)}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="score-box">
                        <strong>{merchant.openNow ? "BUKA" : "TUTUP"}</strong>
                        <span>status</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <div className="ai-teaser">
            <Bot size={17} />
            <div>
              <strong>
                Data map siap difilter
              </strong>
              <span>
                {datasetId ===
                "all-areas"
                  ? "Semua layer aktif ditampilkan bersama. Pakai filter cakupan data untuk fokus ke Jakarta Pusat atau Jakarta Barat."
                  : datasetId ===
                      "admin-import"
                    ? "Data hasil import tersimpan di database dan dapat digunakan untuk pencarian maupun routing."
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "Layer MAPID dinormalisasi lewat backend GETRA agar bisa dicari, dipilih, dan dipakai routing."
                    : "Aktifkan lokasi perangkat agar daftar diurutkan dari titik kamu saat ini."}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <AiPanel
              activeExperience={activeExperience}
              currentOrigin={userLocation ?? undefined}
              currentDestination={selectedMerchant ? { latitude: selectedMerchant.latitude, longitude: selectedMerchant.longitude } : undefined}
              selectedEntityId={selectedMerchant?.id}
            />
          </div>
        </aside>

        <section
          className="map-panel"
          aria-label="Peta GETRA"
        >
          <GetraMap
            merchants={merchants}
            selectedId={selectedId}
            userLocation={userLocation}
            onSelect={handleSelect}
            onClearSelection={handleClearSelection}
            datasetBounds={datasetBounds}
            datasetOrigin={datasetOrigin}
            routeOriginPoint={routeOriginPoint}
            routeDestinationPoint={routeDestinationPoint}
            routeGeometry={route?.geometry}
            routeIsFallback={routeIsFallback}
            importBoundaries={
              adminImportedLayer
                ?.boundaries ?? null
            }
            sponsoredPlacements={fairDiscoveryResult?.sponsored}
            onSelectSponsored={() => {
              // Set selection or route point if needed
            }}
          />
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Evidence
              </span>
              <h2>
                Detail lokasi
              </h2>
            </div>
            <Database size={20} />
          </div>

          {selectedMerchant ? (
            <>
              <div className="detail-title">
                <span className="source-stamp source-stamp--warning">
                  {selectedMerchant.id.startsWith(
                    "admin-import-",
                  )
                    ? "ADMIN"
                    : selectedMerchant.id.startsWith(
                        "mapid-food-",
                      )
                      ? "MAPID"
                      : "GeoJSON"}
                </span>
                <h3>
                  {selectedMerchant.name}
                </h3>
                <p>
                  {selectedMerchant.brand}
                  {" · "}
                  {selectedMerchant.category}
                </p>
              </div>

              {/* Profile Poster Promotional Placement (Additive Phase 9) */}
              {profilePoster && (
                <div className="mb-3">
                  <ProfilePoster
                    poster={profilePoster}
                    onRequestRoute={() => {
                      if (selectedMerchant) {
                        setRouteDestinationId(selectedMerchant.id);
                      }
                    }}
                  />
                </div>
              )}

              <div className="metric-grid">
                <div className="metric">
                  <Coffee size={18} />
                  <span>
                    Brand
                  </span>
                  <strong>
                    {selectedMerchant.brand}
                  </strong>
                </div>
                <div className="metric">
                  <MapPinned size={18} />
                  <span>
                    Kecamatan
                  </span>
                  <strong>
                    {selectedMerchant.district ||
                      "-"}
                  </strong>
                </div>
                <div className="metric">
                  <Layers3 size={18} />
                  <span>
                    Dari lokasi kamu
                  </span>
                  <strong>
                    {selectedMerchant.userDistanceMeters !==
                    undefined
                      ? `${formatDistance(selectedMerchant.userDistanceMeters)} · ${selectedMerchant.userWalkingMinutes} menit`
                      : "Aktifkan GPS"}
                  </strong>
                </div>
                <div className="metric">
                  <CalendarDays size={18} />
                  <span>
                    Status
                  </span>
                  <strong>
                    {selectedMerchant.openNow
                      ? "BUKA"
                      : "TUTUP"}
                  </strong>
                </div>
              </div>

              <section className="evidence-section">
                <h4>
                  Rute aktif
                </h4>
                <p className="limitation-box">
                  Gunakan panel Rute commuter di kiri untuk memilih titik mulai dan tujuan. Marker tujuan yang dipilih akan fokus di map, lalu garis rute tampil langsung setelah dihitung.
                </p>
              </section>

              <section className="evidence-section">
                <h4>
                  Alamat
                </h4>
                <p className="limitation-box">
                  {selectedMerchant.address ||
                    "Alamat tidak tersedia pada GeoJSON."}
                </p>
              </section>

              <section className="evidence-section">
                <h4>
                  Provenance
                </h4>
                <dl className="evidence-list">
                  <div>
                    <dt>
                      Sumber
                    </dt>
                    <dd>
                      {selectedMerchant.source}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Desa
                    </dt>
                    <dd>
                      {selectedMerchant.village ||
                        "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Telepon
                    </dt>
                    <dd>
                      {selectedMerchant.phone ? (
                        <span className="inline-icon-value">
                          <Phone size={12} />
                          {selectedMerchant.phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Koordinat
                    </dt>
                    <dd>
                      {selectedMerchant.latitude.toFixed(6)}, {selectedMerchant.longitude.toFixed(6)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Update
                    </dt>
                    <dd>
                      {selectedMerchant.updatedAt}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="evidence-section">
                <h4>
                  Catatan
                </h4>
                <p className="limitation-box">
                  {selectedMerchant.limitation}
                </p>
              </section>
            </>
          ) : (
            <div className="empty-state">
              Pilih satu titik pada peta atau daftar hasil.
            </div>
          )}
        </aside>
      </section>
      </StakeholderContextShell>
    </main>
  );
}
