"""
Synod Tools Module
"""
from .tool_registry import Tool, ToolRegistry
from .executor import ToolExecutor, ToolResult
from .builtin_tools import web_search, run_python, run_bash, get_preview_url, read_file, write_file, edit_file, git_operations, scaffold_project, schedule_task
from .browser_tool import BrowserTool
from .deploy_tool import deploy_to_render, deploy_to_vercel

def get_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    browser = BrowserTool()
    registry.register_tool(Tool("web_search", "Search the web", web_search, ["network"]))
    registry.register_tool(Tool("run_python", "Run python code", run_python, ["sandbox"]))
    registry.register_tool(Tool("run_bash", "Run bash command", run_bash, ["sandbox"]))
    registry.register_tool(Tool("get_preview_url", "Get public URL for app running in sandbox", get_preview_url, ["network"]))
    registry.register_tool(Tool("read_file", "Read a file", read_file, ["fs_read"]))
    registry.register_tool(Tool("write_file", "Write a file", write_file, ["fs_write"]))
    registry.register_tool(Tool("edit_file", "Edit a file by replacing a target string", edit_file, ["fs_write"]))
    registry.register_tool(Tool("git_operations", "Git operations", git_operations, ["network", "fs_write"]))
    registry.register_tool(Tool("browser_open", "Open URL in browser", browser.browser_open, ["network"]))
    registry.register_tool(Tool("browser_click", "Click element in browser", browser.browser_click, ["network"]))
    registry.register_tool(Tool("browser_extract", "Extract text from browser", browser.browser_extract, ["network"]))
    registry.register_tool(Tool("deploy_to_render", "Deploy to Render", deploy_to_render, ["network"]))
    registry.register_tool(Tool("deploy_to_vercel", "Deploy to Vercel", deploy_to_vercel, ["network"]))
    registry.register_tool(Tool("scaffold_project", "Initialize new project (static, webapp, mobile)", scaffold_project, ["fs_write", "sandbox"]))
    registry.register_tool(Tool("schedule_task", "Schedule a recurring task", schedule_task, ["memory"]))
    return registry

__all__ = [
    "Tool",
    "ToolRegistry",
    "ToolExecutor",
    "ToolResult",
    "web_search",
    "run_python",
    "run_bash",
    "get_preview_url",
    "read_file",
    "write_file",
    "git_operations",
    "BrowserTool",
    "deploy_to_render",
    "deploy_to_vercel"
]
