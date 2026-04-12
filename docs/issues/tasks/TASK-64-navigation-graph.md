# TASK-64 — Navigation Graph Service (Web Spatial Awareness)

**Status**: TODO  
**Priority**: Medium (Navigation Intelligence)

## Problem
The agent often gets "lost" between page transitions. It doesn't have a map of which URL paths correspond to which screens or how they are connected.

## Scope
- [ ] Implement `NavigationGraphService.ts` for Web/Playwright.
- [ ] Transition logic: Connect nodes based on observed `page.goto` calls and link interaction history.
- [ ] Persistence of the graph to `.TestForge/navigation-map.json`.
- [ ] Export `navigation_map` as a Mermaid diagram for the LLM to understand the app flow.
- [ ] Add `extract_navigation_map` tool to `index.ts`.

## AppForge Reference
- `AppForge/src/services/NavigationGraphService.ts` (Adapt screen names to URL slugs/titles)
