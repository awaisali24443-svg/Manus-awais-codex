import asyncio
from typing import List, Optional
from dataclasses import dataclass, field
from enum import Enum

class QueueItemStatus(Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"

@dataclass
class QueueItem:
    queue_id: str       # unique per-item ID
    batch_id: str       # groups items together
    goal: str
    position: int       # order in batch
    status: QueueItemStatus = QueueItemStatus.QUEUED
    task_id: str = ""   # set when task actually starts

class TaskQueue:
    def __init__(self):
        # In-memory queue: batch_id -> List[QueueItem]
        self._queues: dict[str, List[QueueItem]] = {}
        self._lock = asyncio.Lock()
        
    async def add_batch(self, goals: List[str]) -> str:
        """Add up to 10 goals as a batch. Returns batch_id."""
        if len(goals) > 10:
            raise ValueError("Maximum 10 prompts per batch")
        import uuid
        batch_id = str(uuid.uuid4())
        items = [
            QueueItem(
                queue_id=str(uuid.uuid4()),
                batch_id=batch_id,
                goal=goal,
                position=i
            )
            for i, goal in enumerate(goals)
        ]
        async with self._lock:
            self._queues[batch_id] = items
        return batch_id
        
    async def get_batch_status(self, batch_id: str) -> dict:
        """Get status of all items in a batch."""
        items = self._queues.get(batch_id, [])
        return {
            "batch_id": batch_id,
            "total": len(items),
            "queued": sum(1 for i in items if i.status == QueueItemStatus.QUEUED),
            "running": sum(1 for i in items if i.status == QueueItemStatus.RUNNING),
            "complete": sum(1 for i in items if i.status == QueueItemStatus.COMPLETE),
            "failed": sum(1 for i in items if i.status == QueueItemStatus.FAILED),
            "items": [
                {
                    "position": i.position,
                    "goal": i.goal,
                    "status": i.status.value,
                    "task_id": i.task_id
                }
                for i in sorted(items, key=lambda x: x.position)
            ]
        }
        
    async def get_next_queued(self, batch_id: str) -> Optional[QueueItem]:
        """Get next QUEUED item in a batch."""
        items = self._queues.get(batch_id, [])
        for item in sorted(items, key=lambda x: x.position):
            if item.status == QueueItemStatus.QUEUED:
                return item
        return None
        
    async def mark_running(self, batch_id: str, queue_id: str, task_id: str):
        items = self._queues.get(batch_id, [])
        for item in items:
            if item.queue_id == queue_id:
                item.status = QueueItemStatus.RUNNING
                item.task_id = task_id
                break
                
    async def mark_complete(self, batch_id: str, queue_id: str):
        items = self._queues.get(batch_id, [])
        for item in items:
            if item.queue_id == queue_id:
                item.status = QueueItemStatus.COMPLETE
                break
                
    async def mark_failed(self, batch_id: str, queue_id: str):
        items = self._queues.get(batch_id, [])
        for item in items:
            if item.queue_id == queue_id:
                item.status = QueueItemStatus.FAILED
                break
