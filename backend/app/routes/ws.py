from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..auth.security import decode_token
from ..database import SessionLocal
from ..models.user import User
from ..models.scan import Scan
from ..services.scan_runner import subscribe, unsubscribe

router = APIRouter(tags=["ws"])

@router.websocket("/ws/scans/{scan_id}")
async def ws_scan(ws: WebSocket, scan_id: int, token: str = Query(default="")):
    await ws.accept()
    sub = decode_token(token)
    if not sub:
        await ws.send_json({"event": "error", "error": "invalid token"}); await ws.close(); return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == sub).first()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not user or not scan or scan.user_id != user.id:
            await ws.send_json({"event": "error", "error": "forbidden"}); await ws.close(); return
        subscribe(scan_id, ws)
        await ws.send_json({"event": "subscribed", "scan_id": scan_id, "status": scan.status, "progress": scan.progress})
        try:
            while True:
                await ws.receive_text()  # keepalive
        except WebSocketDisconnect:
            pass
    finally:
        unsubscribe(scan_id, ws)
        db.close()
