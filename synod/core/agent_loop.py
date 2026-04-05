import asyncio
import traceback
import os
import re
import json
from typing import Callable, Dict, Awaitable, Optional
from .state_machine import State, TaskState
from synod.core.task_manager import TaskManager
from synod.agents.llm_router import LLMRouter
from synod.tools.executor import ToolExecutor
from synod.planning.plan_writer import PlanWriter
from synod.memory.task_memory import TaskMemory
from synod.tools.builtin_tools import git_operations

class AgentLoop:
    def __init__(self, task_manager: TaskManager):
        self.task_manager = task_manager
        self.llm_router = LLMRouter()
        self.tool_executor = ToolExecutor()
        self.plan_writer = PlanWriter()
        self.task_memory = TaskMemory()
        from synod.memory.global_memory import GlobalMemory
        from synod.memory.working_memory import WorkingMemory
        self.global_memory = GlobalMemory()
        self.working_memory = WorkingMemory(self.task_memory, self.global_memory)
        # Map states to their respective handler methods
        self.handlers: Dict[State, Callable[[TaskState], Awaitable[State]]] = {
            State.IDLE: self._handle_idle,
            State.ANALYZE: self._handle_analyze,
            State.PLAN: self._handle_plan,
            State.EXECUTE: self._handle_execute,
            State.OBSERVE: self._handle_observe,
            State.REFLECT: self._handle_reflect,
            State.RETRY: self._handle_retry,
        }

    def _get_latest_screenshot(self) -> Optional[str]:
        """Reads the latest screenshot from the workspace if it was taken recently."""
        import glob
        import base64
        import os
        import time
        screenshots_dir = os.path.join(os.path.dirname(__file__), "../../workspace/screenshots")
        files = sorted(glob.glob(f"{screenshots_dir}/screenshot_*.png"), key=os.path.getmtime, reverse=True)
        if files:
            # Check if it's recent (e.g., within the last 60 seconds)
            if time.time() - os.path.getmtime(files[0]) < 60:
                try:
                    with open(files[0], "rb") as f:
                        return base64.b64encode(f.read()).decode('utf-8')
                except Exception:
                    pass
        return None

    def _parse_react_response(self, response: str) -> dict:
        """Parses ReAct XML tags."""
        thought_match = re.search(r"<thought>(.*?)</thought>", response, re.DOTALL)
        tool_call_match = re.search(r"<tool_call>(.*?)</tool_call>", response, re.DOTALL)
        task_completed_match = re.search(r"<task_completed>(.*?)</task_completed>", response, re.DOTALL)
        replan_match = re.search(r"<replan>(.*?)</replan>", response, re.DOTALL)
        
        result = {
            "thought": thought_match.group(1).strip() if thought_match else None,
            "tool_name": None,
            "tool_params": None,
            "completed": bool(task_completed_match),
            "completion_summary": task_completed_match.group(1).strip() if task_completed_match else None,
            "replan": replan_match.group(1).strip() if replan_match else None
        }
        
        if tool_call_match:
            try:
                tool_json = json.loads(tool_call_match.group(1).strip())
                result["tool_name"] = tool_json.get("name")
                result["tool_params"] = tool_json.get("params")
            except json.JSONDecodeError:
                pass
        
        return result

    async def run(self, task_id: str) -> None:
        # Step 1: fetch task FIRST
        task = self.task_manager.get_task(task_id)
        if not task:
            return
            
        # Start persistent DevBox container
        from synod.tools.sandbox import DevBox
        DevBox.start()
        self.task_memory.save_event(task_id, "infrastructure", "DevBox Online", "system")
        self.task_manager.log_event(task_id, "DevBox Online", "infrastructure")
        
        # Step 2: try git pull safely
        try:
            token = os.getenv("GITHUB_TOKEN", "")
            repo = os.getenv("GITHUB_REPO_URL", "")
            if token and repo:
                git_operations("pull", repo, token)
                self.task_manager.log_event(task_id, "Git pull successful.", "infrastructure")
        except Exception as e:
            self.task_manager.log_event(task_id, f"Git pull skipped: {e}", "infrastructure")
        
        # Step 3: main state loop
        while task.status not in [State.COMPLETE, State.FAIL]:
            handler = self.handlers.get(task.status)
            if not handler:
                task.status = State.FAIL
                break
            try:
                task.status = await handler(task)
                self.task_manager.save_task(task)
            except Exception as e:
                error_trace = traceback.format_exc()
                self.task_memory.save_event(task_id, "error", error_trace, "system")
                task.fail_or_retry()
                self.task_manager.save_task(task)
        
        # Step 4: try git commit safely
        try:
            token = os.getenv("GITHUB_TOKEN", "")
            repo = os.getenv("GITHUB_REPO_URL", "")
            if token and repo:
                msg = f"Synod: {task.goal[:50]} - {task.status.value}"
                git_operations("commit", repo, token, message=msg)
                git_operations("push", repo, token)
        except Exception as e:
            self.task_manager.log_event(task_id, f"Git push skipped: {e}")
        finally:
            try:
                browser_tool = self.tool_executor.registry.get_tool("browser_open")
                if browser_tool and getattr(browser_tool.function, '__self__', None):
                    await getattr(browser_tool.function, '__self__').close()
            except Exception:
                pass
            # Stop DevBox when task is done
            DevBox.stop()
            self.task_memory.save_event(task_id, "infrastructure", "DevBox Offline", "system")
            self.task_manager.log_event(task_id, "DevBox Offline", "infrastructure")

    async def _handle_idle(self, task) -> State:
        return State.ANALYZE

    async def _handle_analyze(self, task) -> State:
        self.task_manager.log_event(task.task_id, "Analyzing goal...", "thought")
        tool_schemas = (
            "run_bash(command: str) - Execute bash command in persistent container\n"
            "run_python(code: str) - Execute Python\n"
            "web_search(query: str) - Search the web\n"
            "read_file(path: str) - Read workspace file\n"
            "write_file(path: str, content: str) - Write file\n"
            "edit_file(path: str, target: str, replacement: str) - Replace exact string in file\n"
            "browser_open(url: str) - Open browser URL\n"
            "get_preview_url(port: int = 3000) - Get public URL for running app\n"
        )
        context = self.working_memory.build_context(
            task.task_id,
            "You have a persistent E2B cloud VM with Node.js 20, Python 3, npm, git, and full internet access. Files and processes persist between tool calls. Use run_bash for npm install, starting servers, etc. Use get_preview_url to get the public URL after starting a server.",
            tool_schemas,
            self.plan_writer.inject_into_context(task.plan)
        )
        observation = await self.llm_router.route(f"Understand the goal: {task.goal}", context)
        self.task_memory.save_event(task.task_id, "observation", observation, "MasterAgent")
        return State.PLAN

    async def _handle_plan(self, task) -> State:
        self.task_manager.log_event(task.task_id, "Checking plan...", "thought")
        if not task.plan:
            return State.FAIL
        self.task_manager.log_event(task.task_id, f"Found {len(task.plan)} steps.", "thought")
        return State.EXECUTE

    async def _handle_execute(self, task: TaskState) -> State:
        self.task_manager.log_event(task.task_id, "Executing plan...", "thought")
        
        if not task.plan:
            self.task_manager.log_event(task.task_id, "No plan found to execute.")
            return State.FAIL
            
        pending_step = next((s for s in task.plan if isinstance(s, dict) and s.get("status") in ["PENDING", "IN_PROGRESS"]), None)
        if not pending_step:
            self.task_manager.log_event(task.task_id, "All steps completed.")
            return State.OBSERVE
            
        step_desc = pending_step.get("description", "")
        task.current_step = step_desc
        pending_step["status"] = "IN_PROGRESS"
        
        # Inner ReAct loop
        for _ in range(10):
            tool_schemas = (
                "run_bash(command: str) - Execute bash command in persistent container\n"
                "run_python(code: str) - Execute Python\n"
                "web_search(query: str) - Search the web\n"
                "read_file(path: str) - Read workspace file\n"
                "write_file(path: str, content: str) - Write file\n"
                "edit_file(path: str, target: str, replacement: str) - Replace exact string in file\n"
                "git_operations(action, repo_url, token) - Git\n"
                "browser_open(url: str) - Open browser URL\n"
                "browser_click(selector: str) - Click element\n"
                "browser_extract(selector: str) - Extract text\n"
                "get_preview_url(port: int = 3000) - Get public URL for running app\n"
            )

            context = self.working_memory.build_context(
                task.task_id,
                "You have a persistent E2B cloud VM with Node.js 20, Python 3, npm, git, and full internet access. Files and processes persist between tool calls. Use run_bash for npm install, starting servers, etc. Use get_preview_url to get the public URL after starting a server.",
                tool_schemas,
                self.plan_writer.inject_into_context(task.plan)
            )
            
            image_data = None
            last_action = task.monologue.get("actions", [])[-1] if task.monologue.get("actions") else None
            if last_action and last_action.get("tool", "").startswith("browser_"):
                image_data = self._get_latest_screenshot()
                
            response = await self.llm_router.route(step_desc, context, image_data)
            parsed = self._parse_react_response(response)
            
            if parsed["thought"]:
                task.monologue["thoughts"].append(parsed["thought"])
                self.task_manager.save_task(task)
                self.task_manager.log_event(task.task_id, f"Thought: {parsed['thought']}", "thought")
                
            if parsed.get("replan"):
                try:
                    new_steps = json.loads(parsed["replan"]).get("steps", [])
                    if new_steps:
                        completed_steps = [s for s in task.plan if isinstance(s, dict) and s.get("status") == "COMPLETED"]
                        new_plan_steps = [{"step_id": f"step_{len(completed_steps)+i+1}", "description": desc, "agent": "software_engineer", "tool": "none", "status": "PENDING"} for i, desc in enumerate(new_steps)]
                        task.plan = completed_steps + new_plan_steps
                        self.task_manager.log_event(task.task_id, f"Agent dynamically replanned: {new_steps}", "replan")
                        self.task_memory.save_event(task.task_id, "replan", f"Dynamically replanned {len(new_steps)} steps", "system")
                        self.task_manager.save_task(task)
                        return State.EXECUTE
                except Exception as e:
                    self.task_manager.log_event(task.task_id, f"Failed to parse replan JSON: {e}")
            
            if parsed["completed"]:
                self.task_manager.log_event(task.task_id, f"Completed: {parsed['completion_summary']}")
                pending_step["status"] = "COMPLETED"
                return State.EXECUTE if any(s.get("status") in ["PENDING", "IN_PROGRESS"] for s in task.plan if isinstance(s, dict)) else State.OBSERVE
            
            if parsed["tool_name"]:
                self.task_manager.log_event(task.task_id, f"Tool Call: {parsed['tool_name']}", "tool")
                try:
                    result = await self.tool_executor.execute(parsed["tool_name"], parsed["tool_params"] or {})
                    obs_content = result.output if result.success else f"TOOL ERROR: {result.stderr}"
                    task.monologue["actions"].append({"tool": parsed["tool_name"], "result": str(obs_content)})
                    self.task_manager.save_task(task)
                    self.task_memory.save_event(task.task_id, "observation", obs_content, "system")
                    self.task_manager.log_event(task.task_id, f"Observation: {str(obs_content)[:200]}...", "observation")
                except Exception as e:
                    error_msg = f"Tool {parsed['tool_name']} failed: {str(e)}"
                    self.task_memory.save_event(task.task_id, "error", error_msg, "system")
                    step_desc = (
                        f"{step_desc}\n\n"
                        f"PREVIOUS ATTEMPT FAILED:\n{error_msg}\n"
                        f"Analyze this error and try a different approach."
                    )
            elif not parsed["completed"]:
                # LLM gave no tool call and no completion
                # Inject a nudge into step_desc
                step_desc = (
                    f"{step_desc}\n\n"
                    f"IMPORTANT: Your last response had no "
                    f"<tool_call> or <task_completed> tag. "
                    f"You MUST either call a tool or signal "
                    f"task_completed. Try again."
                )
                self.task_manager.log_event(
                    task.task_id, 
                    "Warning: LLM gave incomplete response. Nudging."
                )
            
        task.fail_or_retry()
        return task.status

    async def _handle_observe(self, task):
        self.task_manager.log_event(task.task_id, "Observing results...")
        completed = [s for s in task.plan if isinstance(s, dict) and s.get("status") == "COMPLETED"]
        failed = [s for s in task.plan if isinstance(s, dict) and s.get("status") == "FAILED"]
        summary = f"Completed {len(completed)}/{len(task.plan)} steps. Failed: {len(failed)}."
        self.task_memory.save_event(task.task_id, "observation", summary, "system")
        task.monologue["observations"].append(summary)
        self.task_manager.save_task(task)
        return State.REFLECT

    async def _handle_reflect(self, task):
        self.task_manager.log_event(task.task_id, "Reflecting on execution...")
        all_done = all(s.get("status") == "COMPLETED" for s in task.plan if isinstance(s, dict))
        failed = [s for s in task.plan if isinstance(s, dict) and s.get("status") == "FAILED"]
        if failed:
            note = f"{len(failed)} steps failed. Partial completion."
            self.task_memory.save_event(task.task_id, "observation", note, "system")
        msg = "Task successful." if all_done else "Task completed with failures."
        self.task_manager.log_event(task.task_id, msg)
        
        try:
            summary = f"Task: {task.goal[:100]}. Result: {msg}"
            self.global_memory.store_memory(summary, {
                "task_id": task.task_id,
                "status": "complete" if all_done else "partial",
                "plan": json.dumps(task.plan)
            })
        except Exception:
            pass  # never block completion on memory failure
            
        return State.COMPLETE

    async def _handle_retry(self, task: TaskState) -> State:
        self.task_manager.log_event(
            task.task_id, 
            f"Retrying... (Attempt {task.retries_count}/3)"
        )
        events = self.task_memory.load_events(task.task_id)
        error_events = [
            e for e in events 
            if e.get("type") == "error"
        ][-3:]
        
        if error_events:
            error_context = "\n".join([
                f"PREVIOUS ERROR: {e['content']}" 
                for e in error_events
            ])
            # Save error context as observation so
            # next ANALYZE pass sees it
            self.task_memory.save_event(
                task.task_id,
                "observation",
                f"RETRY CONTEXT:\n{error_context}",
                "system"
            )
            self.task_manager.log_event(
                task.task_id,
                f"Injected {len(error_events)} errors into context."
            )
        
        await asyncio.sleep(1)
        return State.ANALYZE
