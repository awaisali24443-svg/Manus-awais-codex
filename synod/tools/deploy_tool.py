import os
import subprocess
import logging

logger = logging.getLogger(__name__)
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))

def deploy_to_render(service_id: str, deploy_hook_url: str) -> str:
    """Triggers a deployment on Render using a deploy hook URL."""
    try:
        import httpx
        # Synchronous request for simplicity, though async is better
        response = httpx.post(deploy_hook_url)
        response.raise_for_status()
        return f"Successfully triggered deployment for service {service_id} on Render."
    except Exception as e:
        logger.error(f"Render deployment failed: {e}")
        return f"Error triggering Render deployment: {e}"

def deploy_to_vercel(project_dir: str, token: str) -> str:
    """Deploys a project to Vercel using the Vercel CLI."""
    target_dir = os.path.join(WORKSPACE_DIR, project_dir)
    if not os.path.exists(target_dir):
        return f"Error: Directory {project_dir} not found in workspace."
        
    try:
        # Requires vercel CLI to be installed: npm i -g vercel
        res = subprocess.run(
            ["vercel", "--prod", "--token", token, "--yes"],
            cwd=target_dir,
            capture_output=True,
            text=True,
            timeout=60.0
        )
        if res.returncode == 0:
            return f"Successfully deployed to Vercel:\n{res.stdout}"
        else:
            return f"Vercel deployment failed:\n{res.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: Vercel deployment timed out after 60s."
    except Exception as e:
        logger.error(f"Vercel deployment failed: {e}")
        return f"Error executing Vercel deployment: {e}"
