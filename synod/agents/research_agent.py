import os
import logging
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class ResearchAgent:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY")
        # Updated to April 2026 Llama 4 405B
        self.model = "llama-4-405b-preview"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.timeout = 30.0

    async def research(self, query: str, context: str) -> str:
        """Performs research, summarization, and handles large context."""
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set.")

        logger.info(f"ResearchAgent researching query: {query[:50]}...")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = [
            {
                "role": "system", 
                "content": (
                    "You are a Research Agent. Your job is to analyze large contexts, summarize information, and provide detailed research reports. "
                    "Available tools: run_python(code: str), web_search(query: str), read_file(path: str), "
                    "write_file(path: str, content: str), git_operations(action: str, repo_url: str, token: str), "
                    "browser_open(url: str), browser_click(selector: str), browser_extract(selector: str). "
                    "Strict ReAct output format:\n"
                    "<thought>\n[Reasoning]\n</thought>\n"
                    "<tool_call>\n{\"name\": \"tool_name\", \"params\": {...}}\n</tool_call>\n"
                    "When task step is fully complete, output:\n"
                    "<thought>\n[Final reasoning]\n</thought>\n"
                    "<task_completed>\n[Summary]\n</task_completed>\n"
                    "If you discover the current plan is fundamentally flawed or you are stuck, you can rewrite the remaining plan using:\n"
                    "<replan>\n{\"steps\": [\"new step 1\", \"new step 2\"]}\n</replan>"
                )
            },
            {
                "role": "user", 
                "content": f"Context:\n{context}\n\nQuery:\n{query}"
            }
        ]

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred during ResearchAgent API call: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error occurred during ResearchAgent API call: {e}")
            raise
