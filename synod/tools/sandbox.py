import subprocess
import tempfile
import os
import logging
import time
import atexit

logger = logging.getLogger(__name__)

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))
CONTAINER_NAME = "synod-devbox"

class DevBox:
    _is_running = False

    @classmethod
    def start(cls):
        if cls._is_running:
            return
            
        if not os.path.exists(WORKSPACE_DIR):
            os.makedirs(WORKSPACE_DIR, exist_ok=True)
            
        try:
            # Check if Docker is available
            subprocess.run(["docker", "info"], capture_output=True, check=True)
            
            # Check if already running
            res = subprocess.run(["docker", "ps", "-q", "-f", f"name={CONTAINER_NAME}"], capture_output=True, text=True)
            if res.stdout.strip():
                cls._is_running = True
                return

            logger.info("Starting persistent DevBox container (Node.js + Python3)...")
            # Start persistent container
            subprocess.run([
                "docker", "run", "-d", "--rm",
                "--name", CONTAINER_NAME,
                "-v", f"{WORKSPACE_DIR}:/workspace",
                "-w", "/workspace",
                "-p", "3000:3000",
                "-p", "5173:5173",
                "-p", "8000:8000",
                "node:20-bookworm",
                "tail", "-f", "/dev/null"
            ], capture_output=True)
            
            # Install python3-pip inside the container
            subprocess.run(["docker", "exec", CONTAINER_NAME, "apt-get", "update"], capture_output=True)
            subprocess.run(["docker", "exec", CONTAINER_NAME, "apt-get", "install", "-y", "python3-pip"], capture_output=True)
            
            cls._is_running = True
            time.sleep(1)
        except Exception as e:
            logger.error(f"Failed to start DevBox Docker container: {e}")

    @classmethod
    def stop(cls):
        if cls._is_running:
            logger.info("Stopping DevBox container...")
            subprocess.run(["docker", "stop", CONTAINER_NAME], capture_output=True)
            cls._is_running = False

    @classmethod
    def execute_bash(cls, command: str, timeout: int = 120) -> dict:
        cls.start()
        if not cls._is_running:
            # Fallback to local subprocess if Docker failed to start
            try:
                res = subprocess.run(command, shell=True, cwd=WORKSPACE_DIR, capture_output=True, text=True, timeout=timeout)
                return {"output": res.stdout, "stderr": res.stderr, "success": res.returncode == 0}
            except Exception as e:
                return {"output": "", "stderr": str(e), "success": False}

        try:
            res = subprocess.run(
                ["docker", "exec", CONTAINER_NAME, "bash", "-c", command],
                capture_output=True, text=True, timeout=timeout
            )
            return {
                "output": res.stdout,
                "stderr": res.stderr,
                "success": res.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {"output": "", "stderr": f"Command timed out after {timeout}s", "success": False}
        except Exception as e:
            return {"output": "", "stderr": str(e), "success": False}

atexit.register(DevBox.stop)

def execute_safe_python(code: str, timeout: int = 15) -> dict:
    """
    Executes Python code in the persistent DevBox container.
    """
    if not os.path.exists(WORKSPACE_DIR):
        os.makedirs(WORKSPACE_DIR, exist_ok=True)
        
    with tempfile.NamedTemporaryFile(dir=WORKSPACE_DIR, suffix=".py", delete=False) as f:
        f.write(code.encode('utf-8'))
        temp_path = f.name
        
    filename = os.path.basename(temp_path)
    result = DevBox.execute_bash(f"python3 {filename}", timeout=timeout)
    
    try:
        os.remove(temp_path)
    except Exception:
        pass
        
    return result
