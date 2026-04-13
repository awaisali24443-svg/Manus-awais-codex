from typing import Dict, Optional, Any
import uuid
import time
from .state_machine import TaskState, State
from synod.firebase.firebase_init import db_client, rtdb_client
from synod.memory.local_memory import LocalMemory

class TaskManager:
    def __init__(self) -> None:
        self._tasks_collection = None
        self.local_memory = LocalMemory()

    @property
    def tasks_collection(self):
        if self._tasks_collection is None:
            try:
                from synod.firebase.firebase_init import db_client
                if db_client:
                    self._tasks_collection = db_client.collection("tasks")
            except Exception as e:
                print(f"Failed to initialize TaskManager Firestore collection: {e}")
        return self._tasks_collection

    def _dict_to_task(self, data: dict) -> TaskState:
        task = TaskState(
            task_id=data.get("task_id", ""),
            goal=data.get("goal", ""),
            uid=data.get("uid", ""),
            current_step=data.get("current_step", ""),
            plan=data.get("plan", []),
            status=State(data.get("status", "IDLE")),
            logs=data.get("logs", []),
            retries_count=data.get("retries_count", 0),
            memory_refs=data.get("memory_refs", []),
            pending_action=data.get("pending_action", {}),
            monologue=data.get("monologue", {"observations": [], "thoughts": [], "actions": []})
        )
        return task

    def _task_to_dict(self, task: TaskState) -> dict:
        return {
            "task_id": task.task_id,
            "goal": task.goal,
            "uid": getattr(task, 'uid', ""),
            "current_step": task.current_step,
            "plan": task.plan,
            "status": task.status.value,
            "logs": task.logs,
            "retries_count": task.retries_count,
            "memory_refs": task.memory_refs,
            "pending_action": task.pending_action,
            "monologue": task.monologue
        }

    def create_task(self, goal: str, uid: str = "") -> TaskState:
        """Creates a new task and sets it to IDLE."""
        task_id = str(uuid.uuid4())
        task = TaskState(task_id=task_id, goal=goal)
        task.uid = uid
        if self.tasks_collection:
            try:
                self.tasks_collection.document(task_id).set(self._task_to_dict(task))
            except Exception as e:
                print(f"Failed to save task to Firestore: {e}")
        self.local_memory.save_task(task_id, goal, "IDLE")
        self.log_event(task_id, f"Task created with goal: {goal}")
        return task

    def update_state(self, task_id: str, new_state: State) -> Optional[TaskState]:
        """Updates the state of an existing task."""
        task = self.get_task(task_id)
        if task:
            task.status = new_state
            if self.tasks_collection:
                try:
                    self.tasks_collection.document(task_id).update({"status": task.status.value})
                except Exception as e:
                    print(f"Failed to update task state in Firestore: {e}")
            self.local_memory.save_task(task_id, task.goal, new_state.value)
            self.log_event(task_id, f"Transitioned to {new_state.value}")
            return task
        return None

    def get_task(self, task_id: str) -> Optional[TaskState]:
        """Retrieves a task by its ID."""
        if self.tasks_collection:
            try:
                doc = self.tasks_collection.document(task_id).get()
                if doc.exists:
                    return self._dict_to_task(doc.to_dict())
            except Exception as e:
                print(f"Failed to get task from Firestore: {e}")
        
        # Fallback to local memory
        try:
            local_task = self.local_memory.get_task(task_id)
            if local_task:
                # We only have basic info in local_memory, but it's better than nothing
                return TaskState(
                    task_id=local_task["task_id"],
                    goal=local_task["goal"],
                    status=State(local_task["status"])
                )
        except Exception as e:
            print(f"Failed to get task from local memory: {e}")
            
        return None

    def save_task(self, task: TaskState) -> None:
        """Saves the task state, avoiding overwriting logs."""
        if self.tasks_collection:
            try:
                self.tasks_collection.document(task.task_id).update({
                    "goal": task.goal,
                    "current_step": task.current_step,
                    "plan": task.plan,
                    "status": task.status.value,
                    "retries_count": task.retries_count,
                    "memory_refs": task.memory_refs,
                    "pending_action": task.pending_action,
                    "monologue": task.monologue
                })
            except Exception as e:
                print(f"Failed to save task to Firestore: {e}")

    def log_event(self, task_id: str, message: str, log_type: str = "log") -> None:
        """Appends a log message to a task in Firestore and RTDB with a specific type."""
        from google.cloud import firestore
        if self.tasks_collection:
            try:
                self.tasks_collection.document(task_id).update({"logs": firestore.ArrayUnion([f"[{log_type.upper()}] {message}"])})
            except Exception as e:
                print(f"Failed to log event to Firestore: {e}")
        
        # Stream to RTDB
        try:
            from synod.firebase.firebase_init import rtdb_client
            if rtdb_client:
                log_ref = rtdb_client.reference(f"tasks/{task_id}/events")
                log_ref.push({
                    "type": log_type,
                    "timestamp": time.time(),
                    "content": message,
                    "agent": "system"
                })
        except Exception as e:
            print(f"Failed to log event to RTDB: {e}")
