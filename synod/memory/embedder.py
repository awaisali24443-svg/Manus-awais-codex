import os
import logging
import requests
from typing import List
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class Embedder:
    def __init__(self) -> None:
        self.api_key = os.getenv("HF_API_KEY") or os.getenv("HUGGINGFACE_API_KEY")
        self.model_id = "microsoft/harrier-oss-v1-0.6b"
        self.api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model_id}"
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    def embed(self, text: str) -> List[float]:
        """Generates embeddings for the given text using HuggingFace Inference API."""
        if not self.api_key:
            logger.warning("HF_API_KEY not set. Returning empty embedding.")
            return []
            
        try:
            response = requests.post(
                self.api_url, 
                headers=self.headers, 
                json={"inputs": text, "options": {"wait_for_model": True}},
                timeout=10
            )
            response.raise_for_status()
            embedding = response.json()
            
            # The API might return a list of lists depending on the input format
            if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
                return embedding[0]
            return embedding
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error generating embedding: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error generating embedding: {e}")
            return []
