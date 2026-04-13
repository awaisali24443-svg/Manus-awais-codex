import os
import httpx
import logging
logger = logging.getLogger(__name__)

class QwenAgent:
    """
    Qwen 2.5 Coder (32B) — Coding, software engineering, and debugging.
    Uses HF_QWEN_API_KEY.
    """
    def __init__(self):
        self.api_key = os.getenv("HF_QWEN_API_KEY")
        self.model = "Qwen/Qwen2.5-Coder-32B-Instruct"
        # FIXED: BUG 19 - Use OpenAI-compatible Messages API via HF router
        self.api_url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        } if self.api_key else {}
        self.timeout = 60.0
        
    async def generate_code(self, task: str, context: str, image_data: str = None) -> str:
        if not self.api_key:
            raise ValueError("HF_QWEN_API_KEY not set.")
            
        async with httpx.AsyncClient() as client:
            # FIXED: BUG 20 - Correct payload structure for Messages API
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": f"You are a world-class software engineer. Use ReAct format: <thought>, <tool_call>, <task_completed>.\nContext: {context}"},
                    {"role": "user", "content": task}
                ],
                "max_tokens": 2000,
                "stream": False
            }
            response = await client.post(self.api_url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
