from typing import Dict, Optional, Any
import uuid
import time
from .state_machine import TaskState, State
from synod.firebase.firebase_init import db_client, rtdb_client

class TaskManager:
    def __init__(self) -> None:
        self.tasks_collection = db_client.collection("tasks")

    def _dict_to_task(self, data: dict) -> TaskState:
        task = TaskState(
            task_id=data.get("task_id", ""),
            goal=data.get("goal", ""),
            current_step=data.get("current_step", ""),
            plan=data.get("plan", []),
            status=State(data.get("status", "IDLE")),
            logs=data.get("logs", []),
            retries_count=data.get("retries_count", 0),
            memory_refs=data.get("memory_refs", []),
            monologue=data.get("monologue", {"observations": [], "thoughts": [], "actions": []})
        )
        return task

    def _task_to_dict(self, task: TaskState) -> dict:
        return {
            "task_id": task.task_id,
            "goal": task.goal,
            "current_step": task.current_step,
            "plan": task.plan,
            "status": task.status.value,
            "logs": task.logs,
            "retries_count": task.retries_count,
            "memory_refs": task.memory_refs,
            "monologue": task.monologue
        }

    def create_task(self, goal: str) -> TaskState:
        """Creates a new task and sets it to IDLE."""
        task_id = str(uuid.uuid4())
        task = TaskState(task_id=task_id, goal=goal)
        self.tasks_collection.document(task_id).set(self._task_to_dict(task))
        self.log_event(task_id, f"Task created with goal: {goal}")
        return task

    def update_state(self, task_id: str, new_state: State) -> Optional[TaskState]:
        """Updates the state of an existing task."""
        task = self.get_task(task_id)
        if task:
            task.status = new_state
            self.tasks_collection.document(task_id).update({"status": task.status.value})
            self.log_event(task_id, f"Transitioned to {new_state.value}")
            return task
        return None

    def get_task(self, task_id: str) -> Optional[TaskState]:
        """Retrieves a task by its ID."""
        doc = self.tasks_collection.document(task_id).get()
        if doc.exists:
            return self._dict_to_task(doc.to_dict())
        return None

    def save_task(self, task: TaskState) -> None:
        """Saves the task state, avoiding overwriting logs."""
        self.tasks_collection.document(task.task_id).update({
            "goal": task.goal,
            "current_step": task.current_step,
            "plan": task.plan,
            "status": task.status.value,
            "retries_count": task.retries_count,
            "memory_refs": task.memory_refs,
            "monologue": task.monologue
        })

    def log_event(self, task_id: str, message: str, log_type: str = "log") -> None:
        """Appends a log message to a task in Firestore and RTDB with a specific type."""
        from google.cloud import firestore
        self.tasks_collection.document(task_id).update({"logs": firestore.ArrayUnion([f"[{log_type.upper()}] {message}"])})
        
        # Stream to RTDB
        log_ref = rtdb_client.reference(f"tasks/{task_id}/events")
        log_ref.push({
            "type": log_type,
            "timestamp": time.time(),
            "content": message,
            "agent": "system"
        })
