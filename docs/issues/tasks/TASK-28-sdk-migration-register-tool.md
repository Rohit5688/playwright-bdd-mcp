# TASK-28 — MCP SDK Modernization: Migrate to `server.registerTool()`

**Status**: TODO  
**Priority**: 🔴 P0 — Architectural (Blocks SDK upgrade path)  
**Effort**: Large  
**Applies to**: TestForge  

---

## Problem

TestForge uses the **deprecated** `setRequestHandler(ListToolsRequestSchema)` / `setRequestHandler(CallToolRequestSchema)` pattern throughout `src/index.ts`. The current MCP TypeScript SDK recommends `server.registerTool()` exclusively. The old pattern:
- Cannot support `outputSchema` (typed structured responses)
- Cannot support per-tool `annotations` (`readOnlyHint`, `destructiveHint`, etc.)
- Cannot support `structuredContent` in responses
- Is incompatible with future SDK versions
- Prevents discoverability improvements upstream MCP clients depend on

---

## What To Do

Migrate `src/index.ts` from:  
```typescript
// OLD — Deprecated, remove entirely
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => { switch(name) { ... } });
```

To the modern pattern for **each tool**:
```typescript
server.registerTool(
  "tool_name",
  {
    title: "Human Readable Name",
    description: "WHEN TO USE: ... WHAT IT DOES: ... HOW IT WORKS: ...",
    inputSchema: z.object({ ... }).strict(),   // Zod schema
    annotations: {
      readOnlyHint: true,      // Does not modify state
      destructiveHint: false,  // Does not delete/overwrite
      idempotentHint: true,    // Same args = same result
      openWorldHint: false     // No external API calls
    }
  },
  async (params) => {
    // handler body (same logic as current switch case)
    return { content: [{ type: "text", text: result }] };
  }
);
```

### Annotation Guide Per Tool

| Tool | readOnly | destructive | idempotent | openWorld |
|---|---|---|---|---|
| `workflow_guide` | true | false | true | false |
| `analyze_codebase` | true | false | false | false |
| `generate_gherkin_pom_test_suite` | true | false | false | false |
| `run_playwright_test` | false | false | false | false |
| `validate_and_write` | false | true | false | false |
| `manage_env` (read) | true | false | true | false |
| `manage_env` (write) | false | false | false | false |
| `setup_project` | false | true | false | false |
| `repair_project` | false | false | true | false |
| `summarize_suite` | true | false | false | false |
| `manage_config` (read) | true | false | true | false |
| `manage_config` (write) | false | false | false | false |
| `inspect_page_dom` | true | false | false | true |
| `self_heal_test` | true | false | false | true |
| `execute_sandbox_code` | false | false | false | false |
| `check_environment` | true | false | false | false |
| `audit_locators` | true | false | false | false |
| `audit_utils` | true | false | false | false |
| `start_session` | false | false | false | false |
| `end_session` | false | false | false | false |
| `navigate_session` | false | false | false | true |
| `verify_selector` | true | false | true | false |
| `train_on_example` | false | false | false | false |
| `export_team_knowledge` | true | false | true | false |
| `generate_ci_pipeline` | false | false | false | false |
| `export_jira_bug` | true | false | true | false |
| `migrate_from_selenium` | true | false | true | false |
| `suggest_refactorings` | true | false | false | false |
| `generate_fixture` | true | false | true | false |
| `analyze_coverage_gaps` | true | false | false | false |
| `update_visual_baselines` | false | false | false | false |
| `manage_users` | false | false | false | false |
| `request_user_clarification` | false | false | false | false |
| `upgrade_project` | false | false | true | false |

### Also Required
- Replace raw JSON Schema `inputSchema: { type: "object", properties: {...} }` with **Zod schemas** for each tool
- Add `import { z } from "zod"` at top of `index.ts`
- Remove imports of `ListToolsRequestSchema`, `CallToolRequestSchema` if no longer used elsewhere

---

## Files Changed
- `src/index.ts` — full migration, tool by tool

## Verification
```bash
npm run build   # Must pass with zero errors
```

---

## Notes
- This is a large refactor. Do tool-by-tool in sequential passes to avoid token limits.
- Keep all handler logic identical — this is a structural migration, not a logic change.
- After completing, TASK-29 (structuredContent) and TASK-30 (CHARACTER_LIMIT) can be done on the new pattern.
- Reference: `Skills/reference/node_mcp_server.md` for modern patterns.
