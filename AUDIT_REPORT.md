# Synod AI (Awais Codex) - Comprehensive Audit Report

## Executive Summary
This audit evaluates the Synod AI project against the architecture of Manus AI. While the foundational elements (FastAPI backend, React frontend, Firebase integration, multi-agent routing) are present, several critical gaps prevent the system from functioning autonomously or securely in a production environment (such as Google Cloud Run). The most severe issues lie in the Agent Loop's inability to execute tools, lack of structured LLM output parsing, and environmental incompatibilities with the Docker sandbox.

---

## 🔴 CRITICAL GAPS (Must Fix Immediately)

### 1. Agent Loop Tool Execution is Stubbed
**Issue:** The `AgentLoop` in `agent_loop.py` calls the `LLMRouter` to get a response for a step, but it **never parses or executes tool calls**. It simply logs the LLM's text output and marks the step as `COMPLETED`. The `ToolExecutor` is instantiated but never used.
**Impact:** The agents cannot interact with the environment. They cannot run code, search the web, or read/write files. The system is effectively a chatbot, not an autonomous agent.
**Remediation:** Implement a parsing mechanism in `AgentLoop` to extract tool calls (e.g., JSON or XML tags) from the LLM response, execute them via `ToolExecutor`, append the results to the event stream, and feed them back to the LLM until the step is complete.

### 2. LLM Output Structure & Prompting
**Issue:** The sub-agents (`SoftwareEngineer`, `LogicAgent`, `ResearchAgent`) are prompted to "Output ONLY code" or similar unstructured text. They are not aware of the available tools or how to format a tool call.
**Impact:** Even if the Agent Loop could parse tool calls, the LLMs would not generate them correctly.
**Remediation:** Update the system prompts for all agents to include the `tool_schemas` and enforce a strict output format (e.g., ReAct pattern: Thought, Action, Action Input).

### 3. Docker Sandbox Incompatibility with Cloud Run
**Issue:** `synod/tools/sandbox.py` uses `subprocess.run(["docker", "run", ...])` to execute Python code. This requires the host environment to have the Docker daemon running. In serverless environments like Google Cloud Run, Docker-in-Docker (DinD) is not supported.
**Impact:** The `run_python` tool will fail in production, breaking any code execution tasks.
**Remediation:** Replace the local Docker sandbox with a remote code execution environment (e.g., E2B, Modal, or a dedicated secure microservice) or use a secure Python interpreter (like RestrictedPython or WebAssembly/Pyodide) if it must run within the same container.

### 4. Internal Monologue is Mocked
**Issue:** The frontend displays an "Internal Monologue" (Observations, Thoughts, Actions), but `server.py` returns a hardcoded mock dictionary for this data. The LLMs do not generate or store this monologue.
**Impact:** The user has no visibility into the agent's actual reasoning process.
**Remediation:** Require the LLMs to output their reasoning (Thoughts/Observations) alongside tool calls. Parse this data in the Agent Loop and save it to the `TaskState` in Firestore so the frontend can display it.

---

## 🟠 MAJOR GAPS (High Priority)

### 5. Playwright & Dockerfile Environment Dependencies
**Issue:** `browser_tool.py` uses Playwright for web automation. Playwright requires system-level browser binaries (e.g., Chromium) to be installed via `playwright install`. Furthermore, the current `Dockerfile` uses `backend.main:app` on port 8000, while the project has migrated to `server:app` on port 3000. It also lacks Node.js to build the React frontend.
**Impact:** If deployed via Docker, the browser tool will crash, the frontend will not be built or served, and the wrong backend entry point will be used.
**Remediation:** Update the `Dockerfile` to use a multi-stage build (Node.js for frontend, Python for backend), install Playwright browsers (`playwright install --with-deps chromium`), install `git`, and set the correct entry point (`server:app` on port 3000).

### 6. Firestore Vector Search Indexing
**Issue:** `global_memory.py` uses Firestore's native Vector Search (`find_nearest`). This feature requires a composite index on the vector field to function.
**Impact:** Memory retrieval will fail with a "FAILED_PRECONDITION: The query requires an index" error until the index is manually created in the Firebase Console.
**Remediation:** Document the exact Firebase CLI command or Console steps required to create the vector index in the `README.md`.

### 7. Git Operations Authentication & Environment
**Issue:** `git_operations` in `builtin_tools.py` uses `subprocess.run(["git", ...])`. This assumes `git` is installed in the container and that the container has the necessary SSH keys or credentials to push to remote repositories.
**Impact:** Auto-commit and push features will fail in production due to missing credentials or git binaries.
**Remediation:** Ensure `git` is installed in the Dockerfile. Update the tool to explicitly handle GitHub/GitLab Personal Access Tokens (PATs) via environment variables for HTTPS authentication.

### 8. Duplicate Frontend Applications
**Issue:** The repository contains both `/src/App.tsx` (updated with Firebase) and `/frontend/src/App.jsx` (outdated polling version).
**Impact:** Confusion over which frontend is the source of truth, potentially leading to deployment of the wrong version.
**Remediation:** Delete the outdated `/frontend/src` directory and consolidate the build process around the Vite + React + TypeScript setup in the root.

---

## 🟡 MINOR GAPS (Enhancements)

### 9. Tool Registry Initialization
**Issue:** `ToolExecutor` was previously instantiated with an empty registry. (Note: Partially fixed during audit by adding `get_default_registry()`).
**Remediation:** Ensure all new tools are properly registered in `__init__.py` with their required permissions.

### 10. API Key Security
**Issue:** `server.py` uses a hardcoded default API key (`"default_secret_key"`) if `SYNOD_API_KEY` is not set.
**Impact:** Potential unauthorized access to the API if deployed without setting the environment variable.
**Remediation:** Remove the default value and raise an error on startup if the API key is missing in production.

### 11. LLM Rate Limiting & Error Handling
**Issue:** `SoftwareEngineer` has a hardcoded rate limit (5 RPM) for Anthropic. Other agents (using Groq) do not have explicit rate limiting.
**Impact:** High concurrency or complex tasks could trigger 429 Too Many Requests errors from Groq.
**Remediation:** Implement a global rate limiter or robust exponential backoff with jitter for all LLM API calls.

---

## Conclusion
Synod AI has a solid architectural foundation, but the execution layer is currently disconnected from the reasoning layer. To achieve Manus AI equivalence, the immediate focus must be on closing the loop: parsing tool calls from the LLM, executing them safely (avoiding Docker-in-Docker issues), and feeding the results back into the context window.
