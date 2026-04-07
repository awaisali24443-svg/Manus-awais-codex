import os
import httpx
import logging
logger = logging.getLogger(__name__)

class QwenAgent:
    """
    Qwen 3.5 (35B) — Coding, software engineering, and debugging.
    Uses HF_QWEN_API_KEY.
    """
    def __init__(self):
        self.api_key = os.getenv("HF_QWEN_API_KEY")
        self.model = "Qwen/Qwen2.5-Coder-32B-Instruct"
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        self.timeout = 60.0
        
    async def generate_code(self, task: str, context: str, image_data: str = None) -> str:
        if not self.api_key:
            raise ValueError("HF_QWEN_API_KEY not set.")
            
        async with httpx.AsyncClient() as client:
            payload = {
                "inputs": f"<|im_start|>system\nYou are a world-class software engineer. Use ReAct format: <thought>, <tool_call>, <task_completed>.\nContext: {context}<|im_end|>\n<|im_start|>user\n{task}<|im_end|>\n<|im_start|>assistant\n<thought>",
                "parameters": {"max_new_tokens": 2000, "return_full_text": False, "stop": ["<|im_end|>"]}
            }
            response = await client.post(self.api_url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            # If it's a list of results
            if isinstance(result, list):
                return "<thought>" + result[0]["generated_text"]
            return "<thought>" + result["generated_text"]
