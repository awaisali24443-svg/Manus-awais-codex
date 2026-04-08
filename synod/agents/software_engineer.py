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
        # Updated to April 2026 flagship model
        self.model = "claude-4-6-sonnet"
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

    async def generate_code(self, task: str, context: str, image_data: str = None) -> str:
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
            "Available tools: run_bash(command: str), run_python(code: str), web_search(query: str), read_file(path: str), "
            "write_file(path: str, content: str), edit_file(path: str, target: str, replacement: str), "
            "git_operations(action: str, repo_url: str, token: str), "
            "browser_open(url: str), browser_click(selector: str), browser_extract(selector: str). "
            "You have access to a persistent Linux container with Node.js, npm, and Python 3. "
            "Use run_bash to install dependencies (e.g., 'npm install'), start servers in the background (e.g., 'nohup npm run dev > server.log 2>&1 &'), and manage the project. "
            "If you start a server on port 3000, you can view it using browser_open('http://localhost:3000'). "
            "CRITICAL RULES FOR OUTPUT QUALITY:\n"
            "1. NEVER use write_file to make small changes to large files. ALWAYS use edit_file to prevent code truncation. The 'target' must be an exact substring match.\n"
            "2. ALWAYS verify your code by running it (via run_bash or run_python) or linting it before calling <task_completed>. Never assume code works without testing.\n"
            "Strict ReAct output format:\n"
            "<thought>\n[Reasoning]\n</thought>\n"
            "<tool_call>\n{\"name\": \"tool_name\", \"params\": {...}}\n</tool_call>\n"
            "When task step is fully complete and VERIFIED, output:\n"
            "<thought>\n[Final reasoning]\n</thought>\n"
            "<task_completed>\n[Summary]\n</task_completed>\n"
            "If you discover the current plan is fundamentally flawed or you are stuck, you can rewrite the remaining plan using:\n"
            "<replan>\n{\"steps\": [\"new step 1\", \"new step 2\"]}\n</replan>"
        )
        prompt = f"Context:\n{context}\n\nTask:\n{task}"

        if image_data:
            content = [
                {"type": "text", "text": prompt},
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}}
            ]
        else:
            content = prompt

        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": content}
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
