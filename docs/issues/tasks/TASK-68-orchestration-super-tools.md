# TASK-68: Orchestration Super-Tools (Atomicity)

**Tier:** 3 (Autonomy / Efficiency)  
**Reference:** AppForge `OrchestrationService.ts`
**Target Files:** `src/services/OrchestrationService.ts`, `src/index.ts`

## 1. Description
TestForge currently requires the agent to call multiple tools to complete a single logical operation (e.g., self-healing). We need to port the "Super-Tool" pattern from AppForge to reduce agent turn counts and improve success rates for complex operations.

## 2. Execution Steps
- **Implement `OrchestrationService`**: Create a service to coordinate multi-step transactions.
- **Implement `create_test_atomically`**: One-hop tool to Validate -> Write -> Verify.
- **Implement `heal_and_verify_atomically`**: One-hop tool to Healer -> Verifier -> Learner.
- **Register Tools**: Add the new atomic tools to `index.ts`.

## 3. Exit Criteria
- `heal_and_verify_atomically` successfully fixes a broken selector and trains the learning system in a single tool call.
- Agent turn count for standard test generation is reduced by 2.
