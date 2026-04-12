# TASK-29 — Add Tool Annotations + `structuredContent` to All Tools

**Status**: TODO  
**Priority**: 🟠 P1 — Quality (Depends on TASK-28)  
**Effort**: Small  
**Applies to**: TestForge  
**Prerequisite**: TASK-28 must be DONE first (needs `registerTool` pattern)

---

## Problem

After TASK-28 migrates to `server.registerTool()`, two modern SDK features will still be missing:

1. **Tool annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` tell upstream MCP clients how to handle each tool (confirmation dialogs, caching, etc.)
2. **`structuredContent`** in responses — returns a typed JSON object alongside the text representation, allowing MCP clients to parse results programmatically without regex

Both are zero-risk additions (pure additions, no logic changes).

---

## What To Do

### 1. Tool Annotations

Already defined in TASK-28's annotation table. Ensure every `registerTool` call has the `annotations` block.

### 2. `structuredContent` in Tool Responses

For tools that return JSON, add `structuredContent` alongside `content`:

**Before:**
```typescript
return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
```

**After:**
```typescript
return {
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  structuredContent: result   // same object, unserialised
};
```

Priority tools to add `structuredContent` to first:
1. `analyze_codebase` — returns large AST analysis object
2. `summarize_suite` — returns suite stats
3. `check_environment` — returns readiness boolean + check list
4. `self_heal_test` — returns heal instruction + confidence
5. `execute_sandbox_code` — returns sandbox result

### 3. `outputSchema` (Optional / Advanced)

For tools with well-defined output shape, add an `outputSchema`:
```typescript
server.registerTool(
  "check_environment",
  {
    outputSchema: z.object({
      ready: z.boolean(),
      summary: z.string(),
      failCount: z.number(),
      warnCount: z.number()
    }),
    ...
  },
  handler
);
```

Only add where the output shape is stable and fully typed. Skip for prompt-returning tools.

---

## Files Changed
- `src/index.ts` — add annotations to all tools + `structuredContent` to JSON-returning tools

## Verification
```bash
npm run build   # Must pass with zero errors
```
