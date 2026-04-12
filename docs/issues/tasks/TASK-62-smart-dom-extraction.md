# TASK-62: Smart DOM Extraction & Interaction

**Tier:** 2 (Resilience & Modernization)  
**Reference:** `PAGE_AGENT_REPURPOSING.md`
**Target Files:** `src/services/DomInspectorService.ts`, `src/utils/SmartDomExtractor.ts`

## 1. Description
Repurpose `page-agent` extraction logic to drastically reduce TestForge token usage and increase element targeting success.
Replaces raw HTML dumping with an interactive, component-driven Dehydration Pipeline.

## 2. Execution Steps
- Extract noise-filtering DOM logic from `page-agent/src/dom/dom_tree/index.js` into TestForge.
- Update `inspect_page_dom` tool to inject smart extractor and return pruned "Actionable Markdown".
- Implement coordinate-based fallback clicks in execution for obscured elements.
- Optional: Implement SimulatorMask UI highlighters for live debugging observability.
