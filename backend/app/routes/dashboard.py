from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import Counter
from ..database import get_db
from ..models.scan import Scan, Vulnerability
from ..models.user import User
from ..auth.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scans = db.query(Scan).filter(Scan.user_id == user.id).all()
    scan_ids = [s.id for s in scans]
    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id.in_(scan_ids)).all() if scan_ids else []
    sev = Counter(v.severity for v in vulns)
    typ = Counter(v.type for v in vulns)
    return {
        "total_scans": len(scans),
        "completed": sum(1 for s in scans if s.status == "completed"),
        "running":   sum(1 for s in scans if s.status in ("running", "queued")),
        "severity_counts": {k: sev.get(k, 0) for k in ["critical","high","medium","low","info"]},
        "type_counts": dict(typ),
    }
