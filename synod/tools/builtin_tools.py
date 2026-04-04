import os
import subprocess
import httpx
import urllib.parse
from typing import Optional

# Ensure workspace directory exists
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))
os.makedirs(WORKSPACE_DIR, exist_ok=True)

def _enforce_workspace(path: str) -> str:
    """Ensures the resolved path is strictly within the workspace directory."""
    # Remove leading slashes to prevent absolute path override
    clean_path = path.lstrip("/")
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, clean_path))
    if not abs_path.startswith(WORKSPACE_DIR):
        raise PermissionError(f"Path {path} is outside the allowed workspace")
    return abs_path

async def web_search(query: str) -> str:
    """Performs a web search using SerpAPI or falls back to DuckDuckGo HTML."""
    api_key = os.getenv("SERPAPI_API_KEY")
    if api_key:
        url = f"https://serpapi.com/search.json?q={urllib.parse.quote(query)}&api_key={api_key}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            results = resp.json().get("organic_results", [])
            return str(results[:5]) # Return top 5 results
    else:
        # Fallback to DuckDuckGo HTML snippet
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            resp.raise_for_status()
            return resp.text[:2000] # Return a snippet of the HTML

def run_python(code: str) -> str:
    """Executes Python code in a restricted environment."""
    from .sandbox import execute_safe_python
    result = execute_safe_python(code)
    
    # ToolExecutor expects a string
    return f"Output: {result['output']}\nStderr: {result['stderr']}"

def read_file(path: str) -> str:
    """Reads a file scoped to the workspace."""
    safe_path = _enforce_workspace(path)
    if not os.path.exists(safe_path):
        return f"Error: File {path} does not exist."
    with open(safe_path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path: str, content: str) -> str:
    """Writes content to a file scoped to the workspace."""
    safe_path = _enforce_workspace(path)
    # Ensure parent directories exist
    os.makedirs(os.path.dirname(safe_path), exist_ok=True)
    with open(safe_path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Successfully wrote to {path}"

def git_operations(action: str, repo_url: str, token: str = "", message: str = "Auto-commit from Synod") -> str:
    """Performs git clone, pull, push, or commit operations."""
    if token and "://" in repo_url:
        parts = repo_url.split("://")
        auth_url = f"{parts[0]}://oauth2:{token}@{parts[1]}"
    else:
        auth_url = repo_url
        
    # Extract repo name for directory, or use workspace if no repo_url
    if repo_url:
        repo_name = repo_url.rstrip("/").split("/")[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]
        repo_dir = os.path.join(WORKSPACE_DIR, repo_name)
    else:
        repo_dir = WORKSPACE_DIR
    
    try:
        if action == "clone":
            res = subprocess.run(["git", "clone", auth_url, repo_dir], capture_output=True, text=True, timeout=9.0)
        elif action == "pull":
            res = subprocess.run(["git", "-C", repo_dir, "pull"], capture_output=True, text=True, timeout=9.0)
        elif action == "commit":
            subprocess.run(["git", "-C", repo_dir, "add", "."], capture_output=True, text=True, timeout=9.0)
            res = subprocess.run(["git", "-C", repo_dir, "commit", "-m", message], capture_output=True, text=True, timeout=9.0)
        elif action == "push":
            res = subprocess.run(["git", "-C", repo_dir, "push"], capture_output=True, text=True, timeout=9.0)
        else:
            return "Error: Invalid git action. Use clone, pull, commit, or push."
            
        return res.stdout if res.returncode == 0 else f"Git Error:\n{res.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: Git operation timed out."
    except Exception as e:
        return f"Error executing git operation: {str(e)}"
