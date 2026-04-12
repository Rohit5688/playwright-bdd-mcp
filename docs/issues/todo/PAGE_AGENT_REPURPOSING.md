# Page Agent Observation & Repurposing Guide

This document outlines key insights from the `page-agent` (Alibaba) repository and how its logic can be repurposed to improve **TestForge** (Playwright-BDD) and **AppForge** (Appium/Mobile).

## 🚀 Repurposing for TestForge (Web/Playwright)

### 1. Smart DOM Extraction
**Location**: `packages/page-controller/src/dom/dom_tree/index.js`
- **Logic**: Filters Noise -> Identifies Interactivity -> Maps Coordinates.
- **Improvement**: Replace standard `page.content()` with this filtered tree.
- **Benefit**: Reduces LLM token usage by ~70% and focuses the AI purely on clickable/interactive elements.

### 2. SimulatorMask / Trace Highlighting
**Location**: `packages/page-controller/src/SimulatorMask.ts`
- **Logic**: Visual overlay with highlight primitives.
- **Improvement**: When `TestForge` executes a BDD step, use this to draw a "Target Box" over the element in headed mode.
- **Benefit**: dramatically improves observability and debugging during "Live Runs".

### 3. Dehydration Pipeline
**Location**: `packages/core/src/utils/`
- **Logic**: Converts DOM JSON to a compact "Actionable Markdown" format.
- **Improvement**: Feed this markdown to the AI for locator auto-learning instead of raw HTML.

---

## 📱 Repurposing for AppForge (Mobile/Appium)

### 1. "Cursor-Style" Interactivity Logic
**Insight**: `page-agent` uses a set of `interactiveCursors` (pointer, move, grab, etc.) to determine if an element is clickable. 
- **Application**: In `AppForge`, mobile XML lacks computed styles. However, we can map `page-agent`'s **Interactive Density** logic to mobile.
- **New Pattern**: If an element in Appium is nested deep but marked `clickable="false"`, but its child has a specific `name` or `label`, we can use `page-agent`'s parent-child interaction heuristic to "Promote" the clickable area.

### 2. Viewport Expansion Filtering
**Logic**: `page-agent` uses a `viewportExpansion` parameter to allow the agent to "see" slightly outside the current scroll view to preemptively plan the next move.
- **Application**: Add a "Lookahead" feature to `AppForge`'s `SelfHealingService`. Instead of just looking at the current XML, we can simulate a small scroll and merge the hierarchies (similar to `page-agent`'s multi-page logic) to find the element.

### 3. XPath Pruning Heuristics
**Location**: `packages/page-controller/src/dom/dom_tree/index.js` -> `getXPathTree`
- **Insight**: It stops at shadow/iframe boundaries and generates human-readable tree indices.
- **Application**: Improve `SelfHealingService.findAlternatives` in `AppForge` by adopting the "Stop at Boundary" logic for complex React Native / Flutter apps where the hierarchy is extremely deep.

---

## 🛠️ Implementation Plan for TestForge

1. **Copy Logic**: Extract `dom_tree/index.js` logic into a single standalone script.
2. **Inject Style**: Use `page.addInitScript()` in TestForge to register the "Smart Extractor" globally.
3. **Audit Trigger**: Create an MCP tool `audit_current_page` that returns the "Smart Tree" for AI debugging.

> [!TIP]
> Use the `WeakMap` caching strategy from `page-agent` to ensure the DOM extraction doesn't freeze the browser during heavy test runs.

> [!IMPORTANT]
> When porting the Action layer, remember that `page-agent` uses coordinate-based clicks as a fallback. `TestForge` should adopt this for "Element is Obscured" failures.
