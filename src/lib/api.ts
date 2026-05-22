// API client for the FastAPI backend with automatic DEMO MODE fallback.
// If the backend at VITE_API_URL is unreachable (e.g. when previewing on
// Lovable without running `docker compose up`), the client transparently
// switches to in-memory mock data so the whole UI keeps working.

import { mockScans, mockVulns, type Scan as MockScan } from "./mock-data";

export const API_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "vulnscan_token";
const DEMO_KEY = "vulnscan_demo";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const demoMode = {
  get: () => (typeof window === "undefined" ? false : localStorage.getItem(DEMO_KEY) === "1"),
  set: (v: boolean) => (v ? localStorage.setItem(DEMO_KEY, "1") : localStorage.removeItem(DEMO_KEY)),
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

class DemoFallback extends Error {
  constructor() {
    super("demo");
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (demoMode.get()) throw new DemoFallback();

  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (e) {
    // Network failure → backend unreachable. Enable demo mode automatically.
    demoMode.set(true);
    throw new DemoFallback();
  }
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

// ---------- Demo (mock) data layer ----------

const DEMO_USER = { id: 1, email: "demo@sentinel.ai" };
const DEMO_TOKEN = "demo.jwt.token";

function severityToCvss(s: Severity): number {
  return { critical: 9.5, high: 7.5, medium: 5.5, low: 3.0, info: 0 }[s];
}

function mockScanToApi(s: MockScan, idx: number): ApiScan {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  s.vulnerabilities.forEach((v) => counts[v.severity]++);
  const total = s.vulnerabilities.length;
  return {
    id: idx + 1,
    target_url: s.target,
    profile: "full",
    status: s.status,
    progress: s.status === "completed" ? 100 : s.status === "failed" ? 0 : 50,
    started_at: s.startedAt,
    finished_at: s.status === "completed" ? s.startedAt : null,
    summary: { counts, total },
  };
}

function mockVulnsToApi(scan: MockScan): ApiVuln[] {
  return scan.vulnerabilities.map((v, i) => ({
    id: i + 1,
    type: v.type,
    severity: v.severity,
    title: v.title,
    url: v.url,
    description: v.description,
    evidence: v.evidence ?? null,
    remediation: v.remediation,
    cvss: v.cvss ?? severityToCvss(v.severity),
    ml_confidence: 0.92,
    ai_insight: v.aiInsight,
  }));
}

// In-memory store so newly created scans persist for the session.
let demoScans: MockScan[] = [...mockScans];

const demoApi = {
  register: async (email: string) => ({ id: 1, email }),
  login: async (email: string) => ({ access_token: DEMO_TOKEN, token_type: "bearer" }),
  me: async () => ({ ...DEMO_USER, email: DEMO_USER.email }),
  listScans: async (): Promise<ApiScan[]> => demoScans.map(mockScanToApi),
  getScan: async (id: number): Promise<ApiScanDetail> => {
    const s = demoScans[id - 1] ?? demoScans[0];
    return { ...mockScanToApi(s, id - 1), vulnerabilities: mockVulnsToApi(s) };
  },
  createScan: async (target_url: string): Promise<ApiScan> => {
    const newScan: MockScan = {
      id: `scan_${Date.now()}`,
      target: target_url,
      status: "completed",
      startedAt: new Date().toISOString(),
      duration: "2m 14s",
      pagesScanned: 64,
      requests: 1421,
      vulnerabilities: mockVulns.slice(0, 5 + Math.floor(Math.random() * 3)),
    };
    demoScans = [newScan, ...demoScans];
    return mockScanToApi(newScan, 0);
  },
  dashboardStats: async (): Promise<DashboardStats> => {
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const types: Record<string, number> = {};
    demoScans.forEach((s) =>
      s.vulnerabilities.forEach((v) => {
        counts[v.severity]++;
        types[v.type] = (types[v.type] || 0) + 1;
      })
    );
    return {
      total_scans: demoScans.length,
      completed: demoScans.filter((s) => s.status === "completed").length,
      running: demoScans.filter((s) => s.status === "running" || s.status === "queued").length,
      severity_counts: counts,
      type_counts: types,
    };
  },
};

async function withDemoFallback<T>(real: () => Promise<T>, demo: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (e) {
    if (e instanceof DemoFallback) return demo();
    throw e;
  }
}

export const api = {
  register: (email: string, password: string) =>
    withDemoFallback(
      () =>
        request<{ id: number; email: string }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      () => demoApi.register(email)
    ),

  login: (email: string, password: string) =>
    withDemoFallback(
      () =>
        request<{ access_token: string; token_type: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      () => demoApi.login(email)
    ),

  me: () =>
    withDemoFallback(
      () => request<{ id: number; email: string }>("/auth/me"),
      () => demoApi.me()
    ),

  listScans: () => withDemoFallback(() => request<ApiScan[]>("/scans"), demoApi.listScans),

  getScan: (id: number) =>
    withDemoFallback(() => request<ApiScanDetail>(`/scans/${id}`), () => demoApi.getScan(id)),

  createScan: (target_url: string, profile: "quick" | "full" | "ai" = "full") =>
    withDemoFallback(
      () =>
        request<ApiScan>("/scans", {
          method: "POST",
          body: JSON.stringify({ target_url, profile }),
        }),
      () => demoApi.createScan(target_url)
    ),

  dashboardStats: () =>
    withDemoFallback(() => request<DashboardStats>("/dashboard/stats"), demoApi.dashboardStats),

  reportUrl: (id: number) => {
    const token = tokenStore.get();
    // Browsers can't set auth headers on <a download>; use a one-shot fetch + blob URL.
    return { id, token };
  },

  downloadReport: async (id: number) => {
    if (demoMode.get()) {
      // Generate a tiny placeholder PDF-like text file so the download UI works.
      const blob = new Blob(
        [`Sentinel AI — Demo Report\nScan #${id}\nGenerated ${new Date().toISOString()}\n`],
        { type: "text/plain" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scan_${id}_demo.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
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
    if (demoMode.get()) {
      // Simulate progress messages.
      let progress = 0;
      const lines = [
        "Initializing scan engine...",
        "Crawling target...",
        "Probing endpoints...",
        "Running SQLi heuristics...",
        "Running XSS detectors...",
        "AI threat analysis...",
        "Compiling report...",
      ];
      const interval = setInterval(() => {
        progress = Math.min(100, progress + 15);
        onMessage({ type: "progress", progress, log: lines[Math.floor(progress / 15) - 1] || "Done" });
        if (progress >= 100) {
          clearInterval(interval);
          onMessage({ type: "completed", scan_id: id });
        }
      }, 600);
      return { close: () => clearInterval(interval) } as unknown as WebSocket;
    }
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
