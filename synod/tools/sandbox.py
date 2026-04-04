import os
import logging
import threading
import io
from contextlib import redirect_stdout, redirect_stderr
from RestrictedPython import compile_restricted, safe_globals

logger = logging.getLogger(__name__)

def execute_safe_python(code: str, timeout: int = 10) -> dict:
    """Executes Python code in a restricted environment."""
    output = io.StringIO()
    stderr = io.StringIO()
    
    def run():
        try:
            # Compile with restricted access
            byte_code = compile_restricted(code, filename='<string>', mode='exec')
            
            # Run in safe environment
            with redirect_stdout(output), redirect_stderr(stderr):
                exec(byte_code, safe_globals, {})
        except Exception as e:
            print(f"Error: {e}", file=stderr)

    thread = threading.Thread(target=run)
    thread.start()
    thread.join(timeout)
    
    if thread.is_alive():
        return {"output": output.getvalue(), "stderr": "Execution timed out.", "success": False}
        
    return {"output": output.getvalue(), "stderr": stderr.getvalue(), "success": not stderr.getvalue()}
