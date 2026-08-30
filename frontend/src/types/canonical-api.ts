export type ApiListEnvelope<T> = {
  data?: T[];
  items?: T[];
};

export type PaginatedEnvelope<T> = {
  items: T[];
  page?: number;
  limit?: number;
  total?: number;
};

export type GeometryPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type GeometryPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeometryLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type PublicProvenance = {
  source?: string | null;
  source_type?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type StudyAreaDto = {
  id: string;
  name: string;
  description?: string | null;
  geometry?: GeometryPolygon | null;
  created_at?: string | null;
  updated_at?: string | null;
  provenance?: PublicProvenance | null;
};

export type TransportNodeDto = {
  id: string;
  name: string;
  node_type?: string | null;
  transport_mode?: string | null;
  geometry?: GeometryPoint | null;
  created_at?: string | null;
  updated_at?: string | null;
  provenance?: PublicProvenance | null;
};

export type TransportCorridorDto = {
  id: string;
  name: string;
  transport_mode?: string | null;
  description?: string | null;
  geometry?: GeometryLineString | null;
  created_at?: string | null;
  updated_at?: string | null;
  provenance?: PublicProvenance | null;
};
