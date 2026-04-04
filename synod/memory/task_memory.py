import logging
import time
from typing import Dict, Any, List
from synod.firebase.firebase_init import rtdb_client, supabase_client

logger = logging.getLogger(__name__)

class TaskMemory:
    def __init__(self) -> None:
        self.rtdb = rtdb_client
        self.supabase = supabase_client

    def save_event(self, task_id: str, event_type: str, content: str, agent: str) -> None:
        """Appends a new event to the task's event stream in RTDB."""
        try:
            event = {
                "type": event_type,
                "timestamp": time.time(),
                "content": content,
                "agent": agent
            }
            # Store in RTDB
            events_ref = self.rtdb.reference(f"tasks/{task_id}/events")
            events_ref.push(event)
            logger.info(f"Appended event to task memory for task_id: {task_id}")
        except Exception as e:
            logger.error(f"Error saving event for {task_id}: {e}")

    def save_memory(self, content: str, embedding: List[float], metadata: Dict[str, Any] = None) -> None:
        """Saves a memory to Supabase."""
        if self.supabase:
            try:
                self.supabase.table("global_memories").insert({
                    "content": content,
                    "embedding": embedding,
                    "metadata": metadata or {}
                }).execute()
                logger.info("Saved memory to Supabase")
            except Exception as e:
                logger.error(f"Error saving memory: {e}")
        else:
            logger.warning("Supabase not available")

    def search_memories(self, embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Searches for similar memories in Supabase."""
        if self.supabase:
            try:
                response = self.supabase.rpc(
                    "match_memories",
                    {"query_embedding": embedding, "match_threshold": 0.5, "match_count": limit}
                ).execute()
                return response.data
            except Exception as e:
                logger.error(f"Error searching memories: {e}")
                return []
        else:
            logger.warning("Supabase not available")
            return []

    def load_events(self, task_id: str) -> List[Dict[str, Any]]:
        """Loads all events for a task from RTDB."""
        try:
            events_ref = self.rtdb.reference(f"tasks/{task_id}/events")
            events_data = events_ref.get()
            if not events_data:
                return []
            
            # Convert dict of dicts to sorted list
            events_list = list(events_data.values())
            events_list.sort(key=lambda x: x.get("timestamp", 0))
            return events_list
        except Exception as e:
            logger.error(f"Error loading events for {task_id}: {e}")
            return []

    def get_compressed_history(self, task_id: str) -> str:
        """Returns compressed history of older events and raw recent events."""
        events = self.load_events(task_id)
        if not events:
            return ""
            
        recent_events = events[-20:]
        older_events = events[:-20]
        
        history = ""
        if older_events:
            # In a real implementation, this would call ResearchAgent to summarize
            # For now, we just truncate
            history += f"[Compressed History: {len(older_events)} older events omitted...]\n\n"
            
        history += "--- Recent Events ---\n"
        for event in recent_events:
            history += f"[{event['type'].upper()}] ({event['agent']}): {event['content']}\n"
            
        return history

    def clear(self, task_id: str) -> None:
        """Clears memory for a specific task."""
        try:
            self.rtdb.reference(f"tasks/{task_id}/events").delete()
            logger.info(f"Cleared task memory for task_id: {task_id}")
        except Exception as e:
            logger.error(f"Error clearing task memory for {task_id}: {e}")
