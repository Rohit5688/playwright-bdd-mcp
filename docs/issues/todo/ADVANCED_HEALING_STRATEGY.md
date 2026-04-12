# TestForge: Advanced Self-Healing & Hybrid Architecture Design

> [!CAUTION]
> **PRE-IMPLEMENTATION ADVISORY: ROI & COMPLEXITY ANALYSIS**
> Before proceeding to the planning or implementation phase of these advanced patterns, a deep logical and practical audit is required:
> 1. **ROI Analysis**: Does the frequency of locator failures justify the cost of building a "DNA Tracker"? If your UI is stable, this adds overhead for little gain.
> 2. **Complexity vs. Solve-Ability**: Moving to a "Proxy-Mediator" pattern significantly increases system complexity. Ensure the problem it solves (flakiness) is currently your #1 bottleneck.
> 3. **Usage Frequency**: Heuristic matching is only valuable if tests run frequently (CI/CD). For ad-hoc manual execution, raw AI healing is more "lean".
> 4. **Maintenance Toll**: Higher complexity = higher maintenance. Ensure the team is ready to manage a database/DNA store alongside the test code.

## 🏛️ Recommended Architecture: The "Proxy-Mediator" Pattern
**Reference**: [Healenium](https://github.com/healenium/healenium-web)
Currently, TestForge calls the AI *after* a failure. Instead, we should implement a **Locator DNA Tracker**.

### 1. Element DNA Implementation
- **What it is**: For every successful step, store a "DNA" entry of the target element.
- **Attributes to Track**: Tag, ID, Classes, Parent Hierarchy (3 levels), ARIA Labels, and **Visual Hash** (CSS properties).
- **Benefit**: If a selector fails, we use a **Longest Common Subsequence (LCS)** algorithm to compare the "DNA" with the new DOM. 
- **Cost Impact**: This is a local CPU operation. We can heal 80% of failures with **ZERO LLM cost**.

### 2. Multi-Context Recovery (The "Search-Web" Loop)
**Reference**: [OpenQA](https://github.com/Open-QA/OpenQA)
- **Concept**: If an AI fix fails, don't give up. Trigger a "Deep Research" loop.
- **Implementation**: If a locator cannot be found, allow the AI to "Browse the Repo" for similar BDD steps or check the project's documentation to see if the feature was renamed or moved.

---

## 🚀 Repurposing Strategy for TestForge

### [Priority 1] Skyvern-Style Visual Self-Healing
**Location**: Integrate with Playwright's `Page.screenshot`.
- **Logic**: If the DOM-based healing has low confidence, send the "DNA" image + the new screenshot to Gemini Vision.
- **Goal**: "Find the icon that looks like a Trash Can but is now a red button."

### [Priority 2] Gherkin Discovery Loop (OpenQA)
**Logic**: Analyze existing Cucumber `.feature` files to find patterns.
- **Application**: When generating new tests, check if a similar step already exists (e.g., `Given I am logged in`). This prevents duplicate code and redundant AI generation.

---

## 📋 Implementation Roadmap [TODO]

- [ ] **Task 1**: Create `DnaTrackerService` to store element metadata in a local SQLite/JSON file.
- [ ] **Task 2**: Implement `HeuristicMatcher` (LCS algorithm) to find "near-matches" before invoking LLM.
- [ ] **Task 3**: Create a `VisionHeal` tool that uses Skyvern-style visual comparison for icons/canvas elements.

> [!IMPORTANT]
> **Hybrid Goal**: Use Heuristics for the "easy" stuff (ID changes) and save LLM budget for the "hard" stuff (UI structural refactors).
