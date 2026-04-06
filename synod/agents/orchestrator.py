import asyncio
import re
import logging
from typing import Optional
from dataclasses import dataclass

from .master_agent import MasterAgent
from .software_engineer import SoftwareEngineer
from .logic_agent import LogicAgent
from .research_agent import ResearchAgent

@dataclass
class HookResult:
    allow: bool = True
    modified_step: str = None
    modified_context: str = None
    reason: str = ""

class OrchestratorHooks:
    def pre_route(self, step: str, agent_name: str, context: str) -> HookResult:
        """
        Called BEFORE routing to an agent.
        Can block, modify, or allow the routing decision.
        """
        # Safety check: block obviously dangerous steps
        DANGER_PATTERNS = [
            "rm -rf", "drop table", "delete all", 
            "format disk", ":(){:|:&};:"
        ]
        step_lower = step.lower()
        for pattern in DANGER_PATTERNS:
            if pattern in step_lower:
                return HookResult(
                    allow=False,
                    reason=f"Pre-route hook blocked dangerous pattern: {pattern}"
                )
        
        # Context enrichment hook: inject relevant instructions
        # for specific agent types
        if agent_name == "software_engineer":
            enriched = context + (
                "\n\n[HOOK INJECTION] Always write tests alongside code. "
                "Always verify with run_bash before task_completed."
            )
            return HookResult(allow=True, modified_context=enriched)
        
        if agent_name == "deepseek":
            enriched = context + (
                "\n\n[HOOK INJECTION] Show full chain of thought. "
                "Use numbered reasoning steps."
            )
            return HookResult(allow=True, modified_context=enriched)
        
        return HookResult(allow=True)

    def post_execute(self, step: str, agent_name: str, response: str) -> str:
        """
        Called AFTER agent execution.
        Can modify, log, or augment the response.
        """
        # If response has no ReAct tags at all, inject a warning
        has_thought = "<thought>" in response
        has_tool = "<tool_call>" in response
        has_done = "<task_completed>" in response
        
        if not has_thought and not has_tool and not has_done:
            return response + (
                "\n\n[POST-HOOK WARNING] Response contained no ReAct "
                "structure. Agent must use <thought>, <tool_call>, "
                "or <task_completed> tags."
            )
        return response

class AgentOrchestrator:
    def __init__(self):
        self.master = MasterAgent()
        self.software_engineer = SoftwareEngineer()
        self.logic_agent = LogicAgent()
        self.research_agent = ResearchAgent()
        
        from .deepseek_agent import DeepSeekAgent
        from .gemini_agent import GeminiAgent
        self.deepseek = DeepSeekAgent()
        self.gemini = GeminiAgent()
        
        self.hooks = OrchestratorHooks()
        self.logger = logging.getLogger(__name__)
        
        # Loop detection
        self._call_history: dict = {}
        self.MAX_SAME_STEP_CALLS = 3
        
        # Cross-agent shared context bus
        self._shared_context: dict = {}

    async def orchestrate(
        self,
        task_id: str,
        step: str,
        context: str,
        image_data: Optional[str] = None
    ) -> str:
        """
        Main entry point. Six-phase pipeline:
        Phase 1: Classify → which agent handles this?
        Phase 2: Pre-route hook → safety + context enrichment
        Phase 3: Loop detection → prevent infinite repetition
        Phase 4: Shared context enrichment
        Phase 5: Execute with retry + fallback chain
        Phase 6: Post-execute hook + findings extraction
        """
        
        # Phase 1: Classify
        agent_name = self._classify_step(step, image_data)
        self.logger.info(f"[ORCH] Step classified → {agent_name}")
        
        # Phase 2: Pre-route hook
        hook_result = self.hooks.pre_route(step, agent_name, context)
        if not hook_result.allow:
            self.logger.warning(f"[HOOK] Blocked: {hook_result.reason}")
            return (
                f"<thought>Action blocked by safety hook: "
                f"{hook_result.reason}</thought>"
                f"<task_completed>Step blocked for safety: "
                f"{hook_result.reason}</task_completed>"
            )
        
        # Apply hook modifications if any
        effective_context = hook_result.modified_context or context
        effective_step = hook_result.modified_step or step
        
        # Phase 3: Loop detection
        if self._is_looping(task_id, effective_step, agent_name):
            fallback = self._get_fallback_agent(agent_name)
            self.logger.warning(
                f"[ORCH] Loop detected for {agent_name}. "
                f"Forcing fallback → {fallback}"
            )
            agent_name = fallback
        
        # Phase 4: Shared context enrichment
        effective_context = self._enrich_with_shared_context(
            effective_context, task_id
        )
        
        # Phase 5: Execute with retry
        response = await self._execute_with_retry(
            agent_name, effective_step, effective_context, image_data
        )
        
        # Phase 6: Post-execute hook + findings extraction
        response = self.hooks.post_execute(effective_step, agent_name, response)
        self._extract_findings(task_id, response)
        self._record_call(task_id, effective_step, agent_name)
        
        return response

    def _classify_step(self, step: str, image_data=None) -> str:
        """
        Keyword fast-path classifier.
        No API call — instant, zero latency.
        """
        s = step.lower()
        
        # DeepSeek keywords — complex reasoning
        DEEPSEEK_KEYWORDS = [
            "algorithm", "prove", "math", "calculate", "optimize",
            "complexity", "recursive", "dynamic programming", "sort",
            "debug", "trace", "logic error", "why does this fail",
            "architecture decision", "design pattern", "performance"
        ]
        
        # Gemini keywords — research + vision + large context
        GEMINI_KEYWORDS = [
            "research", "summarize", "explain", "write an article",
            "create content", "analyze image", "describe", "report",
            "compare", "what is the difference", "pros and cons",
            "large document", "pdf", "transcribe"
        ]
        
        # Code keywords — software engineer (Claude)
        CODE = [
            "write code", "implement", "create file", "build",
            "develop", "function", "class", "refactor",
            "scaffold", "add feature", "fix the code"
        ]
        
        # Logic keywords — logic agent (Groq fast)
        LOGIC = [
            "calculate", "solve", "what is the answer",
            "step by step", "logic", "reasoning", "deduce"
        ]
        
        # Vision always prefers Gemini if available
        if image_data:
            return "gemini"
        
        if any(k in s for k in DEEPSEEK_KEYWORDS):
            return "deepseek"
        if any(k in s for k in GEMINI_KEYWORDS):
            return "gemini"
        if any(k in s for k in CODE):
            return "software_engineer"
        if any(k in s for k in LOGIC):
            return "logic_agent"
        
        # Default: software_engineer handles most tasks
        return "software_engineer"

    def _is_looping(self, task_id: str, step: str, agent: str) -> bool:
        history = self._call_history.get(task_id, [])
        same = sum(
            1 for s, a in history 
            if s[:50] == step[:50] and a == agent
        )
        return same >= self.MAX_SAME_STEP_CALLS

    def _get_fallback_agent(self, current: str) -> str:
        chain = {
            "software_engineer": "logic_agent",
            "logic_agent": "research_agent",
            "research_agent": "software_engineer",
            "deepseek": "logic_agent",
            "gemini": "research_agent"
        }
        return chain.get(current, "logic_agent")

    def _enrich_with_shared_context(self, context: str, task_id: str) -> str:
        findings = self._shared_context.get(task_id, [])
        if not findings:
            return context
        findings_text = "\n".join(
            f"  • {f}" for f in findings[-5:]
        )
        return (
            f"{context}\n\n"
            f"━━ SHARED FINDINGS FROM OTHER AGENTS ━━\n"
            f"{findings_text}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )

    def _extract_findings(self, task_id: str, response: str):
        completed = re.search(
            r"<task_completed>(.*?)</task_completed>",
            response, re.DOTALL
        )
        if completed:
            finding = completed.group(1).strip()[:200]
            if task_id not in self._shared_context:
                self._shared_context[task_id] = []
            self._shared_context[task_id].append(finding)
            # Keep last 10 findings
            self._shared_context[task_id] = \
                self._shared_context[task_id][-10:]

    def _record_call(self, task_id: str, step: str, agent: str):
        if task_id not in self._call_history:
            self._call_history[task_id] = []
        self._call_history[task_id].append((step[:50], agent))
        # Keep last 50 calls per task
        self._call_history[task_id] = \
            self._call_history[task_id][-50:]

    async def _execute_with_retry(
        self, agent_name: str, step: str,
        context: str, image_data=None
    ) -> str:
        """
        Execute with 3 attempts + fallback chain.
        Timeout: 45s per attempt (longer for reasoning models).
        """
        async def run_agent(name):
            if name == "software_engineer":
                return await self.software_engineer.generate_code(
                    step, context, image_data
                )
            elif name == "logic_agent":
                return await self.logic_agent.solve(step, context)
            elif name == "research_agent":
                return await self.research_agent.research(step, context)
            elif name == "deepseek":
                return await self.deepseek.reason(step, context)
            elif name == "gemini":
                return await self.gemini.generate(step, context, image_data)
            else:
                return await self.logic_agent.solve(step, context)
        
        last_error = None
        for attempt in range(3):
            try:
                self.logger.info(
                    f"[ORCH] Attempt {attempt+1}/3 → {agent_name}"
                )
                timeout = 60.0 if agent_name == "deepseek" else 45.0
                return await asyncio.wait_for(
                    run_agent(agent_name), timeout=timeout
                )
            except Exception as e:
                last_error = e
                self.logger.warning(
                    f"[ORCH] Attempt {attempt+1} failed "
                    f"for {agent_name}: {e}"
                )
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)  # 1s, 2s backoff
        
        # All 3 attempts failed — try fallback agent
        fallback = self._get_fallback_agent(agent_name)
        self.logger.error(
            f"[ORCH] {agent_name} exhausted. "
            f"Final fallback → {fallback}"
        )
        try:
            fallback_timeout = 60.0 if fallback == "deepseek" else 45.0
            return await asyncio.wait_for(
                run_agent(fallback), timeout=fallback_timeout
            )
        except Exception as e:
            raise RuntimeError(
                f"All agents failed. Primary: {last_error}. "
                f"Fallback: {e}"
            )
