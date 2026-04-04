import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List

# Initialize Firebase before importing other modules that might use it
import synod.firebase.firebase_init

from synod.core.task_manager import TaskManager
from backend.task_runner import TaskRunner

app = FastAPI(title="Synod API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

task_manager = TaskManager()
task_runner = TaskRunner(task_manager)

class TaskRequest(BaseModel):
    goal: str

@app.post("/api/tasks")
async def create_task(request: TaskRequest, background_tasks: BackgroundTasks):
    if not request.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")
        
    task = task_manager.create_task(request.goal)
    
    # Start the agent loop in the background
    background_tasks.add_task(task_runner.run_task, task.task_id, request.goal)
    
    return {"task_id": task.task_id, "status": task.status.value}

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Format logs for the frontend
    formatted_logs = [{"type": "info", "text": log} for log in task.logs]
    
    monologue = {
        "observations": [f"Observing state for task {task_id}"],
        "thoughts": [f"Current step: {task.current_step}"],
        "actions": [f"Executing in state: {task.status.value}"]
    }
    
    return {
        "task_id": task.task_id,
        "status": task.status.value,
        "state": task.status.value,
        "current_agent": "MasterAgent",
        "progress": 50 if task.status.value not in ["COMPLETE", "FAIL"] else (100 if task.status.value == "COMPLETE" else 0),
        "logs": formatted_logs,
        "plan": getattr(task, 'plan', []),
        "monologue": monologue
    }

@app.get("/api/tasks/{task_id}/logs")
async def get_task_logs(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task.task_id, "logs": task.logs}

@app.get("/api/tasks")
async def list_tasks():
    tasks = []
    for task_id, task in task_manager._tasks.items():
        tasks.append({
            "task_id": task.task_id,
            "goal": task.goal,
            "status": task.status.value
        })
    return {"tasks": tasks}
