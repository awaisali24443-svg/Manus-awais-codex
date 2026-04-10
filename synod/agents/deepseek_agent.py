import os, httpx, logging
logger = logging.getLogger(__name__)

class DeepSeekAgent:
    """
    DeepSeek R1 — dedicated to complex reasoning,
    mathematical problems, algorithm design,
    and multi-step logical deduction.
    """
    def __init__(self):
        # True DeepSeek API
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.model = "deepseek-reasoner"
        self.api_url = "https://api.deepseek.com/chat/completions"
        self.timeout = 90.0  # longer for deep reasoning
        
    async def reason(self, problem: str, context: str) -> str:
        """
        Deep reasoning for complex problems.
        Includes chain-of-thought in the response.
        """
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not set.")
        
        system_prompt = (
            "You are DeepSeek R1, a powerful reasoning model. "
            "You specialize in: complex algorithms, mathematical proofs, "
            "debugging logic errors, architecture decisions, and multi-step "
            "reasoning chains. Show your full chain of thought. "
            "Use <thought> tags for reasoning. "
            "Use <tool_call> tags for actions. "
            "Use <task_completed> when done."
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context}\n\nProblem:\n{problem}"}
        ]
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 8192,
            "temperature": 0.1,  # low temp for precise reasoning
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            message = data["choices"][0]["message"]
            content = message.get("content") or ""
            reasoning = message.get("reasoning_content") or ""
            if reasoning and not content.startswith("<thought>"):
                content = f"<thought>{reasoning}</thought>\n{content}"
            return content
