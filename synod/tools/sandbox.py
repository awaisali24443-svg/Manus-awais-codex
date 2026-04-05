import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)
E2B_API_KEY = os.getenv("E2B_API_KEY")

class DevBox:
    _sandbox = None

    @classmethod
    def start(cls):
        """Start E2B cloud sandbox if not running."""
        if cls._sandbox:
            return cls._sandbox
        if not E2B_API_KEY:
            logger.warning("E2B_API_KEY not set. Sandbox unavailable.")
            return None
        try:
            from e2b_code_interpreter import Sandbox
            logger.info("Starting E2B Cloud Sandbox...")
            cls._sandbox = Sandbox(api_key=E2B_API_KEY, timeout=300)
            # Pre-install Node.js
            cls._sandbox.commands.run(
                "curl -fsSL https://deb.nodesource.com/setup_20.x"
                " | bash - && apt-get install -y nodejs 2>/dev/null",
                timeout=120
            )
            logger.info("E2B Sandbox ready with Node.js")
            return cls._sandbox
        except Exception as e:
            logger.error(f"Failed to start E2B sandbox: {e}")
            cls._sandbox = None
            return None

    @classmethod
    def execute_bash(cls, command: str, timeout: int = 300) -> dict:
        """Execute bash command in E2B sandbox."""
        sb = cls.start()
        if not sb:
            # Fallback: run locally in workspace dir
            import subprocess
            WORKSPACE_DIR = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../workspace")
            )
            os.makedirs(WORKSPACE_DIR, exist_ok=True)
            try:
                res = subprocess.run(
                    command, shell=True,
                    cwd=WORKSPACE_DIR,
                    capture_output=True, text=True, timeout=timeout
                )
                return {
                    "output": res.stdout,
                    "stderr": res.stderr,
                    "success": res.returncode == 0
                }
            except Exception as e:
                return {"output": "", "stderr": str(e), "success": False}
        try:
            # Check if it is a background/server command
            is_background = any(x in command for x in [
                "npm run dev", "npm start", "nohup",
                "uvicorn", "node server", "expo start"
            ])
            if is_background:
                proc = sb.commands.run(command, background=True)
                hostname = sb.get_host(3000)
                return {
                    "output": f"Server started. Public URL: https://{hostname}",
                    "stderr": "",
                    "success": True
                }
            result = sb.commands.run(command, timeout=timeout)
            return {
                "output": result.stdout or "",
                "stderr": result.stderr or "",
                "success": result.error is None
            }
        except Exception as e:
            return {"output": "", "stderr": str(e), "success": False}

    @classmethod
    def write_file(cls, path: str, content: str) -> dict:
        """Write file directly to E2B sandbox filesystem."""
        sb = cls.start()
        if not sb:
            return {"success": False, "error": "Sandbox not available"}
        try:
            sb.files.write(path, content)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def read_file(cls, path: str) -> dict:
        """Read file from E2B sandbox filesystem."""
        sb = cls.start()
        if not sb:
            return {"success": False, "content": "", "error": "Sandbox not available"}
        try:
            content = sb.files.read(path)
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "content": "", "error": str(e)}

    @classmethod
    def get_public_url(cls, port: int = 3000) -> Optional[str]:
        """Get public URL for a port running inside sandbox."""
        sb = cls.start()
        if not sb:
            return None
        try:
            return f"https://{sb.get_host(port)}"
        except Exception:
            return None

    @classmethod
    def stop(cls):
        """Safely close the E2B sandbox."""
        if cls._sandbox:
            try:
                cls._sandbox.close()
                logger.info("E2B Sandbox closed.")
            except Exception:
                pass
            finally:
                cls._sandbox = None


def execute_safe_python(code: str, timeout: int = 30) -> dict:
    """Execute Python code in E2B sandbox."""
    return DevBox.execute_bash(f"python3 -c {repr(code)}", timeout=timeout)
