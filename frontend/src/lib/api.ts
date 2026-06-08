import type {
  HealthPayload,
  LakesPayload,
  RestorationEventsPayload,
  TimeseriesPayload,
  CitizenReport,
  GetReportsPayload,
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

async function postRequest<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(url(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} — ${path}`);
  }
  return (await resp.json()) as T;
}
async function putRequest<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(url(path), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} — ${path}`);
  }
  return (await resp.json()) as T;
}

async function deleteRequest<T>(path: string): Promise<T> {
  const resp = await fetch(url(path), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
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
  getReports: () => request<GetReportsPayload>("/api/reports"),
  createReport: (body: Omit<CitizenReport, "id" | "created_at">) =>
    postRequest<{ status: string; report: CitizenReport }>("/api/reports", body),
  updateReportStatus: (reportId: string, status: "pending" | "under_review" | "action_taken") =>
    putRequest<{ status: string }>(`/api/reports/${encodeURIComponent(reportId)}`, { status }),
  deleteReport: (reportId: string) =>
    deleteRequest<{ status: string }>(`/api/reports/${encodeURIComponent(reportId)}`),
};
