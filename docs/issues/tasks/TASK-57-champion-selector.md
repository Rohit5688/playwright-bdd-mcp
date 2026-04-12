# TASK-57 — Champion Selector & Hybrid Prompt Engine

**Status**: TODO  
**Priority**: Very High (Autonomy)  

## Problem
Instruction-based prompts aren't enough for the LLM to mimic the project's specific coding patterns, leading to "instruction drift."

## Scope
- [ ] Implement `maturityScore` logic to find the "Champion" PageObject.
- [ ] Implement `HybridPromptEngine` to inject real-code snippets into generation prompts.
- [ ] Add "Anti-Pattern" reinforcement blocks to the system prompt.

## AppForge Reference
- `docs/issue/pipeline/fewshotsfinalplan.md`.
