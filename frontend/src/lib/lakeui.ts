// Maps the real API data shapes into the Kere design-system UI props.
import type { Lake, MonthlyObservation } from "./types";

export type Trend = "improved" | "worsened" | "unchanged" | "insufficient_data";

export function deriveTrend(mom: number | null | undefined): Trend {
  if (mom === null || mom === undefined || Number.isNaN(mom)) return "insufficient_data";
  if (mom <= -3) return "improved";
  if (mom >= 3) return "worsened";
  return "unchanged";
}

export type ScoreBand = "pristine" | "moderate" | "high" | "severe";
export function scoreBand(score: number): ScoreBand {
  if (score < 25) return "pristine";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "severe";
}

/** Plain-language, honest, editorial verdict — pairs the band with the trend. */
export function headlineFor(name: string, score: number, trend: Trend): string {
  const b = scoreBand(score);
  if (b === "severe") {
    if (trend === "improved") return `${name} is still critically polluted — but the slope is finally bending.`;
    if (trend === "worsened") return `${name} is under heavy stress, and the trend is moving the wrong way.`;
    return `${name} remains critically polluted, holding near the top of the scale.`;
  }
  if (b === "high") {
    if (trend === "improved") return `${name} is under stress, but easing month over month.`;
    if (trend === "worsened") return `${name} is deteriorating — pollution is climbing again.`;
    return `${name} is under stress and roughly steady.`;
  }
  if (b === "moderate") {
    if (trend === "improved") return `${name} is holding steady, and slowly getting cleaner.`;
    if (trend === "worsened") return `${name} is slipping from moderate toward stressed.`;
    return `${name} is moderate and stable — a usable urban waterbody.`;
  }
  // pristine
  if (trend === "worsened") return `${name} is still clean, though worth watching this month.`;
  return `${name} is close to pristine — the cleanest end of the scale.`;
}

export function wardLabel(lake: Lake): string {
  if (lake.ward && lake.bbmp_ward_no) return `Ward ${lake.bbmp_ward_no} · ${lake.ward}`;
  if (lake.ward) return lake.ward;
  if (lake.bbmp_ward_no) return `Ward ${lake.bbmp_ward_no}`;
  return "Bengaluru";
}

export function coordsLabel(centroid: [number, number] | null | undefined): string {
  if (!centroid) return "—";
  // GeoJSON centroid is [lon, lat]; present as lat, lon
  const [lon, lat] = centroid;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/** Pick the "headline" observation for a lake (curated months for two lakes, else latest valid). */
export function pickLatest(lakeId: string, rows: MonthlyObservation[]): MonthlyObservation | undefined {
  const valid = rows.filter((r) => r.pixel_count > 0);
  if (lakeId === "bellandur") {
    return valid.find((r) => r.month_start === "2025-02-01") ?? valid[valid.length - 1];
  }
  if (lakeId === "hebbal") {
    return valid.find((r) => r.month_start === "2026-02-01") ?? valid[valid.length - 1];
  }
  return valid[valid.length - 1];
}

export function monthLabel(monthStart: string): string {
  const d = new Date(monthStart + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase();
}
