"""
Synod Agents Module - Multi-Agent System Core
"""
from .master_agent import MasterAgent
from .software_engineer import SoftwareEngineer
from .logic_agent import LogicAgent
from .research_agent import ResearchAgent
from .llm_router import LLMRouter

__all__ = [
    "MasterAgent",
    "SoftwareEngineer",
    "LogicAgent",
    "ResearchAgent",
    "LLMRouter"
]
