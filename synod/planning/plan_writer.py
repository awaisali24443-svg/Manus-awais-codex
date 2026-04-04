import os
import re
import logging
from typing import List
from .planner import PlanStep

logger = logging.getLogger(__name__)
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))

class PlanWriter:
    def __init__(self) -> None:
        self.plan_path = os.path.join(WORKSPACE_DIR, "Plan.md")
        os.makedirs(WORKSPACE_DIR, exist_ok=True)

    def write_plan(self, plan: List[PlanStep]) -> None:
        """Writes the structured plan to Plan.md in the workspace."""
        try:
            with open(self.plan_path, "w", encoding="utf-8") as f:
                f.write("# Execution Plan\n\n")
                for step in plan:
                    f.write(f"## {step.step_id}: {step.status}\n")
                    f.write(f"**Description:** {step.description}\n")
                    f.write(f"**Agent:** {step.agent}\n")
                    f.write(f"**Tool:** {step.tool}\n")
                    f.write(f"**Expected Output:** {step.expected_output}\n\n")
            logger.info(f"Successfully wrote plan to {self.plan_path}")
        except Exception as e:
            logger.error(f"Failed to write plan: {e}")

    def update_step_status(self, step_id: str, new_status: str) -> None:
        """Updates the status of a specific step in the Plan.md file."""
        if not os.path.exists(self.plan_path):
            logger.warning("Plan.md does not exist. Cannot update status.")
            return
            
        try:
            with open(self.plan_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Regex to find the step header and replace its status
            pattern = rf"(## {step_id}: ).+"
            replacement = rf"\g<1>{new_status}"
            updated_content = re.sub(pattern, replacement, content)
            
            with open(self.plan_path, "w", encoding="utf-8") as f:
                f.write(updated_content)
            logger.info(f"Updated {step_id} status to {new_status}")
        except Exception as e:
            logger.error(f"Failed to update step status: {e}")

    def inject_into_context(self, plan_data: list = None) -> str:
        """Returns todo.md as formatted string for LLM injection."""
        if plan_data is not None:
            if not plan_data:
                return "## Current Objectives\n(No plan found)"
            todo_lines = ["## Current Objectives"]
            for step in plan_data:
                step_id = step.get("step_id", "unknown")
                desc = step.get("description", "")
                status = step.get("status", "PENDING")
                if status == "COMPLETED":
                    todo_lines.append(f"- [x] {step_id}: {desc}")
                elif status == "IN_PROGRESS":
                    todo_lines.append(f"- [ ] {step_id}: {desc} ← IN PROGRESS")
                else:
                    todo_lines.append(f"- [ ] {step_id}: {desc}")
            return "\n".join(todo_lines)

        # Fallback to file reading if no plan_data provided
        if not os.path.exists(self.plan_path):
            return "## Current Objectives\n(No plan found)"
            
        try:
            with open(self.plan_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Parse the Plan.md and convert to todo.md format
            lines = content.split('\n')
            todo_lines = ["## Current Objectives"]
            
            step_id = None
            status = None
            description = None
            
            for line in lines:
                if line.startswith("## "):
                    # Extract step_id and status
                    parts = line[3:].split(":", 1)
                    if len(parts) == 2:
                        step_id = parts[0].strip()
                        status = parts[1].strip()
                elif line.startswith("**Description:** "):
                    description = line[17:].strip()
                    
                    if step_id and status and description:
                        if status == "COMPLETED":
                            todo_lines.append(f"- [x] {step_id}: {description}")
                        elif status == "IN_PROGRESS":
                            todo_lines.append(f"- [ ] {step_id}: {description} ← IN PROGRESS")
                        else:
                            todo_lines.append(f"- [ ] {step_id}: {description}")
                        
                        # Reset for next step
                        step_id = None
                        status = None
                        description = None
                            
            return "\n".join(todo_lines)
        except Exception as e:
            logger.error(f"Failed to read plan for context injection: {e}")
            return "## Current Objectives\n(Error reading plan)"
