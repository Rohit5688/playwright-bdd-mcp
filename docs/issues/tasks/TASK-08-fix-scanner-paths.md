# TASK-08: Fix Scanner Paths

**Tier:** 3 (Path Enforcement & Allowlisting)  
**Target Files:** `src/services/CodebaseAnalyzerService.ts`, `src/services/SuiteSummaryService.ts`

## 1. Description
(Issue 2, 4, 8) The `analyze_codebase` and `summarize_suite` scanners are blind because they ignore user parameters and only perform raw filesystem checks on `step-definitions/`, `features/`, and `pages/`. If a project uses an alternate `dirs` configuration, TestForge returns a "zero dependencies" false positive. 

## 2. Execution Steps
1. **Analyze Codebase**: Modify `CodebaseAnalyzerService.ts` mapping arrays to utilize `config.dirs` overrides heavily via dynamic `path.join(projectRoot, config.dirs.features)`.
2. **Suite Summary**: Update `SuiteSummaryService.summarize` to look inside `config.dirs.features` for Gherkin documents rather than blindly looking for `features/`. Add explicit warning fallback arrays.

## 3. Exit Criteria
- The LLM successfully analyzes feature and step files loaded from non-traditional paths out of the box dynamically via the config.
