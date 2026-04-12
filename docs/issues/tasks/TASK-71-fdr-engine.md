# TASK-71: Full Dependency Recognition (FDR) Engine

**Tier:** 2 (Intelligence)  
**Reference:** `fixplan.md` Issue 1 & 11
**Target Files:** `src/services/DependencyService.ts`, `src/services/CodebaseAnalyzerService.ts`

## 1. Description
Implement a "FDR" engine that can identify "Implicit Frameworks". Often, projects wrap Playwright/BDD inside a custom private package. TestForge needs to peek into lockfiles to understand the true engine underneath.

## 2. Execution Steps
- **Implement `LockfileParser`**: Parse `package-lock.json` or `yarn.lock` to find transient dependencies.
- **Implement `ImportFingerprinter`**: Scan source files code for common patterns (e.g., `defineBddConfig`) to detect BDD even if config files are hidden.
- **Surface FDR to AI**: Add the discovered "Implicit Framework" details to the `analyze_codebase` output.

## 3. Exit Criteria
- TestForge correctly identifies `playwright-bdd` even if the config is at a non-standard path.
- Custom wrapper methods are detected and categorized for AI reuse.
