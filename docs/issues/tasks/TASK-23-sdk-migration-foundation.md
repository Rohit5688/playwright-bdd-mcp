# TASK-23 — SDK Migration Part 1 (Foundation)

**Status**: TODO  
**Priority**: High (Infrastructure)  

## Problem
The MCP server currently uses the legacy `setRequestHandler` pattern. The modern MCP SDK recommends `server.registerTool()` for better typing, automatic schema generation, and annotation support.

## Scope
- [ ] Migrate the first 10 tools to the new `server.registerTool()` pattern.
- [ ] Implement the `ToolResponse` wrapper for structured content.
- [ ] Update `PromptFactory` to extract descriptions directly from the code annotations.

## AppForge Reference
- `TASK-23-sdk-migration-register-tool.md` / `TASK-36-sdk-migration-part1-tools-1-11.md`.
