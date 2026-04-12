# TASK-45: Autonomous Explorer & Navigation Graph

**Tier:** 5 (Agentic Intelligence)  
**Target Files:** `src/services/NavigationGraphService.ts`, `src/index.ts`, `src/tools/discover_app_flow.ts`

## 1. Description
AppForge recently moved towards "Autonomous Discovery" (Inspired by LLMDroid). TestForge needs equivalent capability to map a web application's navigation flow without manual step-by-step guidance.

## 2. Execution Steps
1. **Port NavigationGraphService**: Create a service that stores a graph of URLs (nodes) and transitions (edges).
2. **Implement Mermaid Export**: Allow the graph to be visualized as a Mermaid diagram for the user (and the agent's mental model).
3. **Register `discover_app_flow` Tool**: 
   - A tool that takes a start URL.
   - Clicks links/buttons to discover new URLs.
   - Updates the persistent navigation graph.
4. **LLM Awareness**: Inject the known navigation graph into `analyze_codebase` results so the AI knows how to get to Screen B from Screen A.

## 3. Exit Criteria
- Calling `discover_app_flow` on a simple multi-page site produces a Mermaid diagram.
- `analyze_codebase` returns "Known Navigation Paths" to the agent.
