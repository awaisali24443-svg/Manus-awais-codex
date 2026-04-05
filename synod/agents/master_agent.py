import os
import json
import logging
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv
from synod.memory.global_memory import GlobalMemory

load_dotenv()
logger = logging.getLogger(__name__)

class MasterAgent:
    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = "openai/gpt-oss-120b"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.timeout = 30.0
        self.global_memory = GlobalMemory()

    async def _call_api(self, messages: List[Dict[str, str]], response_format: str = "text") -> str:
        """Helper method to call the Groq API."""
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
        }
        
        if response_format == "json_object":
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred during MasterAgent API call: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error occurred during MasterAgent API call: {e}")
            raise

    async def decompose_task(self, goal: str) -> List[str]:
        """Decomposes a high-level goal into a list of actionable steps."""
        logger.info(f"Decomposing task: {goal}")
        
        # Proactive RAG: Search Global Memory for similar past tasks
        past_context = ""
        try:
            similar_memories = self.global_memory.search_memory(goal, top_k=2)
            if similar_memories:
                past_context = "Here are successful plans from similar past tasks to use as reference:\n"
                for mem in similar_memories:
                    past_context += f"- Past Goal: {mem.get('content', '')}\n"
                    past_context += f"  Past Plan: {mem.get('metadata', {}).get('plan', 'N/A')}\n"
        except Exception as e:
            logger.warning(f"Failed to retrieve global memory for RAG: {e}")

        system_prompt = (
            "You are the Master Agent. Your job is to "
            "decompose the user goal into a clear sequence "
            "of actionable steps. Return ONLY a valid JSON "
            "object with a 'steps' key containing a list "
            "of step description strings. "
            "Example: {\"steps\": [\"Search the web for X\", "
            "\"Write results to file Y\"]}. "
            "Do NOT include any other text, tags, or formatting. "
            "You have access to a persistent cloud VM with "
            "Node.js 20, Python 3, npm, git, and full internet. "
            "When tasks involve building apps or websites, "
            "plan steps that use run_bash to install and run them, "
            "then get_preview_url to expose them publicly."
        )
        
        if past_context:
            system_prompt += f"\n\n{past_context}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": goal}
        ]
        
        try:
            response_text = await self._call_api(messages, response_format="json_object")
            parsed = json.loads(response_text)
            return parsed.get("steps", [])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse task decomposition JSON: {e}")
            return [goal] # Fallback to single step
        except Exception as e:
            logger.error(f"Task decomposition failed: {e}")
            return [goal]

    async def route_step(self, step: str) -> str:
        """Decides which sub-agent should handle the given step."""
        logger.info(f"Routing step: {step}")
        messages = [
            {
                "role": "system", 
                "content": (
                    "You are the Master Agent router. Decide which agent should handle the step. "
                    "Available agents: 'software_engineer' (for writing code), 'logic_agent' (for algorithms/debugging), "
                    "'research_agent' (for information gathering/summarization). "
                    "Respond with ONLY the exact agent name."
                )
            },
            {"role": "user", "content": step}
        ]
        
        try:
            agent_name = await self._call_api(messages)
            agent_name = agent_name.strip().lower()
            valid_agents = ["software_engineer", "logic_agent", "research_agent"]
            if agent_name in valid_agents:
                return agent_name
            logger.warning(f"Invalid agent '{agent_name}' returned. Defaulting to logic_agent.")
            return "logic_agent"
        except Exception as e:
            logger.error(f"Routing failed: {e}")
            return "logic_agent" # Fallback
