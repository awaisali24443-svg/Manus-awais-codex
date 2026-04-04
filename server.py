import os
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any

from synod.core.task_manager import TaskManager
from synod.core.agent_loop import AgentLoop
from synod.planning.planner import Planner
from synod.planning.plan_writer import PlanWriter

app = FastAPI(title="Synod API")

API_KEY = os.getenv("SYNOD_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "SYNOD_API_KEY environment variable not set. "
        "Refusing to start without authentication."
    )
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    # In a real app, you'd want to enforce this. 
    # For dev/preview, we'll allow it if it matches or if no key is provided (optional).
    if api_key_header and api_key_header != API_KEY:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key_header

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    background_tasks.add_task(run_agent_workflow, task.task_id, request.goal)
    
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
            
        # Run the main agent loop
        await agent_loop.run(task_id)
        
    except Exception as e:
        task_manager.log_event(task_id, f"Workflow failed: {str(e)}")
        task = task_manager.get_task(task_id)
        if task:
            task.fail_or_retry()

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, api_key: str = Depends(get_api_key)):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Format logs for the frontend
    formatted_logs = [{"type": "info", "text": log} for log in task.logs]
    
    return {
        "task_id": task.task_id,
        "status": task.status.value,
        "state": task.status.value,
        "current_agent": task.current_step[:30] if task.current_step else "MasterAgent",
        "progress": 50 if task.status.value not in ["COMPLETE", "FAIL"] else (100 if task.status.value == "COMPLETE" else 0),
        "logs": formatted_logs,
        "plan": getattr(task, 'plan', []),
        "monologue": task.monologue
    }

# Serve React App
dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        return FileResponse(os.path.join(dist_path, "index.html"))
