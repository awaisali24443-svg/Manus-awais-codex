import logging
import asyncio
import time
import traceback
from dataclasses import dataclass
from typing import Dict, Any
from .tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

@dataclass
class ToolResult:
    success: bool
    output: str
    stderr: str = ""
    execution_time: float = 0.0

class ToolExecutor:
    def __init__(self, registry: ToolRegistry = None) -> None:
        if registry is None:
            from . import get_default_registry
            self.registry = get_default_registry()
        else:
            self.registry = registry
        # Security sandbox rules: blocked dangerous patterns
        self.blocked_patterns = [
            "rm -rf", 
            "sudo ", 
            "os.system", 
            "subprocess.Popen", 
            "eval(", 
            "exec(", 
            "__import__"
        ]

    def _is_safe(self, params: Dict[str, Any]) -> bool:
        """Checks if the parameters contain any blocked dangerous patterns."""
        param_str = str(params).lower()
        return not any(pattern in param_str for pattern in self.blocked_patterns)

    def _redact_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Redacts sensitive information from parameters for logging."""
        redacted = params.copy()
        for key in ["token", "api_key", "password", "secret"]:
            if key in redacted:
                redacted[key] = "***REDACTED***"
        return redacted

    async def execute(self, tool_name: str, params: Dict[str, Any]) -> ToolResult:
        """Executes a tool securely with a 120-second timeout and output capture."""
        redacted_params = self._redact_params(params)
        logger.info(f"Executing tool: {tool_name} with params: {redacted_params}")
        tool = self.registry.get_tool(tool_name)
        
        start_time = time.time()
        
        if not tool:
            logger.error(f"Tool not found: {tool_name}")
            return ToolResult(success=False, output="", stderr=f"Tool {tool_name} not found", execution_time=time.time() - start_time)
            
        if not self._is_safe(params):
            logger.warning(f"Security block triggered for tool {tool_name}")
            return ToolResult(success=False, output="", stderr="Security violation: blocked pattern detected", execution_time=time.time() - start_time)

        try:
            # Enforce 120s timeout for long-running tasks like npm install
            if asyncio.iscoroutinefunction(tool.function):
                result = await asyncio.wait_for(tool.function(**params), timeout=120.0)
            else:
                result = await asyncio.wait_for(asyncio.to_thread(tool.function, **params), timeout=120.0)
                
            execution_time = time.time() - start_time
            logger.info(f"Tool {tool_name} executed successfully in {execution_time:.2f}s.")
            
            # If result is a dict with stderr, extract it
            stderr = ""
            output = str(result)
            if isinstance(result, dict):
                output = str(result.get("output", result))
                stderr = str(result.get("stderr", ""))
                
            return ToolResult(success=True, output=output, stderr=stderr, execution_time=execution_time)
            
        except asyncio.TimeoutError:
            execution_time = time.time() - start_time
            logger.error(f"Tool {tool_name} timed out after 120s.")
            return ToolResult(success=False, output="", stderr="Execution timed out after 120 seconds", execution_time=execution_time)
        except Exception as e:
            execution_time = time.time() - start_time
            error_trace = traceback.format_exc()
            logger.error(f"Tool {tool_name} failed: {e}")
            return ToolResult(success=False, output="", stderr=error_trace, execution_time=execution_time)
