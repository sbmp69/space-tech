# ST-10 — Mission Operations Copilot

An evidence-grounded mission operations decision-support system for satellite ground operators. This system is designed to provide actionable intelligence, correlate anomalies with telemetry, logs, and procedures, and present recommendations to operators with high confidence and full traceability.

## Features

- **Live Telemetry Simulator:** Real-time data streaming and simulation controls.
- **Anomaly Detection:** Rule-based and statistical anomaly detection mechanisms.
- **Evidence-Grounded AI Copilot:** RAG-powered decision support that only uses retrieved context (no hallucinations).
- **Incident Timeline:** Auditable trails of AI recommendations and operator decisions.
- **Aerospace UI:** Professional dark-themed control center dashboard.

## Architecture

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Python 3.11+, FastAPI, WebSockets
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI/LLM:** OpenAI API
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2`

## Prerequisites

- Node.js (v18+)
- Python 3.11+
- Supabase CLI or cloud project
- OpenAI API Key

## Setup Instructions

### 1. Supabase & Database

Copy `.env.example` to `.env` in the root folder and populate the credentials.
Ensure pgvector is enabled on your Supabase instance.
Run migrations:
```bash
cd supabase
# Execute the migration scripts in your Supabase SQL editor or via CLI
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Data Generation & Ingestion

Run the synthetic data generators to seed your system:
```bash
python scripts/generate_dataset.py
python scripts/ingest_documents.py
```

### 4. Running the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Demo Flow

1. Click **+ CREATE MISSION** and initialize a test mission.
2. Click **START MISSION** to begin telemetry streaming.
3. Observe live telemetry and wait for the "Solar Panel Shading" anomaly to trigger.
4. Click **INVESTIGATE** on the anomaly alert.
5. In the Copilot, ask: *"Why did solar panel voltage drop?"*
6. Review the AI's Observed Facts, Analysis, and Recommendations.
7. Click the generated citations to verify the evidence (Telemetry + Logs + Procedures).
8. **Approve** the recommendation and review the generated **Incident Timeline**.
9. Test the hallucination defense by asking an unanswerable question like *"What was the spacecraft's fuel pressure at 11:47 on March 3, 2022?"* (The system should respond with **INSUFFICIENT EVIDENCE**).
