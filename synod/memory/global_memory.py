import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from .embedder import Embedder
from synod.firebase.firebase_init import supabase_client

load_dotenv()
logger = logging.getLogger(__name__)

class GlobalMemory:
    def __init__(self) -> None:
        self.embedder = Embedder()
        self.supabase = supabase_client

    def store_memory(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Stores text and its embedding into Supabase."""
        if not self.supabase:
            logger.warning("Supabase not configured. Memory not stored.")
            return False
            
        try:
            embedding = self.embedder.embed(text)
            if not embedding:
                logger.error("Failed to generate embedding. Memory not stored.")
                return False
                
            data = {
                "content": text,
                "embedding": embedding,
                "metadata": metadata or {}
            }
            
            self.supabase.table("global_memories").insert(data).execute()
            logger.info("Successfully stored memory in Supabase.")
            return True
        except Exception as e:
            logger.error(f"Failed to store memory in Supabase: {e}")
            return False

    def search_memory(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Searches for similar memories using Supabase pgvector."""
        if not self.supabase:
            logger.warning("Supabase not configured. Returning empty results.")
            return []
            
        try:
            query_embedding = self.embedder.embed(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding. Returning empty results.")
                return []
                
            # Call the match_memories RPC function
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": 0.5,
                "match_count": top_k
            }
            
            response = self.supabase.rpc("match_memories", rpc_params).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to search memory in Supabase: {e}")
            return []
