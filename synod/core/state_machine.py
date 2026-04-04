from enum import Enum
from dataclasses import dataclass, field
from typing import List, Any

class State(Enum):
    IDLE = "IDLE"
    ANALYZE = "ANALYZE"
    PLAN = "PLAN"
    EXECUTE = "EXECUTE"
    OBSERVE = "OBSERVE"
    REFLECT = "REFLECT"
    RETRY = "RETRY"
    COMPLETE = "COMPLETE"
    FAIL = "FAIL"

@dataclass
class TaskState:
    task_id: str
    goal: str
    current_step: str = ""
    plan: List[Any] = field(default_factory=list)
    status: State = State.IDLE
    logs: List[str] = field(default_factory=list)
    retries_count: int = 0
    memory_refs: List[str] = field(default_factory=list)
    monologue: dict = field(default_factory=lambda: {
        "observations": [],
        "thoughts": [],
        "actions": []
    })

    def fail_or_retry(self) -> None:
        """Handles failure logic, transitioning to RETRY or FAIL."""
        if self.retries_count < 3:
            self.retries_count += 1
            self.status = State.RETRY
        else:
            self.status = State.FAIL
