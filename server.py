import os
import asyncio
import urllib.request
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from contextlib import asynccontextmanager
from google.cloud import firestore

from synod.core.task_manager import TaskManager
from synod.core.agent_loop import AgentLoop
from synod.core.state_machine import State
from synod.planning.planner import Planner
from synod.planning.plan_writer import PlanWriter
from synod.core.task_queue import TaskQueue
from typing import List

async def ping_services():
    frontend_url = os.getenv("FRONTEND_URL")
    backend_url = os.getenv("BACKEND_URL") or os.getenv("VITE_API_URL")
    
    urls = []
    if frontend_url: urls.append(("Frontend", frontend_url))
    if backend_url: urls.append(("Backend", backend_url))
    
    if not urls:
        print("PING: No URLs set (FRONTEND_URL or BACKEND_URL), skipping background ping.")
        return
    
    print(f"PING: Starting background ping to {len(urls)} services every 10 minutes.")
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            for name, url in urls:
                try:
                    response = await client.get(url)
                    print(f"PING: {name} ping successful ({response.status_code})")
                except Exception as e:
                    print(f"PING: {name} ping failed: {e}")
            
            # Wait 10 minutes
            await asyncio.sleep(600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start ping task
    asyncio.create_task(ping_services())
    
    # On startup: recover orphaned tasks
    try:
        docs = task_manager.tasks_collection.stream()
        for doc in docs:
            data = doc.to_dict()
            if data.get("status") in ["IDLE", "ANALYZE", "PLAN", "EXECUTE", "OBSERVE", "REFLECT"]:
                task_manager.tasks_collection.document(
                    data["task_id"]
                ).update({
                    "status": "FAIL",
                    "logs": firestore.ArrayUnion(
                        ["Task marked FAIL: server restarted during execution"]
                    )
                })
    except Exception as e:
        print(f"Startup recovery failed: {e}")
    yield

app = FastAPI(title="Synod API", lifespan=lifespan)

API_KEY = os.getenv("SYNOD_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "SYNOD_API_KEY environment variable not set. "
        "Refusing to start without authentication."
    )
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if not api_key_header or api_key_header != API_KEY:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key_header

frontend_url = os.getenv("FRONTEND_URL", "")
origins = ["http://localhost:5173", "http://localhost:3000"]
if frontend_url:
    origins.insert(0, frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

task_manager = TaskManager()
agent_loop = AgentLoop(task_manager)
planner = Planner()
plan_writer = PlanWriter()
task_queue = TaskQueue()

class BatchRequest(BaseModel):
    goals: List[str]

class TaskRequest(BaseModel):
    goal: str

@app.post("/api/batch")
async def create_batch(
    request: BatchRequest, 
    api_key: str = Depends(get_api_key)
):
    if not request.goals:
        raise HTTPException(400, "At least one goal required")
    if len(request.goals) > 10:
        raise HTTPException(400, "Maximum 10 goals per batch")
    
    goals = [g.strip() for g in request.goals if g.strip()]
    batch_id = await task_queue.add_batch(goals)
    
    # Start processing the batch automatically
    asyncio.create_task(process_batch(batch_id))
    
    return {
        "batch_id": batch_id,
        "total_tasks": len(goals),
        "status": "queued",
        "message": f"Batch of {len(goals)} tasks queued. Will execute sequentially."
    }

@app.get("/api/batch/{batch_id}")
async def get_batch_status(
    batch_id: str,
    api_key: str = Depends(get_api_key)
):
    status = await task_queue.get_batch_status(batch_id)
    if not status["items"]:
        raise HTTPException(404, "Batch not found")
    return status

async def process_batch(batch_id: str):
    """Sequentially processes all items in a batch."""
    while True:
        next_item = await task_queue.get_next_queued(batch_id)
        if not next_item:
            break  # All done
        
        # Create and start the task
        task = task_manager.create_task(next_item.goal)
        await task_queue.mark_running(
            batch_id, next_item.queue_id, task.task_id
        )
        
        try:
            # Run the full workflow
            task_manager.log_event(
                task.task_id,
                f"[BATCH {batch_id[:8]}] Task {next_item.position+1} starting..."
            )
            plan = await planner.create_plan(next_item.goal)
            plan_writer.write_plan(plan)
            fetched = task_manager.get_task(task.task_id)
            if fetched:
                fetched.plan = [
                    {"step_id": p.step_id, "description": p.description,
                     "agent": p.agent, "tool": p.tool, "status": p.status}
                    for p in plan
                ]
                task_manager.save_task(fetched)
            task_manager.update_state(task.task_id, State.ANALYZE)
            await agent_loop.run(task.task_id)
            await task_queue.mark_complete(batch_id, next_item.queue_id)
        except Exception as e:
            task_manager.log_event(task.task_id, f"Batch task failed: {e}")
            await task_queue.mark_failed(batch_id, next_item.queue_id)
            # Continue to next task even if this one failed

@app.post("/api/tasks")
def create_task(request: TaskRequest, background_tasks: BackgroundTasks, api_key: str = Depends(get_api_key)):
    if not request.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")
        
    task = task_manager.create_task(request.goal)
    
    # Start the agent loop in the background
    background_tasks.add_task(run_agent_workflow, task.task_id, request.goal)
    
    return {"task_id": task.task_id, "status": task.status.value}

async def run_agent_workflow(task_id: str, goal: str):
    # This is a simplified wrapper to integrate planning before the main loop
    try:
        await asyncio.to_thread(task_manager.log_event, task_id, "Generating execution plan...")
        plan = await planner.create_plan(goal)
        await asyncio.to_thread(plan_writer.write_plan, plan)
        
        # Store plan in task state for the API to read
        task = await asyncio.to_thread(task_manager.get_task, task_id)
        if task:
            task.plan = [{"step_id": p.step_id, "description": p.description, "agent": p.agent, "tool": p.tool, "status": p.status} for p in plan]
            await asyncio.to_thread(task_manager.save_task, task)
            
        await asyncio.to_thread(task_manager.update_state, task_id, State.ANALYZE)
            
        # Run the main agent loop
        await agent_loop.run(task_id)
        
    except Exception as e:
        await asyncio.to_thread(task_manager.log_event, task_id, f"Workflow failed: {str(e)}", "error")
        task = await asyncio.to_thread(task_manager.get_task, task_id)
        if task:
            task.fail_or_retry()
            await asyncio.to_thread(task_manager.save_task, task)

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str, api_key: str = Depends(get_api_key)):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Format logs for the frontend
    formatted_logs = [{"type": "info", "text": log} for log in task.logs]
    
    completed_steps = sum(
        1 for s in (task.plan or [])
        if isinstance(s, dict) and s.get("status") == "COMPLETED"
    )
    total_steps = len(task.plan) if task.plan else 1
    if task.status.value == "COMPLETE":
        progress = 100
    elif task.status.value == "FAIL":
        progress = 0
    elif total_steps > 0:
        progress = int((completed_steps / total_steps) * 90) + 5
    else:
        progress = 10

    # Map state to active agent name
    state_to_agent = {
        "IDLE": "Initializing",
        "ANALYZE": "MasterAgent (Analyzing)",
        "PLAN": "MasterAgent (Planning)",
        "EXECUTE": f"Executing: {task.current_step[:25]}..." if task.current_step else "Executing",
        "OBSERVE": "Observer",
        "REFLECT": "Reflector",
        "RETRY": "RetryEngine",
        "COMPLETE": "Complete",
        "FAIL": "Failed"
    }
    current_agent = state_to_agent.get(task.status.value, "MasterAgent")
    
    return {
        "task_id": task.task_id,
        "status": task.status.value,
        "state": task.status.value,
        "current_agent": current_agent,
        "progress": progress,
        "logs": formatted_logs,
        "plan": getattr(task, 'plan', []),
        "monologue": task.monologue
    }

@app.get("/api/tasks/{task_id}/screenshot")
async def get_screenshot(task_id: str, api_key: str = Depends(get_api_key)):
    import os, glob
    screenshots_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "workspace", "screenshots")
    )
    if not os.path.exists(screenshots_dir):
        return {"screenshot": None}
    files = sorted(glob.glob(f"{screenshots_dir}/screenshot_*.png"),
                   key=os.path.getmtime, reverse=True)
    if not files:
        return {"screenshot": None}
    import base64
    with open(files[0], "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"screenshot": f"data:image/png;base64,{data}"}

@app.get("/api/tasks/{task_id}/logs")
def get_task_logs(task_id: str, api_key: str = Depends(get_api_key)):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task.task_id, "logs": task.logs}

@app.post("/api/tasks/{task_id}/confirm")
def confirm_task_action(task_id: str, confirmed: bool, api_key: str = Depends(get_api_key)):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status.value != "CONFIRM":
        raise HTTPException(status_code=400, detail=f"Task is not waiting for confirmation. Current state: {task.status.value}")
    
    if confirmed:
        task.status = State.EXECUTE
    else:
        task.status = State.FAIL
        task_manager.log_event(task_id, "User rejected the action.", "error")
    
    task_manager.save_task(task)
    return {"status": task.status.value}

@app.get("/api/tasks")
def list_tasks(api_key: str = Depends(get_api_key)):
    # Firestore query for all tasks
    docs = task_manager.tasks_collection.stream()
    tasks = []
    for doc in docs:
        data = doc.to_dict()
        tasks.append({
            "task_id": data.get("task_id"),
            "goal": data.get("goal"),
            "status": data.get("status")
        })
    return {"tasks": tasks}

@app.get("/api/diagnostics")
async def get_diagnostics(api_key: str = Depends(get_api_key)):
    import os
    import httpx
    from synod.firebase.firebase_init import db_client
    
    # Define all expected variables based on .env.example
    expected_vars = [
        "GROQ_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "HUGGINGFACE_API_KEY", "HF_API_KEY",
        "SERPAPI_KEY", "SUPABASE_URL", "SUPABASE_KEY", "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY_ID",
        "FIREBASE_CLIENT_ID", "FIREBASE_DATABASE_URL", "FIREBASE_STORAGE_BUCKET",
        "GITHUB_TOKEN", "GITHUB_REPO_URL", "SYNOD_API_KEY", "E2B_API_KEY",
        "FRONTEND_URL", "BACKEND_URL"
    ]
    
    env_status = {var: bool(os.getenv(var)) for var in expected_vars}
    
    checks = {
        "environment": env_status,
        "services": {
            "firestore": False,
            "sandbox": False,
            "supabase": False,
            "groq": False,
            "anthropic": False,
            "gemini": False,
            "huggingface": False,
            "serpapi": False
        },
        "errors": {}
    }
    
    # Check Firestore
    try:
        db_client.collection("tasks").limit(1).get()
        checks["services"]["firestore"] = True
    except Exception as e:
        checks["errors"]["firestore"] = str(e)
        
    # Check E2B
    if env_status.get("E2B_API_KEY"):
        try:
            from e2b_code_interpreter import Sandbox
            checks["services"]["sandbox"] = True
        except Exception as e:
            checks["errors"]["sandbox"] = str(e)

    # Check Playwright
    try:
        from playwright.async_api import async_playwright
        checks["services"]["playwright"] = True
    except Exception as e:
        checks["errors"]["playwright"] = str(e)

    # Check Supabase
    if env_status.get("SUPABASE_URL") and env_status.get("SUPABASE_KEY"):
        try:
            from synod.firebase.firebase_init import supabase_client
            if supabase_client:
                # Simple query to test connection
                supabase_client.table("tasks").select("id").limit(1).execute()
                checks["services"]["supabase"] = True
        except Exception as e:
            checks["errors"]["supabase"] = str(e)

    # Test API Keys with httpx
    async with httpx.AsyncClient(timeout=5.0) as client:
        # Groq
        if os.getenv("GROQ_API_KEY"):
            try:
                res = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}"}
                )
                checks["services"]["groq"] = res.status_code == 200
                if res.status_code != 200:
                    checks["errors"]["groq"] = f"HTTP {res.status_code}: {res.text}"
            except Exception as e:
                checks["errors"]["groq"] = str(e)
                
        # Anthropic
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                res = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={"x-api-key": os.getenv("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01"}
                )
                checks["services"]["anthropic"] = res.status_code == 200
                if res.status_code != 200:
                    checks["errors"]["anthropic"] = f"HTTP {res.status_code}: {res.text}"
            except Exception as e:
                checks["errors"]["anthropic"] = str(e)
                
        # Gemini
        if os.getenv("GEMINI_API_KEY"):
            try:
                res = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={os.getenv('GEMINI_API_KEY')}"
                )
                checks["services"]["gemini"] = res.status_code == 200
                if res.status_code != 200:
                    checks["errors"]["gemini"] = f"HTTP {res.status_code}: {res.text}"
            except Exception as e:
                checks["errors"]["gemini"] = str(e)
                
        # HuggingFace
        hf_key = os.getenv("HF_API_KEY") or os.getenv("HUGGINGFACE_API_KEY")
        if hf_key:
            try:
                res = await client.get(
                    "https://huggingface.co/api/whoami-v2",
                    headers={"Authorization": f"Bearer {hf_key}"}
                )
                checks["services"]["huggingface"] = res.status_code == 200
                if res.status_code != 200:
                    checks["errors"]["huggingface"] = f"HTTP {res.status_code}: {res.text}"
            except Exception as e:
                checks["errors"]["huggingface"] = str(e)
                
        # SerpApi
        if os.getenv("SERPAPI_KEY"):
            try:
                res = await client.get(
                    f"https://serpapi.com/search?q=test&api_key={os.getenv('SERPAPI_KEY')}"
                )
                checks["services"]["serpapi"] = res.status_code == 200
                if res.status_code != 200:
                    checks["errors"]["serpapi"] = f"HTTP {res.status_code}: {res.text}"
            except Exception as e:
                checks["errors"]["serpapi"] = str(e)

    return checks

@app.get("/")
async def health_check():
    return {
      "status": "online",
      "service": "Synod Backend API",
      "version": "1.0.0"
    }
