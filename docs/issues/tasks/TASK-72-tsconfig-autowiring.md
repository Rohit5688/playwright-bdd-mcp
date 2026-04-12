# TASK-72: TSConfig Autowiring & Model Scaffolding

**Tier:** 1 (Hardening)  
**Reference:** `fixplan.md` Requirement 28
**Target Files:** `src/services/FileWriterService.ts`, `src/utils/TsConfigManager.ts`

## 1. Description
When TestForge generates new architectural boundaries (e.g., a new `models/` directory), it must ensure the project's TypeScript configuration remains valid.

## 2. Execution Steps
- **Implement `TsConfigManager`**: A utility to read/update `tsconfig.json` path aliases.
- **Implement Autowiring**: When `validate_and_write` creates a new top-level directory, automatically add it to `compilerOptions.paths`.
- **Implement Directory Scaffolding**: Ensure parent directories are created before writing, respecting `mcp-config.json` permissions.

## 3. Exit Criteria
- Generating a new Page Object in a previously empty `pages/` folder updates `tsconfig.json` correctly.
- `npm run build` in the target project continues to work after TestForge modifications.
