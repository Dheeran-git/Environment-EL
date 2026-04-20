import type {
  HealthPayload,
  LakesPayload,
  RestorationEventsPayload,
  TimeseriesPayload,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

function url(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string): Promise<T> {
  const resp = await fetch(url(path), { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} — ${path}`);
  }
  return (await resp.json()) as T;
}

export const api = {
  getLakes: () => request<LakesPayload>("/api/lakes"),
  getTimeseries: (lakeId: string) =>
    request<TimeseriesPayload>(`/api/timeseries/${encodeURIComponent(lakeId)}`),
  getRestorationEvents: (lakeId: string) =>
    request<RestorationEventsPayload>(
      `/api/restoration-events/${encodeURIComponent(lakeId)}`,
    ),
  getHealth: () => request<HealthPayload>("/healthz"),
};
