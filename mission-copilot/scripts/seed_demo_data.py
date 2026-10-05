import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def seed_database():
    print("Seeding Demo Data for ST-10...")
    mission_id = "ST10-DEMO-001"
    
    # 1. Create Mission
    supabase.table("missions").upsert({
        "mission_id": mission_id,
        "name": "ST-10 Demonstration Mission",
        "spacecraft_name": "ORBITER-X1",
        "mission_type": "Earth Observation",
        "orbit_type": "LEO",
        "operator_name": "Mission Control Operator",
        "status": "LIVE",
        "dataset": "Synthetic Mission Dataset",
        "scenario": "Solar Panel Shading",
        "started_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # 2. Add some telemetry
    now = datetime.now(timezone.utc)
    t_minus_3 = now - timedelta(minutes=3)
    
    supabase.table("telemetry").insert([
        {"mission_id": mission_id, "timestamp": t_minus_3.isoformat(), "subsystem": "POWER", "parameter": "solar_voltage", "value": 32.0, "unit": "V", "is_anomaly": False},
        {"mission_id": mission_id, "timestamp": now.isoformat(), "subsystem": "POWER", "parameter": "solar_voltage", "value": 18.2, "unit": "V", "is_anomaly": True},
    ]).execute()
    
    print("Telemetry seeded.")

    # 3. Create Knowledge Chunks (RAG Database)
    chunks = [
        {
            "source_id": "TLM-PWR4421",
            "source_type": "TELEMETRY",
            "content": "At 14:30–14:35 UTC, solar panel SP2 voltage averaged 18.2V, representing a significant decrease from baseline. Eclipse flag FALSE. AOCS attitude changed by 7.4 degrees.",
            "subsystem": "POWER",
            "severity": "CRITICAL"
        },
        {
            "source_id": "LOG-1103",
            "source_type": "LOG",
            "content": "AOCS attitude adjustment performed. Roll changed by 7.4 degrees to avoid debris, causing partial shading of solar panels.",
            "subsystem": "AOCS",
            "severity": "INFO"
        },
        {
            "source_id": "PROC-PWR-02",
            "source_type": "PROCEDURE",
            "content": "POWER ANOMALY PROCEDURE: If solar voltage drops below 20V outside of eclipse, verify AOCS attitude. If shaded, correct attitude or reduce payload power consumption immediately.",
            "subsystem": "POWER",
            "severity": "INFO"
        },
        {
            "source_id": "INC-2024-047",
            "source_type": "INCIDENT",
            "content": "Historical Incident: AOCS rotation caused solar panel shading, resulting in battery drain. Resolved by reverting attitude adjustment.",
            "subsystem": "POWER",
            "severity": "WARNING"
        }
    ]
    
    for chunk in chunks:
        embedding = model.encode(chunk["content"]).tolist()
        supabase.table("knowledge_chunks").insert({
            "source_id": chunk["source_id"],
            "source_type": chunk["source_type"],
            "content": chunk["content"],
            "embedding": embedding,
            "timestamp": now.isoformat(),
            "subsystem": chunk["subsystem"],
            "severity": chunk["severity"]
        }).execute()
        
    print("Knowledge Chunks seeded with Embeddings.")
    print("Database is ready for the demo!")

if __name__ == "__main__":
    seed_database()
