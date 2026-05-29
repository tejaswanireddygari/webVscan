# Sentinel AI — FastAPI Backend + ML Service

Self-contained Python backend for the Sentinel AI vulnerability scanner
frontend in this repo. The ML service runs **in-process** (no separate
container needed) so the flow is:

```
Frontend  ──HTTP/WS──▶  FastAPI (this backend)  ──in-proc──▶  ML Predictor (scikit-learn)
```

## Algorithms per requirement

| Vulnerability               | ML Algorithm           |
|-----------------------------|------------------------|
| SQL Injection               | RandomForestClassifier |
| XSS                         | MultinomialNB          |
| CSRF                        | DecisionTreeClassifier |
| SSRF                        | RandomForestClassifier |
| Security Misconfiguration   | DecisionTreeClassifier |
| Broken Authentication       | LogisticRegression     |

All six models train on a synthetic signal-bearing corpus at startup and are
cached to `app/ml/models/*.joblib`.

## Run with Docker

```bash
cd backend
docker compose up --build
# → http://localhost:8000/docs
```

## Run locally (no Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Connect the frontend

Create a `.env` in the project root:

```
VITE_API_URL=http://localhost:8000
```

Then in the browser open DevTools console once and run
`localStorage.removeItem('vulnscan_demo')` to leave demo mode.

## API summary

| Method | Path                         | Auth | Purpose                         |
|--------|------------------------------|------|---------------------------------|
| POST   | `/auth/register`             | –    | Create account                  |
| POST   | `/auth/login`                | –    | Get JWT                         |
| GET    | `/auth/me`                   | JWT  | Current user                    |
| POST   | `/scans`                     | JWT  | Start scan (async background)   |
| GET    | `/scans`                     | JWT  | List user scans                 |
| GET    | `/scans/{id}`                | JWT  | Scan + vulnerabilities          |
| GET    | `/scans/{id}/report.pdf`     | JWT  | Download PDF report             |
| GET    | `/dashboard/stats`           | JWT  | Aggregate metrics for dashboard |
| WS     | `/ws/scans/{id}?token=…`     | JWT  | Real-time scan progress         |

## Test the API

```bash
# 1. Register + login
curl -s -X POST http://localhost:8000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@test.com","password":"password123"}'

TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@test.com","password":"password123"}' | jq -r .access_token)

# 2. Start a scan
curl -s -X POST http://localhost:8000/scans \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"target_url":"https://example.com","profile":"full"}'

# 3. Fetch results
curl -s http://localhost:8000/scans/1 -H "authorization: Bearer $TOKEN" | jq .

# 4. Download PDF
curl -s http://localhost:8000/scans/1/report.pdf -H "authorization: Bearer $TOKEN" -o report.pdf
```

## Folder structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + CORS + rate-limit + startup
│   ├── config.py            # Settings (env)
│   ├── database.py          # SQLAlchemy engine/session
│   ├── auth/                # JWT, password hashing, current-user dep
│   ├── models/              # SQLAlchemy models (User, Scan, Vulnerability)
│   ├── routes/              # auth, scans, dashboard, websocket
│   ├── scanners/            # SQLi / XSS / CSRF / SSRF / misconfig / authn
│   ├── ml/                  # scikit-learn predictor (6 algorithms)
│   ├── reports/             # ReportLab PDF generator
│   └── services/            # async scan runner + WS broadcast
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Notes

- Async background scans use FastAPI `BackgroundTasks` driving an `asyncio`
  loop — no Celery/Redis required for single-node deployments. (If you want
  multi-worker, swap `_kickoff` in `routes/scans.py` for a Celery task.)
- Rate limiting is global at 120 req/min/IP via `slowapi`. Tune per-route in
  `routes/*.py` with `@limiter.limit(...)`.
- All inputs validated with Pydantic; URLs validated with `HttpUrl`.
- Bcrypt password hashing; JWT with HS256.
