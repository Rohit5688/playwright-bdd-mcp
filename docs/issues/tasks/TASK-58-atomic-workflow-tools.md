# TASK-58 — Atomic Workflow Tools

**Status**: TODO  
**Priority**: High  

## Problem
Basic workflows like "Create Test" require 3 separate turns by the LLM, increasing the risk of coordination failure.

## Scope
- [ ] Implement `create_test_atomically(description, xml, screenshot)`.
- [ ] Implement `heal_and_verify_atomically(error, xml)`.
- [ ] These tools should orchestrate analysis, generation, and writing in a single turn.

## AppForge Reference
- `docs/issue/pipeline/INDEPENDENT_TOOL_ANALYSIS.md`.
