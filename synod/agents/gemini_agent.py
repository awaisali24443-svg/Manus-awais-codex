import os, httpx, logging
logger = logging.getLogger(__name__)

class GeminiAgent:
    """
    Google Gemini 3.1 Pro — versatile generative tasks,
    image understanding, large context processing,
    research synthesis, and content creation.
    """
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = "gemini-1.5-pro"
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        self.timeout = 45.0
        
    async def generate(
        self, 
        task: str, 
        context: str,
        image_data: str = None
    ) -> str:
        """
        Versatile generation — research, content, 
        image analysis, large context processing.
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set.")
        
        system_prompt = (
            "You are Gemini, integrated into Awais Codex autonomous agent. "
            "You excel at: research synthesis, content generation, "
            "image analysis, large document processing, and creative tasks. "
            "Use <thought> tags for reasoning. "
            "Use <tool_call> tags for actions. "
            "Use <task_completed> when done."
        )
        
        parts = [{"text": f"{system_prompt}\n\nContext:\n{context}\n\nTask:\n{task}"}]
        
        if image_data:
            parts.append({
                "inlineData": {
                    "mimeType": "image/png",
                    "data": image_data
                }
            })
        
        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "maxOutputTokens": 8192,
                "temperature": 0.7
            }
        }
        
        url = f"{self.api_url}?key={self.api_key}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
