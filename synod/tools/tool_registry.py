from dataclasses import dataclass
from typing import Callable, Dict, List, Any

@dataclass
class Tool:
    name: str
    description: str
    function: Callable[..., Any]
    permissions: List[str]

class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    def register_tool(self, tool: Tool) -> None:
        """Registers a new tool in the registry."""
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Tool | None:
        """Retrieves a tool by its name."""
        return self._tools.get(name)

    def list_tools(self) -> List[Tool]:
        """Returns a list of all registered tools."""
        return list(self._tools.values())
