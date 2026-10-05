from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio
import json
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

from .rag import retrieve_knowledge
from .reasoning import analyze_telemetry

app = FastAPI(title="ST-10 Mission Operations Copilot")

@app.post("/api/missions")
async def create_mission(mission: dict):
    return {"status": "created", "mission": mission}

@app.get("/api/telemetry")
async def get_telemetry():
    return {"status": "ok", "telemetry": []}

class QueryRequest(BaseModel):
    query: str
    mission_id: str

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import HTTPException
import traceback

@app.post("/api/query")
async def handle_query(req: QueryRequest):
    try:
        print(f"DEBUG: Starting query '{req.query}'")
        print(f"DEBUG: SUPABASE_URL is '{os.environ.get('SUPABASE_URL')}'")
        evidence = retrieve_knowledge(req.query)
        print(f"DEBUG: Retrieved {len(evidence)} evidence chunks.")
        
        analysis = analyze_telemetry(req.query, evidence)
        print(f"DEBUG: OpenAI analysis complete.")
        
        return {"response": analysis, "evidence": evidence}
    except Exception as e:
        error_msg = str(e)
        print(f"DEBUG ERROR: {error_msg}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/evidence")
async def get_evidence():
    from .rag import get_supabase_client
    try:
        supabase = get_supabase_client()
        res = supabase.table("knowledge_chunks").select("id, source_id, source_type, content, timestamp, subsystem, severity").execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeline")
async def get_timeline():
    # Mocking timeline events for the demo based on the seeded data
    events = [
        {"time": "14:00:00 UTC", "title": "Mission Start", "type": "info", "desc": "ST-10 Nominal Operations Commenced"},
        {"time": "14:15:00 UTC", "title": "AOCS Adjustment", "type": "warning", "desc": "Debris detected. AOCS roll adjusted by 7.4 degrees."},
        {"time": "14:30:00 UTC", "title": "Voltage Drop Detected", "type": "critical", "desc": "Solar panel SP2 voltage dropped to 18.2V."},
        {"time": "14:32:05 UTC", "title": "Automated Copilot Trigger", "type": "info", "desc": "Copilot initiated RAG pipeline to diagnose voltage drop."}
    ]
    return {"events": events}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

import random
from datetime import datetime, timezone

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    tick = 0
    voltage = 32.0
    core_temp = 84.2
    life_support = 98.0
    
    try:
        while True:
            await asyncio.sleep(1)
            tick += 1
            
            # Anomaly Trigger: Solar Panel Shading at tick 15
            if tick == 15:
                voltage = 18.2
            elif tick > 15:
                voltage += random.uniform(-0.1, 0.1) # Add noise to anomaly
            else:
                voltage = 32.0 + random.uniform(-0.2, 0.2) # Normal noise
                
            core_temp = 84.2 + random.uniform(-0.5, 0.5)
            life_support -= random.uniform(0.0, 0.05)
            
            payload = {
                "type": "telemetry",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                "data": {
                    "core_temp": round(core_temp, 2),
                    "voltage": round(voltage, 2),
                    "life_support": round(life_support, 2),
                    "is_anomaly": voltage < 20.0
                }
            }
            if websocket not in manager.active_connections:
                break
            try:
                await websocket.send_text(json.dumps(payload))
            except Exception:
                manager.disconnect(websocket)
                break
    except Exception:
        manager.disconnect(websocket)

from .sitrep import generate_sitrep, SitrepRequest

@app.post("/api/sitrep")
async def handle_sitrep(req: SitrepRequest):
    try:
        report = generate_sitrep(req)
        return {"sitrep": report}
    except Exception as e:
        return {"sitrep": "SYSTEM ERROR: Unable to generate SITREP due to API failure."}
