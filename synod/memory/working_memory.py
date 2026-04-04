import logging
from typing import Dict, Any
from .task_memory import TaskMemory
from .global_memory import GlobalMemory

logger = logging.getLogger(__name__)

class WorkingMemory:
    def __init__(self, task_memory: TaskMemory, global_memory: GlobalMemory) -> None:
        self.task_memory = task_memory
        self.global_memory = global_memory
        self.max_tokens = 6000
        self.chars_per_token = 4  # Rough approximation for token counting

    def build_context(self, task_id: str, system_prompt: str, tool_schemas: str, todo_md_content: str) -> str:
        """Builds the LLM context string from event stream and todo.md."""
        try:
            # Get compressed history and recent events
            event_stream = self.task_memory.get_compressed_history(task_id)
            
            # Search global memory based on recent events
            query_text = event_stream[-1000:]  # Use recent context for query
            global_results = []
            
            if query_text.strip():
                global_results = self.global_memory.search_memory(query_text, top_k=5)
            
            global_context = "\n".join([
                res.get("content", "") for res in global_results if isinstance(res, dict)
            ])
            
            # Assemble raw context with strict ordering for KV-cache optimization
            raw_context = (
                f"{system_prompt}\n\n"
                f"--- AVAILABLE TOOLS ---\n{tool_schemas}\n\n"
                f"--- RELEVANT KNOWLEDGE ---\n{global_context}\n\n"
                f"--- EVENT STREAM ---\n{event_stream}\n\n"
                f"--- CURRENT PLAN (TODO.MD) ---\n{todo_md_content}\n"
            )
            
            max_chars = self.max_tokens * self.chars_per_token
            if len(raw_context) > max_chars:
                # Keep system prompt + tools (first 1000 chars) always
                header = raw_context[:1000]
                # Truncate the middle, keep the end (most recent events)
                tail = raw_context[-(max_chars - 1000):]
                raw_context = header + "\n[...context truncated...]\n" + tail
            
            logger.info(f"Successfully built working memory context for task_id: {task_id}")
            return raw_context
            
        except Exception as e:
            logger.error(f"Error building context for {task_id}: {e}")
            return f"Error building context: {str(e)}"
