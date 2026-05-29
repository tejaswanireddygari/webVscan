from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl, Field
from sqlalchemy.orm import Session
from typing import Literal, Optional
from io import BytesIO
import asyncio
from ..database import get_db
from ..models.scan import Scan, Vulnerability
from ..models.user import User
from ..auth.security import get_current_user
from ..services.scan_runner import run_scan
from ..reports.pdf import build_report

router = APIRouter(prefix="/scans", tags=["scans"])

class ScanIn(BaseModel):
    target_url: HttpUrl
    profile: Literal["quick", "full", "ai"] = "full"

class VulnOut(BaseModel):
    id: int; type: str; severity: str; title: str; url: str
    description: str; evidence: Optional[str]; remediation: str
    cvss: float; ml_confidence: float; ai_insight: Optional[str]
    class Config: from_attributes = True

class ScanOut(BaseModel):
    id: int; target_url: str; profile: str; status: str; progress: int
    started_at: str; finished_at: Optional[str] = None
    summary: Optional[dict] = None

    @classmethod
    def from_model(cls, s: Scan):
        return cls(
            id=s.id, target_url=s.target_url, profile=s.profile, status=s.status,
            progress=s.progress or 0,
            started_at=s.started_at.isoformat() if s.started_at else "",
            finished_at=s.finished_at.isoformat() if s.finished_at else None,
            summary=s.summary,
        )

class ScanDetail(ScanOut):
    vulnerabilities: list[VulnOut]

@router.post("", response_model=ScanOut)
def create_scan(data: ScanIn, bg: BackgroundTasks,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = Scan(user_id=user.id, target_url=str(data.target_url), profile=data.profile, status="queued")
    db.add(s); db.commit(); db.refresh(s)
    # Schedule the async scan task
    bg.add_task(_kickoff, s.id)
    return ScanOut.from_model(s)

def _kickoff(scan_id: int):
    asyncio.run(run_scan(scan_id))

@router.get("", response_model=list[ScanOut])
def list_scans(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Scan).filter(Scan.user_id == user.id).order_by(Scan.id.desc()).all()
    return [ScanOut.from_model(s) for s in rows]

@router.get("/{scan_id}", response_model=ScanDetail)
def get_scan(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user.id).first()
    if not s: raise HTTPException(404, "Scan not found")
    base = ScanOut.from_model(s).model_dump()
    base["vulnerabilities"] = [VulnOut.model_validate(v) for v in s.vulnerabilities]
    return base

@router.get("/{scan_id}/report.pdf")
def download_report(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user.id).first()
    if not s: raise HTTPException(404, "Scan not found")
    pdf = build_report(s, s.vulnerabilities)
    return StreamingResponse(BytesIO(pdf), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="scan_{scan_id}_report.pdf"'})
