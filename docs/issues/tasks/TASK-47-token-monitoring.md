# TASK-47: Token Budget & Session Monitoring

**Tier:** 2 (Observability)  
**Target Files:** `src/services/AnalyticsService.ts`, `src/index.ts`

## 1. Description
Agents are often "token blind". TestForge should provide feedback on the "cost" of the session to encourage efficient tool use (like Turbo Mode).

## 2. Execution Steps
1. **Implement Token Counter**: A simple heuristic-based counter per session (approx tokens for returned payloads).
2. **Register Monitoring Tools**: 
   - `get_token_budget`: Returns current session usage vs recommended project limits.
3. **Header Injection**: Append a "[Session Cost: XXX tokens]" footer to the response of high-density tools like `analyze_codebase` and `inspect_page_dom`.

## 3. Exit Criteria
- User/Agent can see token consumption in the response log.
- Excessive usage triggers a suggestion to switch to `execute_sandbox_code`.
