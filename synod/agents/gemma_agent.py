import os
import httpx
import logging
logger = logging.getLogger(__name__)

class GemmaAgent:
    """
    Gemma 3 (27B) — General reasoning, planning, and logic.
    Uses HUGGINGFACE_API_KEY.
    """
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.model = "google/gemma-3-27b-it"
        self.api_url = "https://api-inference.huggingface.co/models/google/gemma-3-27b-it/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        } if self.api_key else {}
        self.timeout = 60.0
        
    async def generate(self, task: str, context: str, image_data: str = None) -> str:
        if not self.api_key:
            raise ValueError("HUGGINGFACE_API_KEY not set.")
            
        async with httpx.AsyncClient() as client:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": f"You are a reasoning agent. Use ReAct format: <thought>, <tool_call>, <task_completed>.\nContext: {context}"},
                    {"role": "user", "content": task}
                ],
                "max_tokens": 1000,
                "stream": False
            }
            response = await client.post(self.api_url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
