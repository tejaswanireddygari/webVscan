export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Vulnerability = {
  id: string;
  title: string;
  severity: Severity;
  type: string;
  url: string;
  cve?: string;
  cvss?: number;
  description: string;
  aiInsight: string;
  remediation: string;
  evidence?: string;
};

export type Scan = {
  id: string;
  target: string;
  status: "completed" | "running" | "failed" | "queued";
  startedAt: string;
  duration: string;
  vulnerabilities: Vulnerability[];
  pagesScanned: number;
  requests: number;
};

export const mockVulns: Vulnerability[] = [
  {
    id: "v1",
    title: "SQL Injection in login endpoint",
    severity: "critical",
    type: "SQLi",
    url: "/api/auth/login",
    cve: "CVE-2024-1337",
    cvss: 9.8,
    description: "Unsanitized user input in the email parameter allows arbitrary SQL execution.",
    aiInsight:
      "AI detected a high-confidence (96%) SQLi pattern. The model observed time-based blind responses when injecting `' OR SLEEP(5)--`. Likely exploitable for full DB exfiltration.",
    remediation: "Use parameterized queries (prepared statements). Validate input types. Apply WAF rules.",
    evidence: "POST /api/auth/login email=admin'--",
  },
  {
    id: "v2",
    title: "Reflected XSS in search query",
    severity: "high",
    type: "XSS",
    url: "/search?q=",
    cvss: 7.4,
    description: "User-controlled `q` parameter is reflected without encoding.",
    aiInsight:
      "Confidence 91%. Payload `<svg/onload=alert(1)>` was reflected in DOM. AI classifier matched DOM-sink patterns (innerHTML).",
    remediation: "HTML-encode output. Use a strict CSP. Prefer textContent over innerHTML.",
  },
  {
    id: "v3",
    title: "Missing security headers",
    severity: "medium",
    type: "Misconfiguration",
    url: "/",
    cvss: 5.3,
    description: "Missing X-Frame-Options, Content-Security-Policy, and Strict-Transport-Security.",
    aiInsight: "Header fingerprint matches known framework defaults. Easy fix, broad impact.",
    remediation: "Add CSP, HSTS, X-Content-Type-Options nosniff via reverse proxy.",
  },
  {
    id: "v4",
    title: "Outdated jQuery 1.8.3",
    severity: "high",
    type: "Outdated Component",
    url: "/static/js/jquery.min.js",
    cve: "CVE-2020-11023",
    cvss: 7.2,
    description: "Detected jQuery 1.8.3, vulnerable to multiple XSS issues.",
    aiInsight: "Library fingerprint matched against NVD database. 4 known CVEs apply.",
    remediation: "Upgrade to jQuery 3.7+ or remove dependency.",
  },
  {
    id: "v5",
    title: "Exposed .env file",
    severity: "critical",
    type: "Information Disclosure",
    url: "/.env",
    cvss: 9.1,
    description: "Environment file accessible publicly, leaking credentials.",
    aiInsight: "AI found 7 secret-like strings (API keys, DB passwords) using entropy + pattern detection.",
    remediation: "Block dotfiles at the web server level. Rotate exposed credentials immediately.",
  },
  {
    id: "v6",
    title: "Cookie missing HttpOnly flag",
    severity: "low",
    type: "Cookie",
    url: "/",
    cvss: 3.1,
    description: "Session cookie accessible via JavaScript.",
    aiInsight: "Low risk in isolation, but compounds severity of XSS findings (see v2).",
    remediation: "Set HttpOnly, Secure, and SameSite=Strict on session cookies.",
  },
  {
    id: "v7",
    title: "Open CORS policy",
    severity: "medium",
    type: "Misconfiguration",
    url: "/api/*",
    cvss: 6.1,
    description: "Access-Control-Allow-Origin: * with credentialed endpoints.",
    aiInsight: "Combined with weak auth, allows cross-origin data theft.",
    remediation: "Restrict origins to a known allowlist.",
  },
  {
    id: "v8",
    title: "Server version disclosed",
    severity: "info",
    type: "Information Disclosure",
    url: "/",
    cvss: 0,
    description: "Server header reveals nginx/1.18.0",
    aiInsight: "Not directly exploitable but useful for attacker reconnaissance.",
    remediation: "Set server_tokens off in nginx config.",
  },
];

export const mockScans: Scan[] = [
  {
    id: "scan_001",
    target: "https://acme-corp.com",
    status: "completed",
    startedAt: "2026-05-13T14:22:00Z",
    duration: "4m 12s",
    pagesScanned: 142,
    requests: 3287,
    vulnerabilities: mockVulns,
  },
  {
    id: "scan_002",
    target: "https://staging.acme-corp.com",
    status: "completed",
    startedAt: "2026-05-12T09:10:00Z",
    duration: "2m 48s",
    pagesScanned: 87,
    requests: 1944,
    vulnerabilities: mockVulns.slice(0, 4),
  },
  {
    id: "scan_003",
    target: "https://api.acme-corp.com",
    status: "completed",
    startedAt: "2026-05-10T18:00:00Z",
    duration: "6m 03s",
    pagesScanned: 203,
    requests: 5102,
    vulnerabilities: mockVulns.slice(2, 7),
  },
  {
    id: "scan_004",
    target: "https://blog.acme-corp.com",
    status: "failed",
    startedAt: "2026-05-09T11:30:00Z",
    duration: "0m 22s",
    pagesScanned: 0,
    requests: 14,
    vulnerabilities: [],
  },
];

export const severityColor: Record<Severity, string> = {
  critical: "text-critical border-critical/40 bg-critical/10",
  high: "text-high border-high/40 bg-high/10",
  medium: "text-medium border-medium/40 bg-medium/10",
  low: "text-low border-low/40 bg-low/10",
  info: "text-info border-info/40 bg-info/10",
};

export function countBySeverity(vulns: Vulnerability[]) {
  const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  vulns.forEach((v) => c[v.severity]++);
  return c;
}
