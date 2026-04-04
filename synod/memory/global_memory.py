import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from .embedder import Embedder
from synod.firebase.firebase_init import db_client
from google.cloud.firestore_v1.vector import Vector
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure

load_dotenv()
logger = logging.getLogger(__name__)

class GlobalMemory:
    def __init__(self) -> None:
        self.embedder = Embedder()
        self.db = db_client

    def store_memory(self, text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Stores text and its embedding into Firestore."""
        try:
            embedding = self.embedder.embed(text)
            if not embedding:
                logger.error("Failed to generate embedding. Memory not stored.")
                return False
                
            data = {
                "content": text,
                "embedding": Vector(embedding),
                "metadata": metadata or {}
            }
            
            self.db.collection("global_memories").add(data)
            logger.info("Successfully stored memory in Firestore.")
            return True
        except Exception as e:
            logger.error(f"Failed to store memory in Firestore: {e}")
            return False

    def search_memory(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Searches for similar memories using Firestore Vector Search."""
        try:
            query_embedding = self.embedder.embed(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding. Returning empty results.")
                return []
                
            collection = self.db.collection("global_memories")
            vector_query = collection.find_nearest(
                vector_field="embedding",
                query_vector=Vector(query_embedding),
                distance_measure=DistanceMeasure.COSINE,
                limit=top_k
            )
            
            results = []
            for doc in vector_query.stream():
                doc_dict = doc.to_dict()
                # Remove the Vector object before returning to avoid serialization issues
                if "embedding" in doc_dict:
                    del doc_dict["embedding"]
                results.append(doc_dict)
                
            return results
        except Exception as e:
            logger.error(f"Failed to search memory in Firestore: {e}")
            return []
