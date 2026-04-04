import asyncio
import logging
from synod.core.task_manager import TaskManager
from synod.core.agent_loop import AgentLoop
from synod.planning.planner import Planner
from synod.planning.plan_writer import PlanWriter

logger = logging.getLogger(__name__)

class TaskRunner:
    def __init__(self, task_manager: TaskManager):
        self.task_manager = task_manager
        self.agent_loop = AgentLoop(task_manager)
        self.planner = Planner()
        self.plan_writer = PlanWriter()

    async def run_task(self, task_id: str, goal: str):
        try:
            self.task_manager.log_event(task_id, "Generating execution plan...")
            plan = await self.planner.create_plan(goal)
            self.plan_writer.write_plan(plan)
            
            # Store plan in task state for the API to read
            task = self.task_manager.get_task(task_id)
            if task:
                task.plan = [{"step_id": p.step_id, "description": p.description, "agent": p.agent, "tool": p.tool, "status": p.status} for p in plan]
                
            # Run the main agent loop
            await self.agent_loop.run(task_id)
            
        except Exception as e:
            logger.error(f"Workflow failed for task {task_id}: {e}")
            self.task_manager.log_event(task_id, f"Workflow failed: {str(e)}")
            task = self.task_manager.get_task(task_id)
            if task:
                task.fail_or_retry()
