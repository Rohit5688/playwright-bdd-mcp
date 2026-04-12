# TASK-70: JSON-RPC Pipe Hardening & Error DNA

**Tier:** 1 (Stability)  
**Reference:** AppForge Stability Patch `v1.8.4`
**Target Files:** `src/utils/Runner.ts`, `src/services/SelfHealingService.ts`

## 1. Description
Two-part stability hardening:
1. **Pipe Protection**: Prevent child process logs from leaking into the MCP `stdout`, which can corrupt the JSON-RPC connection.
2. **Error DNA**: Classify errors into `Infrastructure`, `Logic`, and `Transient` to help the AI decide on the correct recovery path.

## 2. Execution Steps
- **Refactor `Runner.ts`**: Use `stdio: ['ignore', 'pipe', 'pipe']` and ensure all sub-process output is captured into logs, not the main process stream.
- **Implement Error Classifier**: A utility to parse common Playwright/Shell errors into specific DNA codes.
- **Update Handlers**: Wrap all tool entries in a "Pipe-Safe" envelope.

## 3. Exit Criteria
- Running a test with heavy logging no longer causes "JSON-RPC parse error" in the MCP client.
- `self_heal` receives structured error DNA instead of raw stack traces.
