# TASK-34 — TestGeneration Navigation Tuning

**Status**: TODO  
**Priority**: Medium  

## Problem
Test generation prompts are currently too verbose, leading to expensive token usage and "lost-in-the-middle" performance from the LLM.

## Scope
- [ ] Implement "Prompt Compression" for huge Gherkin files.
- [ ] Add `Mermaid` graph injection into the prompt (once NavigationGraphService is ready).
- [ ] Constrain the context window for `generate_cucumber_pom` to only show the last 3 screens.

## AppForge Reference
- `TASK-34-testgeneration-navigation-tuning.md`.
