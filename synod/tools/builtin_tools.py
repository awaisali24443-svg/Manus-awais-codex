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
    if os.path.commonpath([WORKSPACE_DIR, abs_path]) != WORKSPACE_DIR:
        raise PermissionError(f"Path {path} is outside the allowed workspace")
    return abs_path

async def web_search(query: str) -> str:
    """Performs a web search using SerpAPI or falls back to DuckDuckGo HTML."""
    api_key = os.getenv("SERPAPI_KEY") or os.getenv("SERPAPI_API_KEY")
    if api_key:
        url = f"https://serpapi.com/search.json?q={urllib.parse.quote(query)}&api_key={api_key}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            results = resp.json().get("organic_results", [])
            return str(results[:5]) # Return top 5 results
    else:
        # Fallback to DuckDuckGo HTML snippet
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            resp.raise_for_status()
            return resp.text[:2000] # Return a snippet of the HTML

def run_python(code: str) -> str:
    """Executes Python code in a restricted environment."""
    from .sandbox import execute_safe_python
    result = execute_safe_python(code)
    
    # ToolExecutor expects a string
    if result['stderr'] and not result['success']:
        return f"Output: {result['output']}\nError: {result['stderr']}"
    return result['output'] or "(no output)"

def run_bash(command: str) -> str:
    """Executes a bash command in the persistent workspace container."""
    from .sandbox import DevBox
    result = DevBox.execute_bash(command)
    if result['stderr'] and not result['success']:
        return f"Output:\n{result['output']}\nError:\n{result['stderr']}"
    return result['output'] or "(Command executed successfully with no output)"

def get_preview_url(port: int = 3000) -> str:
    """Gets the public URL for a server running in the sandbox."""
    from .sandbox import DevBox
    url = DevBox.get_public_url(port)
    if url:
        return f"Your app is live at: {url}"
    return "No server found on that port. Make sure to start it first."

def read_file(path: str) -> str:
    """Reads file from E2B sandbox or local workspace."""
    from .sandbox import DevBox
    result = DevBox.read_file(path)
    if result["success"]:
        return result["content"]
    # Fallback to local
    safe_path = _enforce_workspace(path)
    if not os.path.exists(safe_path):
        return f"Error: File {path} does not exist."
    with open(safe_path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path: str, content: str) -> str:
    """Writes content to local workspace and E2B sandbox."""
    from .sandbox import DevBox
    safe_path = _enforce_workspace(path)
    parent_dir = os.path.dirname(safe_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)
    with open(safe_path, "w", encoding="utf-8") as f:
        f.write(content)
    # Mirror to E2B
    DevBox.write_file(path, content)
    return f"Successfully wrote to {path}"

def edit_file(path: str, target: str, replacement: str) -> str:
    """Replaces the first exact occurrence of 'target' with 'replacement' in the file."""
    safe_path = _enforce_workspace(path)
    if not os.path.exists(safe_path):
        return f"Error: File {path} does not exist."
    with open(safe_path, "r", encoding="utf-8") as f:
        content = f.read()
    if target not in content:
        return "Error: Target string not found in file. Ensure exact match including whitespace."
    content = content.replace(target, replacement, 1)
    with open(safe_path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Successfully edited {path}"

def scaffold_project(type: str, name: str) -> str:
    """Initializes a new project with pre-configured scaffolds."""
    from .sandbox import DevBox
    # type can be: static, webapp, mobile
    if type == "static":
        cmd = f"mkdir -p {name} && cd {name} && echo '<h1>Hello from {name}</h1>' > index.html"
    elif type == "webapp":
        cmd = f"npx create-vite@latest {name} --template react-ts --yes"
    elif type == "mobile":
        cmd = f"npx create-expo-app {name} --template blank --yes"
    else:
        return f"Error: Unknown project type '{type}'. Use static, webapp, or mobile."
    
    result = DevBox.execute_bash(cmd)
    if result["success"]:
        return f"Successfully scaffolded {type} project: {name}"
    return f"Error scaffolding project: {result['stderr']}"

def schedule_task(goal: str, cron: str) -> str:
    """Stores a scheduled task in local memory for future execution."""
    try:
        if len(cron.split()) != 5:
            return "Error: Invalid cron expression (needs 5 fields)."
        
        from synod.memory.local_memory import LocalMemory
        mem = LocalMemory()
        mem.set_preference(
            f"scheduled_{goal[:30]}", 
            {"goal": goal, "cron": cron, "created_at": str(__import__('datetime').datetime.now())}
        )
        return (
            f"Scheduled task stored: '{goal}' with cron '{cron}'. "
            f"NOTE: A background worker must be configured to execute this."
        )
    except Exception as e:
        return f"Error scheduling task: {str(e)}"

def git_operations(action: str, repo_url: str = "", token: str = "", message: str = "Auto-commit from Synod") -> str:
    """Performs git clone, pull, push, or commit operations."""
    # Use environment variables as defaults if not provided
    repo_url = repo_url or os.getenv("GITHUB_REPO_URL", "")
    token = token or os.getenv("GITHUB_TOKEN", "")
    
    if not repo_url:
        return "Error: repo_url is required for git operations and GITHUB_REPO_URL is not set."

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
            # Temporarily set remote URL with token for pull
            subprocess.run(["git", "-C", repo_dir, "remote", "set-url", "origin", auth_url], capture_output=True, text=True, timeout=5.0)
            res = subprocess.run(["git", "-C", repo_dir, "pull"], capture_output=True, text=True, timeout=9.0)
        elif action == "commit":
            subprocess.run(["git", "-C", repo_dir, "add", "."], capture_output=True, text=True, timeout=9.0)
            res = subprocess.run(["git", "-C", repo_dir, "commit", "-m", message], capture_output=True, text=True, timeout=9.0)
            if res.returncode != 0 and "nothing to commit" in res.stdout:
                return "Nothing to commit, working tree clean."
        elif action == "push":
            # Temporarily set remote URL with token for push
            subprocess.run(["git", "-C", repo_dir, "remote", "set-url", "origin", auth_url], capture_output=True, text=True, timeout=5.0)
            res = subprocess.run(["git", "-C", repo_dir, "push"], capture_output=True, text=True, timeout=9.0)
        else:
            return "Error: Invalid git action. Use clone, pull, commit, or push."
            
        return res.stdout if res.returncode == 0 else f"Git Error:\n{res.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: Git operation timed out."
    except Exception as e:
        return f"Error executing git operation: {str(e)}"
