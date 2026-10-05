-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    spacecraft_name TEXT NOT NULL,
    mission_type TEXT,
    orbit_type TEXT,
    operator_name TEXT,
    status TEXT NOT NULL,
    dataset TEXT,
    scenario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subsystem TEXT,
    parameter TEXT,
    value FLOAT,
    unit TEXT,
    is_anomaly BOOLEAN DEFAULT FALSE
);

CREATE TABLE mission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    source_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    subsystem TEXT,
    severity TEXT,
    message TEXT,
    metadata JSONB
);

CREATE TABLE procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT,
    title TEXT,
    subsystem TEXT,
    content TEXT,
    step_number INT,
    metadata JSONB
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT UNIQUE NOT NULL,
    mission_id TEXT REFERENCES missions(mission_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subsystem TEXT,
    anomaly TEXT,
    root_cause TEXT,
    resolution TEXT,
    content TEXT,
    metadata JSONB,
    status TEXT
);

CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT,
    source_type TEXT,
    content TEXT,
    embedding vector(384),
    timestamp TIMESTAMP WITH TIME ZONE,
    subsystem TEXT,
    severity TEXT,
    metadata JSONB
);

CREATE TABLE anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subsystem TEXT,
    parameter TEXT,
    severity TEXT,
    description TEXT,
    status TEXT,
    confidence FLOAT
);

CREATE TABLE copilot_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    query TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observed_fact JSONB,
    analysis JSONB,
    recommendation JSONB,
    confidence FLOAT,
    status TEXT
);

CREATE TABLE evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES copilot_queries(id),
    source_id TEXT,
    source_type TEXT,
    relevance_score FLOAT,
    excerpt TEXT
);

CREATE TABLE incident_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    incident_id TEXT REFERENCES incidents(incident_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT
);

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID REFERENCES incident_timelines(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type TEXT,
    description TEXT,
    source_id TEXT,
    actor TEXT,
    operator_note TEXT,
    recommendation JSONB,
    status TEXT
);

CREATE TABLE operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID REFERENCES incident_timelines(id),
    operator TEXT,
    action TEXT,
    decision TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment TEXT
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES missions(mission_id),
    event_type TEXT,
    actor TEXT,
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION match_knowledge_chunks (
  query_embedding vector(384),
  match_count int,
  match_threshold float DEFAULT 0.0
)
RETURNS TABLE (
  id uuid,
  source_id text,
  source_type text,
  content text,
  "timestamp" timestamp with time zone,
  subsystem text,
  severity text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_chunks.id,
    knowledge_chunks.source_id,
    knowledge_chunks.source_type,
    knowledge_chunks.content,
    knowledge_chunks.timestamp,
    knowledge_chunks.subsystem,
    knowledge_chunks.severity,
    knowledge_chunks.metadata,
    1 - (knowledge_chunks.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
