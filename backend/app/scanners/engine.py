"""Heuristic vulnerability scanners. Each returns a list of finding dicts."""
from __future__ import annotations
import httpx, re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup

TIMEOUT = httpx.Timeout(10.0)
UA = {"User-Agent": "SentinelAI-Scanner/1.0"}

SQL_ERRORS = [
    r"you have an error in your sql syntax",
    r"warning: mysql",
    r"unclosed quotation mark",
    r"ora-\d{5}",
    r"sqlite3\.operationalerror",
    r"pg::syntaxerror",
]

def _fetch(url: str) -> tuple[int, dict, str]:
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=True, headers=UA) as c:
            r = c.get(url)
            return r.status_code, dict(r.headers), r.text
    except Exception as e:
        return 0, {}, f"__error__:{e}"

# ---------- Detectors -------------------------------------------------------

def scan_sqli(url: str) -> list[dict]:
    findings = []
    probe = url + ("&" if "?" in url else "?") + "id=1'"
    code, _, body = _fetch(probe)
    low = body.lower()
    for pat in SQL_ERRORS:
        if re.search(pat, low):
            findings.append({
                "type": "SQLi", "severity": "critical",
                "title": "Possible SQL Injection (error-based)",
                "url": probe,
                "description": "Server returned a database error when an unbalanced quote was appended to a parameter, suggesting unsanitized input reaches a SQL query.",
                "evidence": low[max(0, low.find(re.search(pat, low).group(0))-40):][:300],
                "remediation": "Use parameterized queries / prepared statements. Never concatenate user input into SQL.",
                "cvss": 9.1,
            })
            break
    return findings

def scan_xss(url: str) -> list[dict]:
    findings = []
    payload = "<script>alert(1)</script>"
    probe = url + ("&" if "?" in url else "?") + "q=" + payload
    code, _, body = _fetch(probe)
    if payload in body:
        findings.append({
            "type": "XSS", "severity": "high",
            "title": "Reflected Cross-Site Scripting",
            "url": probe,
            "description": "User-controlled query parameter is reflected in the HTML response without encoding.",
            "evidence": f"Payload {payload} reflected verbatim in response body.",
            "remediation": "HTML-encode all user input on output. Adopt a strict Content-Security-Policy.",
            "cvss": 7.4,
        })
    return findings

def scan_csrf(url: str) -> list[dict]:
    findings = []
    code, _, body = _fetch(url)
    if body.startswith("__error__"): return findings
    soup = BeautifulSoup(body, "html.parser")
    for form in soup.find_all("form", method=re.compile("post", re.I)):
        inputs = form.find_all("input")
        has_token = any(re.search(r"csrf|token|authenticity", (i.get("name") or "") + (i.get("id") or ""), re.I) for i in inputs)
        if not has_token:
            findings.append({
                "type": "CSRF", "severity": "medium",
                "title": "Form without anti-CSRF token",
                "url": url,
                "description": "A state-changing POST form does not appear to include a CSRF token field.",
                "evidence": f"form action={form.get('action')!r} has no csrf/token input",
                "remediation": "Include a per-session CSRF token in every state-changing form and validate it server-side. Use SameSite=Lax/Strict cookies.",
                "cvss": 6.1,
            })
            break
    return findings

def scan_ssrf(url: str) -> list[dict]:
    findings = []
    qs = urlparse(url).query
    if re.search(r"(url|uri|next|redirect|dest|target|fetch)=", qs, re.I):
        findings.append({
            "type": "SSRF", "severity": "high",
            "title": "Potential SSRF via URL parameter",
            "url": url,
            "description": "A URL-like parameter was detected. If the server fetches it without validation, attackers can pivot to internal services (e.g. 169.254.169.254).",
            "evidence": f"Suspicious parameter in query string: {qs}",
            "remediation": "Allowlist outbound hosts/schemes. Block private/link-local IP ranges. Resolve and re-validate after DNS lookup.",
            "cvss": 8.2,
        })
    return findings

def scan_misconfig(url: str) -> list[dict]:
    findings = []
    code, headers, _ = _fetch(url)
    h = {k.lower(): v for k, v in headers.items()}
    missing = []
    for hdr in ["content-security-policy", "x-frame-options", "strict-transport-security", "x-content-type-options"]:
        if hdr not in h:
            missing.append(hdr)
    if missing:
        findings.append({
            "type": "Security Misconfiguration", "severity": "medium",
            "title": "Missing security headers",
            "url": url,
            "description": "One or more recommended HTTP security headers are not set by the target.",
            "evidence": "Missing: " + ", ".join(missing),
            "remediation": "Configure CSP, X-Frame-Options=DENY, HSTS, X-Content-Type-Options=nosniff at the web server / framework.",
            "cvss": 5.3,
        })
    if "server" in h and re.search(r"\d", h["server"]):
        findings.append({
            "type": "Security Misconfiguration", "severity": "low",
            "title": "Server version disclosure",
            "url": url,
            "description": f"Server banner reveals software version: {h['server']}",
            "evidence": f"Server: {h['server']}",
            "remediation": "Suppress or generalize the Server response header.",
            "cvss": 3.1,
        })
    return findings

def scan_broken_auth(url: str) -> list[dict]:
    findings = []
    base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
    login_url = urljoin(base, "/login")
    code, headers, body = _fetch(login_url)
    if code == 0: return findings
    h = {k.lower(): v for k, v in headers.items()}
    sc = h.get("set-cookie", "")
    if sc and "secure" not in sc.lower():
        findings.append({
            "type": "Broken Authentication", "severity": "high",
            "title": "Session cookie without Secure flag",
            "url": login_url,
            "description": "Session cookie was issued without the Secure flag, allowing transmission over plain HTTP.",
            "evidence": f"Set-Cookie: {sc[:200]}",
            "remediation": "Set Secure, HttpOnly and SameSite attributes on all session cookies. Enforce HTTPS site-wide.",
            "cvss": 7.5,
        })
    if "login" in body.lower() and "captcha" not in body.lower():
        findings.append({
            "type": "Broken Authentication", "severity": "medium",
            "title": "No rate-limit / CAPTCHA on login",
            "url": login_url,
            "description": "Login endpoint does not appear to use CAPTCHA. Combined with no observed rate-limit, this enables credential stuffing.",
            "evidence": "Login page reachable; no CAPTCHA markers detected.",
            "remediation": "Add per-IP and per-account rate-limits, account lockout, and CAPTCHA after failed attempts.",
            "cvss": 5.9,
        })
    return findings

SCANNERS = [
    ("SQLi",                     scan_sqli),
    ("XSS",                      scan_xss),
    ("CSRF",                     scan_csrf),
    ("SSRF",                     scan_ssrf),
    ("Security Misconfiguration",scan_misconfig),
    ("Broken Authentication",    scan_broken_auth),
]

def run_all_scanners(url: str, on_progress=None):
    """Yields (detector_name, findings) tuples."""
    total = len(SCANNERS)
    for i, (name, fn) in enumerate(SCANNERS, 1):
        try:
            findings = fn(url)
        except Exception as e:
            findings = []
            if on_progress: on_progress(name, i, total, error=str(e))
            continue
        if on_progress: on_progress(name, i, total)
        yield name, findings
