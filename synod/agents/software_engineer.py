import os
import time
import asyncio
import logging
import httpx
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class SoftwareEngineer:
    def __init__(self) -> None:
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = "claude-sonnet-4-5"
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.timeout = 30.0
        
        # Rate limiting: 5 RPM = 1 request every 12 seconds
        self.rate_limit_delay = 12.0
        self.last_request_time = 0.0

    async def _enforce_rate_limit(self) -> None:
        """Ensures we do not exceed 5 requests per minute."""
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - elapsed
            logger.info(f"SoftwareEngineer rate limit active. Sleeping for {sleep_time:.2f}s")
            await asyncio.sleep(sleep_time)
        self.last_request_time = time.time()

    async def generate_code(self, task: str, context: str) -> str:
        """Generates final code based on task and context."""
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set.")

        await self._enforce_rate_limit()
        logger.info(f"SoftwareEngineer generating code for task: {task[:50]}...")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        system_prompt = (
            "You are an expert Software Engineer. Generate production-ready code based on the task and context. "
            "Available tools: run_python(code: str), web_search(query: str), read_file(path: str), "
            "write_file(path: str, content: str), git_operations(action: str, repo_url: str, token: str), "
            "browser_open(url: str), browser_click(selector: str), browser_extract(selector: str). "
            "Strict ReAct output format:\n"
            "<thought>\n[Reasoning]\n</thought>\n"
            "<tool_call>\n{\"name\": \"tool_name\", \"params\": {...}}\n</tool_call>\n"
            "When task step is fully complete, output:\n"
            "<thought>\n[Final reasoning]\n</thought>\n"
            "<task_completed>\n[Summary]\n</task_completed>"
        )
        prompt = f"Context:\n{context}\n\nTask:\n{task}"

        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["content"][0]["text"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred during SoftwareEngineer API call: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error occurred during SoftwareEngineer API call: {e}")
            raise
