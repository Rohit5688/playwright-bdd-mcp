# TASK-61: Advanced Self-Healing (DNA & Proxy-Mediator)

**Tier:** 3 (Autonomy / Feature Parity)  
**Reference:** `ADVANCED_HEALING_STRATEGY.md`
**Target Files:** `src/services/DnaTrackerService.ts`, `src/utils/HeuristicMatcher.ts`, `src/services/SelfHealingService.ts`

## 1. Description
Implement a "Locator DNA Tracker" to heal brittle tests without relying entirely on LLMs.
Store successful locator DNA (tag, ID, hierarchy, visual hash) and use Longest Common Subsequence (LCS) to heal local failures autonomously.

## 2. Execution Steps
- Implement `DnaTrackerService` to persist element metadata locally.
- Implement `HeuristicMatcher` utilizing LCS algorithm to find near-matches.
- Integrate into `SelfHealingService`: attempt local heuristic healing before falling back to Vision LLM.
- **Bonus:** Add Visual Healing tool invoking Gemini vision on obscured icons.
