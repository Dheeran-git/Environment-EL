import type { PollutionLevel } from "./types";

export type PillTone = "unknown" | "low" | "moderate" | "high" | "severe";

export function scoreToTone(score: number | null | undefined): PillTone {
  if (score === null || score === undefined || Number.isNaN(score)) return "unknown";
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "severe";
}

export function toneToColor(tone: PillTone): string {
  switch (tone) {
    case "low":
      return "#4cb782";
    case "moderate":
      return "#f2c94c";
    case "high":
      return "#f2994a";
    case "severe":
      return "#eb5757";
    default:
      return "#45484d";
  }
}

export function toneToTextClass(tone: PillTone): string {
  switch (tone) {
    case "low":
      return "text-pill-low";
    case "moderate":
      return "text-pill-mod";
    case "high":
      return "text-pill-high";
    case "severe":
      return "text-pill-severe";
    default:
      return "text-fg-muted";
  }
}

export function knownLevelToTone(level: PollutionLevel): PillTone {
  if (level === "moderate") return "moderate";
  return level;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  return score.toFixed(1);
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function formatMonth(iso: string): string {
  return iso.slice(0, 7);
}

export function verdictLabel(v: string | null | undefined): string {
  if (!v) return "Insufficient data";
  switch (v) {
    case "improved":
      return "Improved";
    case "worsened":
      return "Worsened";
    case "unchanged":
      return "Unchanged";
    case "insufficient_data":
      return "Insufficient data";
    default:
      return v;
  }
}

export function verdictTone(v: string | null | undefined): PillTone {
  if (v === "improved") return "low";
  if (v === "worsened") return "severe";
  if (v === "unchanged") return "moderate";
  return "unknown";
}
