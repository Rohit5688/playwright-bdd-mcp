# TASK-01: Config Deep Merge Bug

**Tier:** 1 (Security & Integrity)  
**Target File:** `src/services/McpConfigService.ts`

## 1. Description
The `McpConfigService` acts as the single source of truth for the TestForge server. Currently, its `merge()` utility operates using shallow ES6 object spreads (`...base[key], ...val`). This shallow spread introduces a destructive truncation bug when nested objects in the config schema (e.g., `dirs`, `repoContext`, `methodTemplates`) expand to multiple levels. Updating a single leaf node drops all sibling nodes at that depth.

## 2. Execution Steps
1. **Locate `McpConfigService.ts`**: Identify the `merge` method or anywhere `Object.assign` / destructured spread is applied sequentially.
2. **Implement `deepMerge` Utility**: Add a private static or shared helper method:
   ```ts
   private static deepMerge<T>(target: any, source: any): T {
       // Loop recursively over source, avoiding arrays/nulls directly updating objects
       // Ensure schema integrity is maintained.
   }
   ```
3. **Migrate existing usages**: Refactor the `.write()` and `merge()` implementations to utilize the recursive utility.
4. **Validation Test**: Ensure `npm run build` succeeds under `strict` conditions.

## 3. Exit Criteria
- `mcp-config.json` can handle 3-level deep object updates without destructively deleting sibling configurations.
- All code correctly imports and parses without compile-time errors.
