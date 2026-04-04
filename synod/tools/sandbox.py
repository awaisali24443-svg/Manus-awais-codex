import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))

def execute_safe_python(code: str, timeout: int = 15) -> dict:
    """
    Executes Python code in a Docker container for true sandboxing.
    Falls back to standard subprocess if Docker is not available.
    """
    if not os.path.exists(WORKSPACE_DIR):
        os.makedirs(WORKSPACE_DIR, exist_ok=True)
        
    with tempfile.NamedTemporaryFile(dir=WORKSPACE_DIR, suffix=".py", delete=False) as f:
        f.write(code.encode('utf-8'))
        temp_path = f.name
        
    filename = os.path.basename(temp_path)
    
    try:
        # Check if Docker is available and running
        docker_check = subprocess.run(["docker", "info"], capture_output=True, timeout=2)
        use_docker = docker_check.returncode == 0
    except Exception:
        use_docker = False

    try:
        if use_docker:
            res = subprocess.run(
                ["docker", "run", "--rm", "--network", "none", "-v", f"{WORKSPACE_DIR}:/workspace", "-w", "/workspace", "python:3.11-slim", "python", filename],
                capture_output=True, text=True, timeout=timeout
            )
        else:
            res = subprocess.run(
                ["python", temp_path],
                capture_output=True, text=True, timeout=timeout
            )
    except subprocess.TimeoutExpired:
        os.remove(temp_path)
        return {"output": "", "stderr": "Execution timed out.", "success": False}
    except Exception as e:
        os.remove(temp_path)
        return {"output": "", "stderr": str(e), "success": False}
        
    os.remove(temp_path)
    return {
        "output": res.stdout,
        "stderr": res.stderr,
        "success": res.returncode == 0
    }
