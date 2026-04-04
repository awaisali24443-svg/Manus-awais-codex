import logging
import asyncio
from typing import Optional
from .master_agent import MasterAgent
from .software_engineer import SoftwareEngineer
from .logic_agent import LogicAgent
from .research_agent import ResearchAgent

logger = logging.getLogger(__name__)

class LLMRouter:
    def __init__(self) -> None:
        self.master = MasterAgent()
        self.software_engineer = SoftwareEngineer()
        self.logic_agent = LogicAgent()
        self.research_agent = ResearchAgent()
        self.max_retries = 3
        self.timeout = 30.0

    async def route(self, step: str, context: str, image_data: str = None) -> str:
        """
        Routes the step to the appropriate agent.
        Implements failover: if SoftwareEngineer fails, fallback to LogicAgent.
        """
        try:
            agent_name = await asyncio.wait_for(
                self.master.route_step(step), 
                timeout=self.timeout
            )
        except Exception as e:
            logger.error(f"MasterAgent routing failed: {e}. Defaulting to logic_agent.")
            agent_name = "logic_agent"

        logger.info(f"Router selected agent: {agent_name}")

        for attempt in range(1, self.max_retries + 1):
            try:
                if agent_name == "software_engineer":
                    return await asyncio.wait_for(
                        self.software_engineer.generate_code(step, context, image_data),
                        timeout=self.timeout
                    )
                elif agent_name == "logic_agent":
                    return await asyncio.wait_for(
                        self.logic_agent.solve(step, context),
                        timeout=self.timeout
                    )
                elif agent_name == "research_agent":
                    return await asyncio.wait_for(
                        self.research_agent.research(step, context),
                        timeout=self.timeout
                    )
                else:
                    logger.warning(f"Unknown agent '{agent_name}', falling back to logic_agent.")
                    return await asyncio.wait_for(
                        self.logic_agent.solve(step, context),
                        timeout=self.timeout
                    )
            except Exception as e:
                logger.warning(f"Attempt {attempt}/{self.max_retries} failed for {agent_name}: {e}")
                
                # Failover logic: if Software Engineer fails on the last attempt, fallback to Logic Agent
                if attempt == self.max_retries:
                    if agent_name == "software_engineer":
                        logger.info("SoftwareEngineer exhausted retries. Failing over to LogicAgent.")
                        try:
                            return await asyncio.wait_for(
                                self.logic_agent.solve(step, context),
                                timeout=self.timeout
                            )
                        except Exception as fallback_e:
                            logger.error(f"Fallback to LogicAgent also failed: {fallback_e}")
                            raise fallback_e
                    else:
                        logger.error(f"Agent {agent_name} exhausted all retries.")
                        raise e
                
                # Exponential backoff before retry
                await asyncio.sleep(2 ** attempt)
        
        raise RuntimeError(f"Routing failed for step: {step}")
