from dataclasses import dataclass
from typing import List
from synod.agents.master_agent import MasterAgent

@dataclass
class PlanStep:
    step_id: str
    description: str
    tool: str
    agent: str
    expected_output: str
    status: str = "PENDING"

class Planner:
    def __init__(self) -> None:
        self.master_agent = MasterAgent()

    async def create_plan(self, goal: str) -> List[PlanStep]:
        """
        Takes a high-level goal, uses the master agent to decompose it,
        and returns a structured list of PlanSteps.
        """
        import asyncio
        
        steps_text = await self.master_agent.decompose_task(goal)
        if not steps_text:
            return []
        
        agents = await asyncio.gather(
            *[self.master_agent.route_step(desc) for desc in steps_text],
            return_exceptions=True
        )
        
        plan = []
        for i, (desc, agent) in enumerate(zip(steps_text, agents)):
            if isinstance(agent, Exception):
                agent = "logic_agent"
            desc_lower = desc.lower()
            if "code" in desc_lower or "script" in desc_lower:
                tool = "run_python"
            elif "research" in desc_lower or "search" in desc_lower:
                tool = "web_search"
            elif "file" in desc_lower or "write" in desc_lower:
                tool = "write_file"
            else:
                tool = "none"
            plan.append(PlanStep(
                step_id=f"step_{i+1}",
                description=desc,
                tool=tool,
                agent=agent,
                expected_output="Task completed successfully",
                status="PENDING"
            ))
        return plan
