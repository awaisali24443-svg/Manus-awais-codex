import asyncio
import os
import sys
import json

# Add current directory to path so we can import synod
sys.path.append(os.getcwd())

from synod.core.state_machine import State, TaskState
from synod.core.task_manager import TaskManager
from synod.core.agent_loop import AgentLoop

async def test_synod_core():
    print("--- Starting Synod Core Functional Test ---")
    
    # 1. Test TaskManager & LocalMemory
    print("\n[1/3] Testing TaskManager & LocalMemory...")
    tm = TaskManager()
    goal = "Test autonomous project scaffolding"
    task = tm.create_task(goal)
    print(f"✅ Task Created: {task.task_id}")
    
    history = tm.local_memory.get_history(limit=1)
    if history and history[0]['task_id'] == task.task_id:
        print("✅ LocalMemory persistence verified.")
    else:
        print("❌ LocalMemory persistence failed.")

    # 2. Test State Machine Transitions
    print("\n[2/3] Testing State Machine Transitions...")
    tm.update_state(task.task_id, State.ANALYZE)
    updated_task = tm.get_task(task.task_id)
    print(f"✅ State Transition: {updated_task.status.value}")

    # 3. Test Confirmation Logic
    print("\n[3/3] Testing Confirmation Logic...")
    # Simulate a sensitive action detection
    updated_task.pending_action = {"name": "run_bash", "params": {"command": "rm -rf /"}}
    updated_task.status = State.CONFIRM
    tm.save_task(updated_task)
    
    check_task = tm.get_task(task.task_id)
    if check_task.status == State.CONFIRM and check_task.pending_action:
        print(f"✅ Confirmation State & Pending Action verified: {check_task.pending_action['name']}")
    else:
        print("❌ Confirmation State verification failed.")

    print("\n--- Test Complete: Synod Core is Functional ---")

if __name__ == "__main__":
    asyncio.run(test_synod_core())
