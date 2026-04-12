# TestForge: Consolidated Alignment & Hardening Strategy

This document outlines the "Final Form" strategy for aligning TestForge with the AppForge Gold Standard. To maximize token efficiency and prevent architectural rework, we have consolidated 20+ discrete tasks into **4 Strategic Waves**.

---

## 🌊 Wave 1: Intelligence & Context (The Brain)
**Focus**: Discovery, Environment Mapping, and Safety.
**Merged Tasks**: 08, 25, 63, 64, 71

| Feature | Objective |
| :--- | :--- |
| **Intelligent Discovery Service** | Replaces "blind" scanners with a recursive engine that parses lockfiles and imports to auto-detect the project layout. |
| **FDR Engine** | Identifies "Implicit Frameworks" (wrappers) even when the user hasn't configured them. |
| **Structural Brain** | Maps God Nodes and dependency graphs to prevent modular decay. |
| **Navigation Graph** | Provides the AI with spatial awareness of the web application's screen flow. |

---

## 🛡️ Wave 2: Security & Stability (The Armor)
**Focus**: Sub-process safety, RPC stability, and Build Integrity.
**Merged Tasks**: 48, 50, 70, 72

| Feature | Objective |
| :--- | :--- |
| **Runner Hardening** | Migrates all system/test calls to `execFile` or `spawn` with full JSON-RPC pipe protection to prevent session crashes. |
| **TSConfig Autowiring** | Automatically manages path aliases when the generator creates new architectural boundaries. |
| **Error DNA** | Classifies failures into Infrastructure vs Logic to drive smarter self-healing decisions. |

---

## 🧠 Wave 3: Observability (The Nervous System)
**Focus**: Traceability, Budgeting, and Context Management.
**Merged Tasks**: 47, 65, 66, 67

| Feature | Objective |
| :--- | :--- |
| **Structured JSONL Logger** | Implements standard audit trails for every agent turn. |
| **Context Manager** | Performs automated "Context Compression" to prevent long sessions from exceeding token limits. |
| **File State Protection** | Monitors content hashes and timestamps to prevent race conditions or overwriting user changes. |

---

## 🚀 Wave 4: Advanced Automation (The Hands)
**Focus**: Efficiency, Healing, and Atomic Orchestration.
**Merged Tasks**: 55, 61, 62, 68, 69

| Feature | Objective |
| :--- | :--- |
| **Smart DOM Extraction** | Ports the `page-agent` filtering logic to reduce prompt noise by ~70%. |
| **Orchestration Service** | Implements "Super-Tools" (e.g., `heal_and_verify_atomically`) to reduce agent loops. |
| **Heuristic DNA Testing** | Uses local LCS matching to fix simple locator changes without calling the LLM. |
| **Setup UX 2.0** | Standards-compliant scaffolding with Phase-1/Phase-2 safety and reference guides. |

---

## 📉 Redundancy & Efficiency Rationale
By moving directly to the "Final Form" for these services, we avoid the following waste:
1.  **Refactoring Overlap**: We skip writing basic path joining (TASK-08) because the Discovery Engine (TASK-71) makes it obsolete.
2.  **Context Bloat**: We skip sending raw HTML early on by implementing the Smart DOM Extractor first.
3.  **Stability Gains**: Hardening the `Runner` at the start of the migration prevents "flaky sessions" from interrupting the rest of the implementation work.

---
**Status**: Strategy Finalized. 
**Next Step**: Implementation of Wave 1.
