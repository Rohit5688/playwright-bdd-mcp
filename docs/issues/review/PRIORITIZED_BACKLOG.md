# TestForge Priority Review Backlog (Hardening Session)

**Source Reference**: `APPFORGE-TO-TESTFORGE-BACKLOG.md`
**Benchmarking Report**: `BENCHMARK_ANALYSIS_RESULTS.md`
**Goal**: Match AppForge Gold Standard (Stability, Parity, Autonomy)

---

## 🔝 Tier 1: Critical Foundation (Integrity & Security)

| Task ID | Component | Summary | Why it's here |
|---|---|---|---|
| **TASK-44** | `FileWriter` | **Atomic Staging** | Prevents project corruption. Staging `.mcp-staging` + `tsc` check. |
| **TASK-10** | `Env` | **Shell Hardening** | **NEW**: Foundation task. Migrates system checks to `execFile`. |
| ~~**TASK-09**~~ | `Sandbox` | **Sandbox Hardening**| ✅ DONE: Path traversal and prototype safety. |
| ~~**TASK-48**~~ | `Runner` | **Runner Hardening** | ✅ DONE: Migration to `execFile` for command execution. |
| **TASK-49** | `Security` | **AST Stub Hunter** | Hard-rejects `// TODO` stubs via AST. |
| **TASK-01** | `Config` | **Deep Merge Fix** | Nested config persistence fix (Task-11 in AppForge). |
| **TASK-15** | `Safety` | **UserStore/Git Security**| **NEW**: Foundation task. `.gitignore` guards for credentials. |

---

## ⚡ Tier 2: Resilience & Modernization (Architecture)

| Task ID | Component | Summary | Why it's here |
|---|---|---|---|
| **TASK-43** | `Global` | **Defense Boundary** | Null-guards and catch-all safety for process stability. |
| **TASK-23** | `SDK` | **SDK Foundation** | **NEW**: Migration to `server.registerTool()` for annotations. |
| **TASK-50** | `Errors` | **Unified McpError** | Formally typed error taxonomy with retry flags. |
| **TASK-39** | `Zod` | **Structured Outputs** | **NEW**: Zod validation for all tool responses. |
| **TASK-12** | `Config` | **Pure Config Reads** | **NEW**: Foundation task. Separates read side-effects. |
| **TASK-46** | `Index` | **Caveman Descriptions**| Tool description standardization for precise routing. |
| **TASK-62** | `DomInspector` | **Smart DOM** | **NEW**: Extracts `page-agent` logic. Cuts token size by 70%. |

---

## 🧠 Tier 3: Feature Parity (Autonomous Capabilities)

| Task ID | Component | Summary | Why it's here |
|---|---|---|---|
| **TASK-45** | `Explorer` | **Autonomous Discovery**| Port AppForge's navigation graph logic (GS-09). |
| **TASK-41** | `Learning` | **Auto-Learning Loop** | **NEW**: Automates the training process after verification. |
| **TASK-34** | `Prompt` | **Prompt Tuning** | **NEW**: Compression and Mermaid graph injection. |
| **TASK-61** | `Healing` | **DNA Tracker & LCS** | **NEW**: Pre-LLM local heuristic matching. |

---

## 📝 Next Steps for Agent
1. **Initialize Task Workspace**: Pick **TASK-44** (Atomic Staging) first.
2. **Hardening Runner**: Apply **TASK-48** (Shell Security) to stabilize execution.
3. **Registry Sync**: Update tool descriptions (TASK-46).
