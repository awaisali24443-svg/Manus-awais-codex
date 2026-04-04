import os
import asyncio
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

@asynccontextmanager
async def lifespan(app: FastAPI):
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

class TaskRequest(BaseModel):
    goal: str

@app.post("/api/tasks")
async def create_task(request: TaskRequest, background_tasks: BackgroundTasks, api_key: str = Depends(get_api_key)):
    if not request.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")
        
    task = task_manager.create_task(request.goal)
    
    # Start the agent loop in the background
    asyncio.create_task(run_agent_workflow(task.task_id, request.goal))
    
    return {"task_id": task.task_id, "status": task.status.value}

async def run_agent_workflow(task_id: str, goal: str):
    # This is a simplified wrapper to integrate planning before the main loop
    try:
        task_manager.log_event(task_id, "Generating execution plan...")
        plan = await planner.create_plan(goal)
        plan_writer.write_plan(plan)
        
        # Store plan in task state for the API to read
        task = task_manager.get_task(task_id)
        if task:
            task.plan = [{"step_id": p.step_id, "description": p.description, "agent": p.agent, "tool": p.tool, "status": p.status} for p in plan]
            task_manager.save_task(task)
            
        task_manager.update_state(task_id, State.ANALYZE)
            
        # Run the main agent loop
        await agent_loop.run(task_id)
        
    except Exception as e:
        task_manager.log_event(task_id, f"Workflow failed: {str(e)}")
        task = task_manager.get_task(task_id)
        if task:
            task.fail_or_retry()
            task_manager.save_task(task)

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, api_key: str = Depends(get_api_key)):
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
    screenshots_dir = os.path.join("workspace", "screenshots")
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
async def get_task_logs(task_id: str, api_key: str = Depends(get_api_key)):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task.task_id, "logs": task.logs}

@app.get("/api/tasks")
async def list_tasks(api_key: str = Depends(get_api_key)):
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

@app.get("/")
async def health_check():
    return {
      "status": "online",
      "service": "Synod Backend API",
      "version": "1.0.0"
    }
