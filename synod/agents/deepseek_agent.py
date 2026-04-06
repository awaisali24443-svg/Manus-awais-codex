import os, httpx, logging
logger = logging.getLogger(__name__)

class DeepSeekAgent:
    """
    DeepSeek R1 — dedicated to complex reasoning,
    mathematical problems, algorithm design,
    and multi-step logical deduction.
    """
    def __init__(self):
        # DeepSeek API via Groq (deepseek-r1-distill-llama-70b)
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = "deepseek-r1-distill-llama-70b"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.timeout = 60.0  # longer for deep reasoning
        
    async def reason(self, problem: str, context: str) -> str:
        """
        Deep reasoning for complex problems.
        Includes chain-of-thought in the response.
        """
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not set for DeepSeek.")
        
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
            return response.json()["choices"][0]["message"]["content"]
