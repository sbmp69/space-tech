import os
from supabase import create_client, Client, ClientOptions
from sentence_transformers import SentenceTransformer

# Load the model globally so it doesn't reload on every request
embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

from dotenv import load_dotenv
load_dotenv()

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    opts = ClientOptions(postgrest_client_timeout=30, schema="public")
    return create_client(url, key, options=opts)

def get_embedding(text: str) -> list[float]:
    # all-MiniLM-L6-v2 produces a 384-dimensional vector
    embedding = embedding_model.encode(text)
    return embedding.tolist()

def retrieve_knowledge(query: str, limit: int = 5):
    supabase = get_supabase_client()
    query_embedding = get_embedding(query)
    
    response = supabase.rpc("match_knowledge_chunks", {
        "query_embedding": query_embedding,
        "match_threshold": -1.0,
        "match_count": limit
    }).execute()
    
    # Fallback: if somehow still empty, just grab the first few rows
    if not response.data:
        fallback = supabase.table("knowledge_chunks").select("*").limit(limit).execute()
        return fallback.data
        
    return response.data
