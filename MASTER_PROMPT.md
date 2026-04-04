# Synod AI (Awais Codex) - Master Prompt for Remediation

Use this master prompt to instruct an AI coding assistant (or yourself) to fix the critical and major gaps identified in the Synod AI audit.

---

## 🎯 Objective
Transform Synod AI from a stubbed prototype into a fully functional, autonomous agent system equivalent to Manus AI. Focus on closing the execution loop, fixing environmental incompatibilities, and implementing structured reasoning.

## 🛠️ Tasks to Execute

### 1. Implement the ReAct Loop & Tool Execution (CRITICAL)
**Files to Edit:** `/synod/core/agent_loop.py`, `/synod/agents/*.py`
- **Action:** Update the system prompts for ALL agents (`MasterAgent`, `SoftwareEngineer`, `LogicAgent`, `ResearchAgent`) to enforce a strict output format. They must output their reasoning and tool calls in a parsable format (e.g., JSON blocks or XML tags like `<thought>...</thought>` and `<tool_call>{"name": "...", "params": {...}}</tool_call>`).
- **Action:** Rewrite `_handle_execute` in `agent_loop.py` to:
  1. Parse the LLM's response for thoughts and tool calls.
  2. Save the parsed thoughts to the `TaskState`'s `monologue` (so the frontend can display them).
  3. If a tool call is found, execute it using `self.tool_executor.execute()`.
  4. Append the tool's output (or stderr) to the event stream via `task_memory.save_event()`.
  5. Loop back to the LLM with the tool result until the LLM outputs a `<task_completed>` signal.

### 2. Replace Docker Sandbox with Secure Alternative (CRITICAL)
**Files to Edit:** `/synod/tools/sandbox.py`, `/synod/tools/builtin_tools.py`
- **Context:** The current `docker run` approach will fail in Google Cloud Run (no Docker-in-Docker).
- **Action:** Replace the local Docker sandbox with a remote code execution API (e.g., E2B, Modal) OR implement a secure, restricted Python execution environment using `RestrictedPython` or a similar library that can run within the existing container without requiring the Docker daemon.

### 3. Implement Real Internal Monologue (CRITICAL)
**Files to Edit:** `/synod/core/state_machine.py`, `/synod/core/task_manager.py`, `/server.py`
- **Action:** Add a `monologue` field (Dict with `observations`, `thoughts`, `actions`) to the `TaskState` dataclass.
- **Action:** Update `task_manager.py` to save and load this field to/from Firestore.
- **Action:** Update `server.py`'s `get_task` endpoint to return the actual `task.monologue` instead of the hardcoded mock data.
- **Action:** Ensure `agent_loop.py` updates this `monologue` field as it parses LLM responses and executes tools.

### 4. Fix Dockerfile, Playwright & Git Environment Dependencies (MAJOR)
**Files to Edit:** `Dockerfile`, `README.md`
- **Action:** Rewrite the `Dockerfile` to use a multi-stage build:
  1. Node.js stage to run `npm install` and `npm run build`.
  2. Python stage to install requirements, copy the built frontend to `/dist`, and run `uvicorn server:app --host 0.0.0.0 --port 3000`.
- **Action:** Ensure the Python stage installs system dependencies for Playwright (`playwright install --with-deps chromium`) and Git (`apt-get install -y git`).
- **Action:** Update `git_operations` in `builtin_tools.py` to handle authentication securely using environment variables (e.g., `GITHUB_TOKEN`) for HTTPS pushes, avoiding SSH key complexities in containers.

### 5. Clean Up Frontend Duplication (MAJOR)
**Files to Edit:** `/frontend/src/App.jsx` (Delete)
- **Action:** Delete the outdated `/frontend/src` directory. The project should solely rely on the Vite setup in the root directory (`/src/App.tsx`).

### 6. Document Firestore Vector Search Setup (MAJOR)
**Files to Edit:** `README.md`
- **Action:** Add explicit instructions to the README on how to create the required composite index for Firestore Vector Search on the `global_memories` collection (field: `embedding`).

### 7. Secure API Keys (MINOR)
**Files to Edit:** `/server.py`
- **Action:** Remove the fallback `"default_secret_key"` for `SYNOD_API_KEY`. If the environment variable is not set in production, the server should raise an error on startup to prevent unauthorized access.

---

## ⚠️ Constraints & Guidelines
- **No Mocking:** Do not use mock data for tool results or monologues. The system must actually execute code, search the web, and reason.
- **State Persistence:** Always use `task_manager.save_task(task)` after modifying the `TaskState` object in `agent_loop.py` to ensure Firestore is updated.
- **Error Handling:** Ensure all tool execution errors (stderr, tracebacks) are captured and fed back to the LLM so it can attempt to fix its own mistakes.
