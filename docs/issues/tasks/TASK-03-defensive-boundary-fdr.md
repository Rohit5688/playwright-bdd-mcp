# TASK-03: Defensive Boundary Crossing

**Tier:** 1 (Security & Integrity)  
**Target Files:** `src/services/CodebaseAnalyzerService.ts`, `src/utils/ASTScrutinizer.ts`, `src/index.ts`

## 1. Description
"Full Dependency Recognition" (FDR) and AST parsing are dangerous top-level operations because corrupt syntax trees or bizarrely structured 3rd-party code in custom wrappers can throw unhandled runtime exceptions. If `ts-morph` or file parsers throw abruptly, they crash the entire MCP `analyze_codebase` handler, isolating the LLM from the user codebase completely.

## 2. Execution Steps
1. **Analyze Codebase Catch-All**:
   - Wrap the core discovery loop inside `CodebaseAnalyzerService.analyze()` in a `try/catch`. 
   - If an exception triggers during parsing, log it as an architectural warning (`repoContext` warning) rather than cratering the transaction.
2. **AST Scrutinizer Protection**:
   - Ensure the `ASTScrutinizer` inside the `.index` tools gracefully fails without hanging or crashing out.
3. **Fallback Grace Period**:
   - Add default empty structures for `existingPageObjects`, etc. if the internal scanner loops fail.

## 3. Exit Criteria
- Parsing an invalid TypeScript file manually will not kill the MCP process out right.
- `analyze_codebase` never returns a 500 equivalent; it returns whatever it managed to find, with warnings appended.
