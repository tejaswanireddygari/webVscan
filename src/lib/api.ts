// API client for the FastAPI backend.
// Set VITE_API_URL in .env (default: http://localhost:8000).

export const API_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "vulnscan_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ApiVuln = {
  id: number;
  type: string;
  severity: Severity;
  title: string;
  url: string;
  description: string;
  evidence: string | null;
  remediation: string;
  cvss: number;
  ml_confidence: number;
  ai_insight: string | null;
};

export type ApiScan = {
  id: number;
  target_url: string;
  profile: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  started_at: string;
  finished_at: string | null;
  summary: { counts?: Record<Severity, number>; total?: number; error?: string } | null;
};

export type ApiScanDetail = ApiScan & { vulnerabilities: ApiVuln[] };

export type DashboardStats = {
  total_scans: number;
  completed: number;
  running: number;
  severity_counts: Record<Severity, number>;
  type_counts: Record<string, number>;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {}
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : (res.blob() as any)) as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ id: number; email: string }>("/auth/me"),

  listScans: () => request<ApiScan[]>("/scans"),

  getScan: (id: number) => request<ApiScanDetail>(`/scans/${id}`),

  createScan: (target_url: string, profile: "quick" | "full" | "ai" = "full") =>
    request<ApiScan>("/scans", {
      method: "POST",
      body: JSON.stringify({ target_url, profile }),
    }),

  dashboardStats: () => request<DashboardStats>("/dashboard/stats"),

  reportUrl: (id: number) => {
    const token = tokenStore.get();
    // Browsers can't set auth headers on <a download>; use a one-shot fetch + blob URL.
    return { id, token };
  },

  downloadReport: async (id: number) => {
    const token = tokenStore.get();
    const res = await fetch(`${API_URL}/scans/${id}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  openScanSocket: (id: number, onMessage: (msg: any) => void) => {
    const token = tokenStore.get();
    const wsUrl = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/scans/${id}?token=${encodeURIComponent(token || "")}`);
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch {}
    };
    return ws;
  },
};
