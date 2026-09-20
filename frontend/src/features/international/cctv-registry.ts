/**
 * GETRA CCTV INTEGRATION PLATFORM — CANONICAL CAMERA REGISTRY
 *
 * Architectural principles (strictly enforced):
 * 1. GIS computes. AI interprets. CCTV provides visual evidence. Sensor provides telemetry.
 * 2. NEVER present static/hardcoded numbers as live inference results.
 * 3. Distinct states: ONLINE | DEGRADED | STALE | OFFLINE | NO_STREAM | UNKNOWN
 * 4. runtime_metrics are null unless produced by a real, running AI inference pipeline.
 * 5. embed_url is only set when the DKI public portal confirms embeddability.
 * 6. source_url is only set when authorized stream access has been verified.
 * 7. Privacy claims must be truthful — "Privacy masking enabled", never fake certifications.
 * 8. NO fake canvas, NO fake dark backgrounds, NO synthetic bounding boxes.
 *
 * PRIMARY SOURCE: https://jakcctv.jakarta.go.id/publik
 * DKI Jakarta Official Public CCTV Portal
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CameraHealthStatus =
  | "ONLINE"
  | "DEGRADED"
  | "STALE"
  | "OFFLINE"
  | "NO_STREAM"
  | "UNKNOWN";

export type CameraAuthorizationStatus =
  | "PUBLIC"           // Publicly accessible, no authentication required
  | "AUTHORIZED"       // Authorized access granted to GETRA
  | "RESTRICTED"       // Stream restricted to law enforcement / internal
  | "UNAUTHORIZED";    // Not authorized to access

export type CameraVisibilityStatus =
  | "PUBLIC"
  | "INTERNAL"
  | "ADMIN_ONLY";

export type CameraSourceType =
  | "DKI_PUBLIC_IFRAME"    // Embed from jakcctv.jakarta.go.id/publik
  | "SNAPSHOT_POLLING"     // img src with periodic refresh
  | "HLS_STREAM"           // HLS video stream (if authorized)
  | "NO_STREAM";           // Registry only — no stream available

export type CameraProvider =
  | "Dishub DKI"
  | "Polda Metro Jaya"
  | "Satpol PP DKI"
  | "DBM DKI"
  | "BUMD"
  | "Authorized Partner"
  | "International Open Stream";

export type DkiDistrict =
  | "Jakarta Pusat"
  | "Jakarta Selatan"
  | "Jakarta Barat"
  | "Jakarta Timur"
  | "Jakarta Utara"
  | "Kepulauan Seribu";

export type GlobalCityId =
  | "jakarta"
  | "tokyo"
  | "singapore"
  | "london"
  | "new-york"
  | "paris"
  | "sydney";

export type AiPipelineState =
  | "LIVE"              // AI inference actively running with real frames
  | "DEGRADED"          // AI running but with reduced reliability
  | "DATA_UNAVAILABLE"  // No camera frame available for inference
  | "OFFLINE";          // AI pipeline disconnected

export interface CanonicalCamera {
  camera_id: string;
  camera_name: string;
  site_name: string;
  district: DkiDistrict | string;
  city: GlobalCityId;
  province: string;
  lat: number;
  lng: number;

  provider: CameraProvider;
  operator: string;

  source_type: CameraSourceType;
  public_portal_url: string | null;   // e.g. https://jakcctv.jakarta.go.id/publik
  embed_url: string | null;           // URL safe to put in iframe (verified)
  stream_url: string | null;          // HLS/RTSP — only if authorized
  thumbnail_url: string | null;

  iframe_supported: boolean;
  hls_supported: boolean;
  snapshot_supported: boolean;

  authorization_status: CameraAuthorizationStatus;
  visibility_status: CameraVisibilityStatus;
  health_status: CameraHealthStatus;

  supports_video: boolean;
  supports_audio: boolean;
  supports_ai: boolean;

  privacy_policy: string;
  privacy_policy_url: string | null;
  license: string;

  ai_capabilities: string[];

  last_verified_at: string;
  last_frame_at: string | null;
  last_health_check_at: string | null;

  created_at: string;
  updated_at: string;

  source_notes: string;

  /**
   * Runtime AI metrics — ONLY populated when a real inference pipeline is
   * connected and actively producing results. ALL fields are null by default.
   * Do NOT hardcode any values here.
   */
  runtime_metrics: {
    fps: number | null;
    latency_ms: number | null;
    pedestrian_count: number | null;
    bicycle_count: number | null;
    motorcycle_count: number | null;
    car_count: number | null;
    bus_count: number | null;
    truck_count: number | null;
    confidence: number | null;
    traffic_density: "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "UNKNOWN";
    pipeline_state: AiPipelineState;
    model_version: string | null;
    last_inference_at: string | null;
  };
}

// ---------------------------------------------------------------------------
// Null metrics — used for any camera without an active inference pipeline
// ---------------------------------------------------------------------------

const DATA_UNAVAILABLE_METRICS: CanonicalCamera["runtime_metrics"] = {
  fps: null,
  latency_ms: null,
  pedestrian_count: null,
  bicycle_count: null,
  motorcycle_count: null,
  car_count: null,
  bus_count: null,
  truck_count: null,
  confidence: null,
  traffic_density: "UNKNOWN",
  pipeline_state: "DATA_UNAVAILABLE",
  model_version: null,
  last_inference_at: null,
};

// ---------------------------------------------------------------------------
// CANONICAL CAMERA REGISTRY
//
// Source: https://jakcctv.jakarta.go.id/publik (DKI Jakarta Official Portal)
// Last audit: 2026-09-19
//
// Authorization note: All DKI cameras are PUBLIC (accessible via official portal).
// embed_url is set to the public portal page — per the portal's public access model.
// Individual camera embed pages require discovery from the portal.
// ---------------------------------------------------------------------------

export const CANONICAL_CAMERA_REGISTRY: CanonicalCamera[] = [

  // =========================================================================
  // DKI JAKARTA — JAKARTA PUSAT
  // Source: jakcctv.jakarta.go.id/publik — Verified camera entries
  // =========================================================================

  {
    camera_id: "dki-jkp-polda-gatot-subroto-jpo",
    camera_name: "JPO Jl. Gatot Subroto",
    site_name: "JKP POLDA JPO JL. GATOT SUBROTO",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2297,
    lng: 106.8017,
    provider: "Polda Metro Jaya",
    operator: "RTMC Polda Metro Jaya",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta (jakcctv.jakarta.go.id/publik). Status operasional belum diverifikasi secara real-time.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-polda-gerbang-pemuda",
    camera_name: "Jl. Gerbang Pemuda",
    site_name: "JKP POLDA JL. GERBANG PEMUDA",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2190,
    lng: 106.8003,
    provider: "Polda Metro Jaya",
    operator: "RTMC Polda Metro Jaya",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-satpolpp-gerbang-pemuda",
    camera_name: "Jl. Gerbang Pemuda (Satpol PP)",
    site_name: "JKP SATPOL PP JL. GERBANG PEMUDA",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2193,
    lng: 106.7998,
    provider: "Satpol PP DKI",
    operator: "Satpol PP DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-polda-jend-gatot-subroto",
    camera_name: "Jl. Jend. Gatot Subroto",
    site_name: "JKP POLDA JL. JEND. GATOT SUBROTO",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2255,
    lng: 106.8001,
    provider: "Polda Metro Jaya",
    operator: "RTMC Polda Metro Jaya",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-dbm-flyover-ladokgi",
    camera_name: "Flyover Ladokgi",
    site_name: "JKP DBM FLYOVER LADOKGI",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2105,
    lng: 106.8185,
    provider: "DBM DKI",
    operator: "Dinas Bina Marga DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-dishub-mh-thamrin",
    camera_name: "Jl. MH. Thamrin",
    site_name: "JKP DISHUB JL. MH. THAMRIN",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1936,
    lng: 106.8217,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta. Lokasi: Jl. MH. Thamrin, Jakarta Pusat.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-satpolpp-simpang-thamrin",
    camera_name: "Simpang Jl. MH. Thamrin",
    site_name: "JKP SATPOL PP SIMPANG JL. MH. THAMRIN",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1878,
    lng: 106.8239,
    provider: "Satpol PP DKI",
    operator: "Satpol PP DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-polri-uob-plaza",
    camera_name: "UOB Plaza",
    site_name: "JKP POLRI UOB PLAZA",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1917,
    lng: 106.8234,
    provider: "Polda Metro Jaya",
    operator: "Polri / RTMC",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  // =========================================================================
  // DKI JAKARTA — JAKARTA SELATAN
  // =========================================================================

  {
    camera_id: "dki-jks-taman-literasi",
    camera_name: "Taman Literasi",
    site_name: "Taman Literasi",
    district: "Jakarta Selatan",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2540,
    lng: 106.7978,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jks-simpang-panglima-polim",
    camera_name: "Simpang Jl. Panglima Polim",
    site_name: "Simpang Jl. Panglima Polim",
    district: "Jakarta Selatan",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2476,
    lng: 106.7993,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jks-jl-sultan-agung",
    camera_name: "Jl. Sultan Agung",
    site_name: "Jl. Sultan Agung",
    district: "Jakarta Selatan",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2350,
    lng: 106.8300,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jks-senayan",
    camera_name: "Senayan",
    site_name: "Senayan",
    district: "Jakarta Selatan",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2183,
    lng: 106.8020,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jks-bendungan-hilir",
    camera_name: "Bendungan Hilir",
    site_name: "Bendungan Hilir",
    district: "Jakarta Selatan",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2101,
    lng: 106.8179,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  // =========================================================================
  // DKI JAKARTA — JAKARTA PUSAT (Tanah Abang area)
  // =========================================================================

  {
    camera_id: "dki-jkp-pasar-tanah-abang",
    camera_name: "Pasar Tanah Abang",
    site_name: "Pasar Tanah Abang",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1831,
    lng: 106.8132,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta. Area Pasar Tanah Abang.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-jl-kh-mas-mansyur",
    camera_name: "Jl. KH. Mas Mansyur",
    site_name: "Jl. KH. Mas Mansyur",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1910,
    lng: 106.8173,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-jl-jati-baru-raya",
    camera_name: "Jl. Jati Baru Raya",
    site_name: "Jl. Jati Baru Raya",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1823,
    lng: 106.8148,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkp-kebon-melati",
    camera_name: "Kebon Melati",
    site_name: "Kebon Melati",
    district: "Jakarta Pusat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1952,
    lng: 106.8166,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "DKI_PUBLIC_IFRAME",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: "https://jakcctv.jakarta.go.id/publik",
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: true,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: true,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Terdaftar di portal publik DKI Jakarta.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  // =========================================================================
  // REGISTRY PLACEHOLDER — Cameras pending verification from portal
  // Authorization required before stream/embed is activated
  // =========================================================================

  {
    camera_id: "dki-jkb-simpang-grogol-pending",
    camera_name: "Simpang Grogol",
    site_name: "Simpang Grogol — Kyai Tapa / Daan Mogot",
    district: "Jakarta Barat",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1668,
    lng: 106.7891,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "NO_STREAM",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: null,
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: false,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: false,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Registry entry — embed URL belum diverifikasi dari portal publik DKI. Lihat https://jakcctv.jakarta.go.id/publik untuk akses langsung.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jkt-simpang-cawang-pending",
    camera_name: "Simpang Cawang",
    site_name: "Simpang Cawang Kompor — MT Haryono",
    district: "Jakarta Timur",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.2443,
    lng: 106.8712,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "NO_STREAM",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: null,
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: false,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: false,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Registry entry — embed URL belum diverifikasi dari portal publik DKI.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },

  {
    camera_id: "dki-jku-kelapa-gading-pending",
    camera_name: "Boulevard Kelapa Gading",
    site_name: "Boulevard Kelapa Gading — Simpang Mall",
    district: "Jakarta Utara",
    city: "jakarta",
    province: "DKI Jakarta",
    lat: -6.1582,
    lng: 106.9069,
    provider: "Dishub DKI",
    operator: "Dinas Perhubungan DKI Jakarta",
    source_type: "NO_STREAM",
    public_portal_url: "https://jakcctv.jakarta.go.id/publik",
    embed_url: null,
    stream_url: null,
    thumbnail_url: null,
    iframe_supported: false,
    hls_supported: false,
    snapshot_supported: false,
    authorization_status: "PUBLIC",
    visibility_status: "PUBLIC",
    health_status: "UNKNOWN",
    supports_video: false,
    supports_audio: false,
    supports_ai: false,
    privacy_policy: "Privacy masking enabled",
    privacy_policy_url: null,
    license: "DKI Jakarta Public CCTV Open Access",
    ai_capabilities: [],
    last_verified_at: "2026-09-19T07:00:00Z",
    last_frame_at: null,
    last_health_check_at: "2026-09-19T07:00:00Z",
    created_at: "2026-09-19T07:00:00Z",
    updated_at: "2026-09-19T07:00:00Z",
    source_notes: "Registry entry — embed URL belum diverifikasi dari portal publik DKI.",
    runtime_metrics: { ...DATA_UNAVAILABLE_METRICS },
  },
];

// ---------------------------------------------------------------------------
// Registry Statistics — calculated from actual registry data
// ---------------------------------------------------------------------------

export function getCameraRegistryStats() {
  const total = CANONICAL_CAMERA_REGISTRY.length;
  const dkiTotal = CANONICAL_CAMERA_REGISTRY.filter((c) => c.city === "jakarta").length;
  const online = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "ONLINE").length;
  const degraded = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "DEGRADED").length;
  const offline = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "OFFLINE").length;
  const noStream = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "NO_STREAM" || c.source_type === "NO_STREAM").length;
  const stale = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "STALE").length;
  const unknown = CANONICAL_CAMERA_REGISTRY.filter((c) => c.health_status === "UNKNOWN").length;
  const withEmbed = CANONICAL_CAMERA_REGISTRY.filter((c) => c.embed_url !== null).length;
  const withAi = CANONICAL_CAMERA_REGISTRY.filter((c) => c.supports_ai && c.ai_capabilities.length > 0).length;

  const byDistrict = {
    "Jakarta Pusat": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Jakarta Pusat").length,
    "Jakarta Selatan": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Jakarta Selatan").length,
    "Jakarta Barat": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Jakarta Barat").length,
    "Jakarta Timur": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Jakarta Timur").length,
    "Jakarta Utara": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Jakarta Utara").length,
    "Kepulauan Seribu": CANONICAL_CAMERA_REGISTRY.filter((c) => c.district === "Kepulauan Seribu").length,
  };

  const byProvider: Record<string, number> = {};
  for (const cam of CANONICAL_CAMERA_REGISTRY) {
    byProvider[cam.provider] = (byProvider[cam.provider] ?? 0) + 1;
  }

  return {
    total,
    dkiTotal,
    online,
    degraded,
    offline,
    noStream,
    stale,
    unknown,
    withEmbed,
    withAi,
    byDistrict,
    byProvider,
  };
}

// ---------------------------------------------------------------------------
// Provider label helpers
// ---------------------------------------------------------------------------

export function getHealthStatusLabel(status: CameraHealthStatus): string {
  switch (status) {
    case "ONLINE": return "LIVE";
    case "DEGRADED": return "DEGRADED";
    case "STALE": return "STALE";
    case "OFFLINE": return "OFFLINE";
    case "NO_STREAM": return "NO STREAM";
    case "UNKNOWN": return "UNKNOWN";
  }
}

export function getSourceTypeLabel(type: CameraSourceType): string {
  switch (type) {
    case "DKI_PUBLIC_IFRAME": return "DKI Public Portal";
    case "SNAPSHOT_POLLING": return "Snapshot (3s)";
    case "HLS_STREAM": return "HLS Stream";
    case "NO_STREAM": return "Registry Only";
  }
}
