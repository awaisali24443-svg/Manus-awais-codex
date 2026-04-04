# Synod Final Audit Report

## Angle 1 — Correctness

### Findings

1.  **`synod/agents/master_agent.py` - `decompose_task` (Lines 49-78)**
    *   **Issue:** The docstring says "Return ONLY a valid JSON object with a 'steps' key containing a list of step description strings." However, if the LLM returns invalid JSON, the exception block `except json.JSONDecodeError as e:` catches it and returns `[goal]`. While it handles the edge case, it doesn't strictly enforce the JSON format or retry.
    *   **Type:** Returns `List[str]`, which is correct.
    *   **Unhandled Exception:** No, it catches `Exception`.
2.  **`synod/agents/llm_router.py` - `route` (Lines 20-81)**
    *   **Issue:** The docstring states "Implements failover: if SoftwareEngineer fails, fallback to LogicAgent." The implementation does this, but if `LogicAgent` fails during the fallback, it raises the exception `fallback_e` (line 73). This exception is unhandled within the `route` method and will propagate up to the caller (`agent_loop.py`).
    *   **Type:** Returns `str`, which is correct.
    *   **Unhandled Exception:** Yes, `fallback_e` can be thrown.
3.  **`synod/tools/executor.py` - `execute` (Lines 41-83)**
    *   **Issue:** The docstring says "Executes a tool securely with a 10-second timeout and output capture." However, if a tool function is not asynchronous (e.g., `run_python`), it uses `asyncio.to_thread`. If the synchronous function blocks indefinitely (e.g., an infinite loop in `run_python` that escapes the sandbox timeout), `asyncio.wait_for` will cancel the thread's future, but the underlying thread might still run, potentially causing a resource leak.
    *   **Type:** Returns `ToolResult`, which is correct.
    *   **Unhandled Exception:** No, it catches `Exception`.
4.  **`synod/core/agent_loop.py` - `_handle_execute` (Lines 139-220)**
    *   **Issue:** The `_parse_react_response` method uses regex to find `<tool_call>` and `<task_completed>`. If the LLM outputs malformed tags (e.g., missing closing tags), the regex might fail to match, leading to an empty `parsed` dictionary. The loop handles this by nudging the LLM, but it could get stuck in a loop if the LLM consistently generates malformed tags.
    *   **Type:** Returns `State`, which is correct.
    *   **Unhandled Exception:** No, exceptions are caught in the main `run` loop.
5.  **`synod/tools/browser_tool.py` - `browser_screenshot` (Lines 62-75)**
    *   **Issue:** *[FIXED DURING AUDIT]* The method generated a random filename `screenshot_{uuid.uuid4().hex[:8]}.png`. It didn't clean up old screenshots. Over time, the `workspace/screenshots` directory would grow unbounded. I have added cleanup logic to keep only the latest 5 screenshots.
    *   **Type:** Returns `str` (path), which is correct.
    *   **Unhandled Exception:** Yes, if `page.screenshot` fails (e.g., page closed), it will throw an exception that is not caught within the method.
6.  **`synod/memory/global_memory.py` - `search_memory` (Lines 39-67)**
    *   **Issue:** The method uses `self.db.collection("global_memories").find_nearest`. If the collection doesn't exist or doesn't have a vector index configured, this will throw an exception. The exception is caught and logged, returning an empty list, which is safe but might hide configuration issues.
    *   **Type:** Returns `List[Dict[str, Any]]`, which is correct.
    *   **Unhandled Exception:** No, catches `Exception`.
7.  **`synod/tools/builtin_tools.py` - `git_operations` (Lines 67-104)**
    *   **Issue:** *[FIXED DURING AUDIT]* The `action == "commit"` block runs `git add .` and then `git commit`. If there are no changes to commit, `git commit` will return a non-zero exit code (usually 1). The function checked `if res.returncode == 0: return res.stdout else: return f"Git Error:\n{res.stderr}"`. This meant a "clean working tree" was reported as a "Git Error". I have added logic to handle "nothing to commit".
    *   **Type:** Returns `str`, which is correct.
    *   **Unhandled Exception:** No, catches `Exception`.

## Angle 2 — Integration

### Flow Traces

**a) `server.py` → `run_agent_workflow` → `agent_loop.run`**
*   **Flow:** `server.py` receives a POST request, creates a task, and calls `asyncio.create_task(run_agent_workflow(task.task_id, request.goal))`. `run_agent_workflow` generates a plan, updates the task state, and awaits `agent_loop.run(task_id)`.
*   **Integration:** Correct. `agent_loop.run` is awaited. The task ID is passed correctly.

**b) `agent_loop` → `llm_router` → `agents` → `response`**
*   **Flow:** `agent_loop._handle_execute` calls `await self.llm_router.route(step_desc, context)`. `llm_router.route` calls `master.route_step` to determine the agent, then calls the specific agent's method (e.g., `software_engineer.generate_code`).
*   **Integration:** Correct. All agent methods (`generate_code`, `solve`, `research`) are async and awaited correctly. The return type is a string containing the ReAct response.

**c) `response` → `_parse_react_response` → `tool_executor`**
*   **Flow:** `agent_loop._handle_execute` passes the response string to `_parse_react_response`, which returns a dictionary. If a tool call is present, it extracts `tool_name` and `tool_params` and calls `await self.tool_executor.execute(parsed["tool_name"], parsed["tool_params"] or {})`.
*   **Integration:** Correct. The parsed parameters are passed to the executor.

**d) `tool_executor` → `tool function` → `ToolResult`**
*   **Flow:** `tool_executor.execute` retrieves the tool from the registry. It checks if the tool function is a coroutine. If so, it awaits it; otherwise, it runs it in a thread. It wraps the result in a `ToolResult` object.
*   **Integration:** Correct. The handling of both sync and async tool functions is implemented correctly using `asyncio.iscoroutinefunction`.

**e) `ToolResult` → `task_memory.save_event` → `RTDB`**
*   **Flow:** `agent_loop._handle_execute` receives the `ToolResult`. It extracts the output or stderr and calls `self.task_memory.save_event(task.task_id, "observation", obs_content, "system")`. `task_memory.save_event` pushes the event to Firebase RTDB.
*   **Integration:** Correct. The data types match.

**f) `RTDB` → `App.tsx onValue` → `UI render`**
*   **Flow:** `App.tsx` sets up an `onValue` listener on `tasks/${taskId}/events`. When data changes, it updates the `logs` state, which triggers a re-render of the terminal UI.
*   **Integration:** Correct. The frontend correctly parses the RTDB snapshot into an array and sorts it by timestamp.

### Findings
*   **Async/Await:** All major async/await pairs appear correct. `asyncio.to_thread` is used appropriately for synchronous tools.
*   **Data Types:** Data types passed between modules are generally correct (strings, dicts, lists).

## Angle 3 — Security

### Findings

1.  **API Key Enforcement:**
    *   **Status:** SAFE *[FIXED DURING AUDIT]*. The `get_api_key` dependency in `server.py` previously allowed requests if the `X-API-Key` header was missing. I have updated it to strictly require the header and validate it against `SYNOD_API_KEY`.
    *   **Severity:** CRITICAL (Fixed).
2.  **Code Execution Sandbox:**
    *   **Status:** VULNERABLE. `synod/tools/sandbox.py` uses `RestrictedPython`. This provides a basic level of security by restricting built-ins and globals. However, `RestrictedPython` is not a true sandbox and can often be bypassed by determined attackers (e.g., via introspection or exploiting allowed modules). For a production system executing untrusted LLM-generated code, a stronger sandbox (e.g., Docker container, gVisor, or WebAssembly) is highly recommended.
    *   **Severity:** HIGH.
3.  **Sensitive Data in Logs:**
    *   **Status:** SAFE *[FIXED DURING AUDIT]*. The `ToolExecutor` previously logged all parameters passed to tools in plain text. I have added a `_redact_params` method to mask keys like "token", "api_key", "password", and "secret" before logging.
    *   **Severity:** MEDIUM (Fixed).
4.  **CORS Configuration:**
    *   **Status:** SAFE. The wildcard `*` was removed from `allow_origins` when `allow_credentials=True` is set. It now explicitly allows `http://localhost:5173`, `http://localhost:3000`, and the `FRONTEND_URL` env var.
    *   **Severity:** LOW.
5.  **File Path Traversal:**
    *   **Status:** SAFE. `synod/tools/builtin_tools.py` uses `_enforce_workspace` which utilizes `os.path.commonpath` to ensure all file operations are strictly within the `workspace` directory.
    *   **Severity:** LOW.
6.  **Hardcoded API Keys:**
    *   **Status:** SAFE. All API keys (Groq, Anthropic, Supabase, Firebase, SerpAPI, GitHub) are loaded from environment variables.
    *   **Severity:** LOW.
7.  **Token Injection in Git URLs:**
    *   **Status:** SAFE. `git_operations` constructs the auth URL securely: `auth_url = f"{parts[0]}://oauth2:{token}@{parts[1]}"`.
    *   **Severity:** LOW.

## Angle 4 — Performance

### Findings

1.  **Synchronous Calls Blocking Async Loop:**
    *   **Issue:** In `synod/core/task_manager.py`, the Firestore operations (`set`, `update`, `get`) are synchronous. Since `TaskManager` is called directly from the async `AgentLoop` (e.g., `self.task_manager.save_task(task)`), these synchronous network calls will block the main asyncio event loop, degrading performance for concurrent tasks.
    *   **Impact:** HIGH. Can cause the server to become unresponsive under load.
2.  **Firebase Reads/Writes Efficient:**
    *   **Issue:** The `AgentLoop` calls `self.task_manager.save_task(task)` very frequently (after every thought, action, observation, and state change). This results in a high volume of writes to Firestore.
    *   **Impact:** MEDIUM. Could lead to high Firestore costs and potential rate limiting. Batching updates or debouncing saves would improve efficiency.
3.  **Memory Leaks:**
    *   **Issue:** If the `AgentLoop` crashes before the `finally` block, the Playwright browser instance might not be closed properly, leading to zombie processes and memory leaks. (Screenshot cleanup was fixed during this audit).
    *   **Impact:** MEDIUM.
4.  **Unnecessary Sequential API Calls:**
    *   **Issue:** In `synod/planning/planner.py`, the step routing is parallelized using `asyncio.gather`, which is good. However, the main `AgentLoop` executes steps sequentially. This is expected for dependent steps, but independent steps could theoretically be executed in parallel.
    *   **Impact:** LOW. Expected behavior for a sequential planner.
5.  **Context Window Growing Unbounded:**
    *   **Issue:** `synod/memory/working_memory.py` implements a truncation strategy: `raw_context = header + "\n[...context truncated...]\n" + tail`. This prevents the context window from growing infinitely and crashing the LLM.
    *   **Impact:** LOW (Mitigated).
6.  **N+1 Query Problems:**
    *   **Issue:** None identified in the current data model.
    *   **Impact:** LOW.
7.  **Tool Timeout:**
    *   **Issue:** The 10-second timeout in `ToolExecutor` is generally appropriate, but might be too short for complex web searches or large git clones.
    *   **Impact:** LOW.

## Angle 5 — Manus Parity

### Feature Comparison

| Feature | Score (0-10) | Notes |
| :--- | :--- | :--- |
| **Agent Loop Completeness** | 8/10 | Solid ReAct implementation with state machine. Lacks advanced self-correction or dynamic replanning mid-execution. |
| **Memory System** | 7/10 | Good separation of working, task, and global memory. Supabase integration for vector search is a plus. Lacks sophisticated memory consolidation or episodic memory. |
| **Tool Execution** | 7/10 | Good basic tools. Sandbox is weak (`RestrictedPython`). Lacks advanced tools like direct database access or complex API integrations out-of-the-box. |
| **Browser Automation** | 8/10 | Playwright integration is robust. Screenshot capability added. Lacks advanced interaction like drag-and-drop or handling complex auth flows automatically. |
| **Multi-agent Routing** | 8/10 | Master agent routes to specialized agents (Software, Logic, Research). Good failover logic implemented. |
| **Error Recovery** | 7/10 | Basic retry logic exists (up to 3 retries). Injects error context into the next prompt. Lacks sophisticated root-cause analysis before retrying. |
| **Frontend Experience** | 8/10 | Clean, informative UI with live terminal, progress bar, and screenshot viewer. Real-time updates via RTDB work well. |
| **Production Readiness** | 6/10 | Several critical issues fixed during audit, but synchronous DB calls blocking the event loop and a weak sandbox remain. |

**Overall Manus Parity Score:** 73.75%

### What is Missing for True Parity:
1.  **True Sandboxing:** Manus uses secure, isolated Docker containers for code execution. Synod uses `RestrictedPython`, which is insufficient for untrusted LLM code.
2.  **Dynamic Replanning:** Synod generates a plan upfront and executes it sequentially. Manus can dynamically adjust its plan based on new discoveries or persistent failures.
3.  **Advanced Browser Interaction:** Manus can navigate complex, dynamic web apps, handle captchas, and manage sessions more robustly.
4.  **Asynchronous Architecture:** Manus likely uses a fully asynchronous, event-driven architecture (e.g., Kafka, Celery) to handle long-running tasks without blocking the main API server.

## VERDICT

**Production Ready: CONDITIONAL**

The system is functional and many critical bugs have been fixed. However, it requires a few architectural changes before it can be safely deployed to a production environment with concurrent users.

### Recommended Actions Before Deploy:

1.  **HIGH: Implement Async Firestore:** Replace the synchronous `google.cloud.firestore` client with the asynchronous `google.cloud.firestore_v1.async_client.AsyncClient` in `TaskManager` and `GlobalMemory` to prevent blocking the FastAPI event loop.
2.  **HIGH: Strengthen Sandbox:** Replace `RestrictedPython` with a more secure execution environment, such as a temporary Docker container or a WebAssembly runtime, for executing LLM-generated code.
3.  **MEDIUM: Optimize Firestore Writes:** Implement debouncing or batching for `task_manager.save_task` to reduce the number of write operations during the agent loop.
4.  **MEDIUM: Robust Browser Cleanup:** Ensure the Playwright browser instance is always closed, even if the FastAPI server process is forcefully terminated or crashes outside the `finally` block.
