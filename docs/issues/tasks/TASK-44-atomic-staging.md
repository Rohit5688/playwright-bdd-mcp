# TASK-44: Atomic Staging for Code Generation

**Tier:** 1 (Integrity)  
**Target Files:** `src/services/FileWriterService.ts`, `src/index.ts`

## 1. Description
Current implementation writes AI-generated files directly to the project directory. If the evaluation fails mid-run (e.g., test fails or tool crashes), the user's project is left in a "half-written" or "corrupt" state. 

Following AppForge pattern `b35c45d`, we must implement atomic staging:
1. Write to a temporary directory (`os.tmpdir()`).
2. Run validation (TypeScript check).
3. Only if validation passes, copy all files to the final destination.

## 2. Execution Steps
1. **Implement `StagingService`**: Create a utility to manage temporary workspace directories.
2. **Refactor `validate_and_write`**: 
   - Change `fileWriter.writeFiles` to target the staging directory by default.
   - Run `tsc --noEmit` on the staged directory.
   - On success, use `fs.copySync` (or similar) to move files to `projectRoot`.
3. **Rollback Logic**: Ensure the staging directory is purged in the `finally` block to prevent space leaks.

## 3. Exit Criteria
- If generated code has a syntax error, the original files in the project remain untouched.
- No orphan temporary directories left on disk after 10 trial runs.
