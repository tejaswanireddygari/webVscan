"""
ML threat prediction service.

Per requirement, each vulnerability type uses a dedicated algorithm:
  SQLi                     -> RandomForestClassifier
  XSS                      -> MultinomialNB (Naive Bayes)
  CSRF                     -> DecisionTreeClassifier
  SSRF                     -> RandomForestClassifier
  Security Misconfiguration-> DecisionTreeClassifier
  Broken Authentication    -> LogisticRegression

Each model is trained at startup on a small synthetic labeled dataset so the
service is fully self-contained (no external dataset/download). The training
data captures the heuristic signals our scanners actually emit, so the model
output is a meaningful confidence boost rather than random noise.
"""
from __future__ import annotations
import os, joblib, numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import HashingVectorizer

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# --- Synthetic training corpora (signal-bearing tokens) ----------------------

SQLI_POS = [
    "you have an error in your sql syntax",
    "unclosed quotation mark mysql",
    "ora-00933 sql command not properly ended",
    "warning: mysql_fetch_array()",
    "postgresql query failed",
    "sqlite3.operationalerror near syntax",
]
SQLI_NEG = ["welcome home", "about us page", "contact form submitted", "login success", "404 not found", "products listing"]

XSS_POS = [
    "<script>alert(1)</script> reflected",
    "onerror=alert(document.cookie)",
    "javascript:alert(1) reflected in response",
    "<svg/onload=alert(1)>",
    "img src=x onerror reflected",
    "<iframe src=javascript:alert>",
]
XSS_NEG = ["welcome user", "thanks for subscribing", "your order has shipped", "search results", "blog post body", "checkout complete"]

CSRF_POS = [
    "form post without csrf token",
    "state changing request missing token",
    "no anti csrf header detected",
    "cookie samesite none and no token",
    "post endpoint accepts cross origin",
    "missing x-csrf-token header",
]
CSRF_NEG = ["form contains csrf token hidden", "samesite strict cookie set", "double submit cookie present", "token validated server side", "get request only", "static page"]

SSRF_POS = [
    "request to 169.254.169.254 metadata",
    "internal host 127.0.0.1 fetched",
    "localhost reachable from server",
    "url parameter triggers outbound request to private ip",
    "fetch to file:// scheme",
    "gopher:// scheme accepted",
]
SSRF_NEG = ["external https request to api", "image loaded from cdn", "public api call", "outbound request to google.com", "normal http get", "static asset fetch"]

MISCFG_POS = [
    "x-frame-options header missing",
    "content-security-policy not set",
    "server header reveals version apache 2.2",
    "directory listing enabled",
    "default credentials admin admin",
    "strict-transport-security missing",
]
MISCFG_NEG = ["csp header present strict", "hsts max-age 31536000", "x-frame-options deny", "server header suppressed", "directory listing disabled", "secure cookie flags set"]

AUTH_POS = [
    "session id transmitted over http",
    "no rate limit on login endpoint",
    "weak password accepted 123456",
    "jwt none algorithm accepted",
    "password reset token predictable",
    "missing account lockout policy",
]
AUTH_NEG = ["bcrypt password hashing", "rate limited login 5 attempts", "mfa enforced", "jwt rs256 verified", "secure password reset token random", "account lockout after failures"]

CORPORA = {
    "SQLi":             (SQLI_POS, SQLI_NEG, RandomForestClassifier(n_estimators=40, random_state=0)),
    "XSS":              (XSS_POS, XSS_NEG, MultinomialNB()),
    "CSRF":             (CSRF_POS, CSRF_NEG, DecisionTreeClassifier(random_state=0)),
    "SSRF":             (SSRF_POS, SSRF_NEG, RandomForestClassifier(n_estimators=40, random_state=0)),
    "Security Misconfiguration": (MISCFG_POS, MISCFG_NEG, DecisionTreeClassifier(random_state=0)),
    "Broken Authentication":     (AUTH_POS, AUTH_NEG, LogisticRegression(max_iter=200)),
}

# Hashing vectorizer = stateless, no vocab to persist, always non-negative for NB
VECTORIZER = HashingVectorizer(n_features=512, alternate_sign=False, norm=None)

_models: dict[str, object] = {}

def _train_one(name: str):
    pos, neg, clf = CORPORA[name]
    X = VECTORIZER.transform(pos + neg)
    y = np.array([1] * len(pos) + [0] * len(neg))
    clf.fit(X, y)
    return clf

def load_or_train():
    """Idempotent: trains all six models on first call, caches in-process."""
    if _models:
        return _models
    for name in CORPORA:
        path = os.path.join(MODELS_DIR, f"{name.replace(' ', '_')}.joblib")
        if os.path.exists(path):
            try:
                _models[name] = joblib.load(path); continue
            except Exception:
                pass
        clf = _train_one(name)
        try: joblib.dump(clf, path)
        except Exception: pass
        _models[name] = clf
    return _models

def predict(vuln_type: str, evidence: str) -> tuple[float, str]:
    """Returns (confidence in [0,1], algorithm name used)."""
    models = load_or_train()
    clf = models.get(vuln_type)
    if clf is None:
        return 0.5, "none"
    X = VECTORIZER.transform([evidence or ""])
    try:
        proba = float(clf.predict_proba(X)[0][1])
    except Exception:
        proba = float(clf.predict(X)[0])
    algo = type(clf).__name__
    return max(0.0, min(1.0, proba)), algo
