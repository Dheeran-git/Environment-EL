export type PollutionLevel = "unknown" | "low" | "moderate" | "high" | "severe";

export interface LakeMetadata {
  generated_at?: string;
  source?: string;
  schema_version?: string;
  overpass_query_hash?: string | null;
}

export interface Lake {
  id: string;
  name: string;
  alt_names: string[];
  ward: string | null;
  bbmp_ward_no: string | null;
  official_area_ha: number | null;
  known_pollution_level: PollutionLevel;
  centroid: [number, number];
  source: string;
  osm_id: string | null;
  last_verified: string | null;
  notes: string | null;
  geometry: GeoJSON.Geometry;
  computed_pollution_score: number | null;
}

export interface LakesPayload {
  metadata: LakeMetadata;
  lakes: Lake[];
}

export type RestorationVerdict =
  | "improved"
  | "worsened"
  | "unchanged"
  | "insufficient_data"
  | null;

export interface MonthlyObservation {
  lake_id: string;
  month_start: string;
  month_end: string;
  ndwi: number;
  ndvi: number;
  ndti: number;
  pollution_score: number;
  pixel_count: number;
  scene_count: number;
  anomaly_flag: boolean;
  mom_change_pct: number | null;
  restoration_verdict: RestorationVerdict;
  restoration_confidence: number | null;
}

export interface TimeseriesPayload {
  lake_id: string;
  analytics_run_id: string;
  data: MonthlyObservation[];
}

export interface RestorationEvent {
  lake_id: string;
  event_date: string;
  title: string;
  description?: string | null;
  source_url?: string | null;
  confidence?: number | null;
}

export interface RestorationEventsPayload {
  lake_id: string;
  events: RestorationEvent[];
}

export interface HealthPayload {
  status: string;
  version: string;
  lake_count: number;
  output_root: string;
  output_root_exists: boolean;
}
