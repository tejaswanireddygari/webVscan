"""Background scan orchestrator + WebSocket broadcast."""
from __future__ import annotations
import asyncio, json
from datetime import datetime
from collections import defaultdict
from ..database import SessionLocal
from ..models.scan import Scan, Vulnerability
from ..scanners import run_all_scanners
from ..ml import predictor

# scan_id -> set[WebSocket]
_subscribers: dict[int, set] = defaultdict(set)

def subscribe(scan_id: int, ws):
    _subscribers[scan_id].add(ws)

def unsubscribe(scan_id: int, ws):
    _subscribers[scan_id].discard(ws)

async def _broadcast(scan_id: int, payload: dict):
    dead = []
    for ws in list(_subscribers.get(scan_id, [])):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        _subscribers[scan_id].discard(ws)

async def run_scan(scan_id: int):
    """Background task: runs scanners, persists findings, broadcasts progress."""
    loop = asyncio.get_event_loop()
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan: return
        scan.status = "running"; db.commit()
        await _broadcast(scan_id, {"event": "started", "scan_id": scan_id})

        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        total_findings = 0

        async def progress_async(name, i, total, error=None):
            scan.progress = int(i / total * 100); db.commit()
            await _broadcast(scan_id, {
                "event": "warn" if error else "progress",
                "detector": name, "progress": scan.progress,
                **({"error": error} if error else {}),
            })

        def on_progress(name, i, total, error=None):
            asyncio.run_coroutine_threadsafe(progress_async(name, i, total, error), loop)

        # Run synchronous scanners off the event loop
        def do_scan():
            return list(run_all_scanners(scan.target_url, on_progress=on_progress))

        results = await loop.run_in_executor(None, do_scan)

        for detector, findings in results:
            for f in findings:
                confidence, algo = predictor.predict(f["type"], f.get("evidence") or f["description"])
                v = Vulnerability(
                    scan_id=scan.id,
                    type=f["type"], severity=f["severity"], title=f["title"],
                    url=f["url"], description=f["description"],
                    evidence=f.get("evidence"), remediation=f["remediation"],
                    cvss=f.get("cvss", 0.0), ml_confidence=confidence,
                    ai_insight=f"ML ({algo}) confidence: {confidence:.2%}",
                )
                db.add(v)
                counts[f["severity"]] = counts.get(f["severity"], 0) + 1
                total_findings += 1

        scan.status = "completed"; scan.progress = 100
        scan.finished_at = datetime.utcnow()
        scan.summary = {"counts": counts, "total": total_findings}
        db.commit()
        await _broadcast(scan_id, {"event": "completed", "scan_id": scan_id, "summary": scan.summary})
    except Exception as e:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "failed"; scan.summary = {"error": str(e)}
            db.commit()
        await _broadcast(scan_id, {"event": "failed", "scan_id": scan_id, "error": str(e)})
    finally:
        db.close()
