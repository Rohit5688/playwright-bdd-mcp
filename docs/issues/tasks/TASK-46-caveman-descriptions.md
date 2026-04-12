# TASK-46: "Caveman" Protocol Tool Description Standardization

**Tier:** 2 (Product UX / LLM Routing)  
**Target Files:** `src/index.ts`

## 1. Description
Tool routing is the most common point of failure for agents. If descriptions are vague, the LLM picks the wrong tool. We must normalize all descriptions to the "High-Density Case/Outcome/Mechanism" standard (Caveman Protocol).

## 2. Execution Steps
1. **Review descriptions**: Every tool in `src/index.ts` must use the format:
   `WHEN TO USE: [trigger] \n WHAT IT DOES: [effect] \n HOW IT WORKS: [logic]`
2. **Eliminate Ambiguity**: Ensure `analyze_codebase` vs `execute_sandbox_code` descriptions clearly steer the LLM toward Turbo Mode for projects > 5 files.
3. **Add "Anti-Usage" notes**: Mention when NOT to use a tool (e.g., "Do not use run_playwright_test for single line selector verification; use verify_selector").

## 3. Exit Criteria
- 100% of tool descriptions follow the template.
- Test routing accuracy improves in complex multi-agent scenarios.
