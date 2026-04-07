import os
import httpx
import logging
logger = logging.getLogger(__name__)

class GemmaAgent:
    """
    Gemma 4 (31B) — General reasoning, planning, and logic.
    Uses HUGGINGFACE_API_KEY.
    """
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.model = "google/gemma-2-27b-it"
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        self.timeout = 60.0
        
    async def generate(self, task: str, context: str, image_data: str = None) -> str:
        if not self.api_key:
            raise ValueError("HUGGINGFACE_API_KEY not set.")
            
        async with httpx.AsyncClient() as client:
            payload = {
                "inputs": f"<start_of_turn>user\nYou are a reasoning agent. Use ReAct format: <thought>, <tool_call>, <task_completed>.\nContext: {context}\n\nTask: {task}<end_of_turn>\n<start_of_turn>model\n<thought>",
                "parameters": {"max_new_tokens": 1000, "return_full_text": False, "stop": ["<end_of_turn>"]}
            }
            response = await client.post(self.api_url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            if isinstance(result, list):
                return "<thought>" + result[0]["generated_text"]
            return "<thought>" + result["generated_text"]
