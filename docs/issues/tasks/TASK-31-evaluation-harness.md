# TASK-31 — MCP Evaluation Harness: Create TestForge `evaluation.xml`

**Status**: TODO  
**Priority**: 🟣 P3 — Quality Gate (Do After Core Tasks)  
**Effort**: Medium  
**Applies to**: TestForge  

---

## Problem

There is currently no automated way to verify that Claude can *actually use TestForge tools to complete real Playwright-BDD tasks*. Build passing ≠ tool effectiveness. A tool description can be syntactically correct but semantically useless if the wording confuses the LLM.

The `Skills/scripts/evaluation.py` harness (already present in this repo) solves this: it sends 10 realistic QA questions to Claude and measures how accurately Claude can answer them using only the TestForge MCP tools.

---

## What To Do

### Step 1 — Understand the format

Read: `Skills/reference/evaluation.md`  
See example: `Skills/scripts/eample_evaluation.xml`

### Step 2 — Create 10 QA questions for TestForge

The questions must test whether Claude can use TestForge tools effectively. They must be:
- **Read-only** — only non-destructive tools needed
- **Multi-hop** — require multiple tool calls to answer
- **Stable** — answers don't change over time
- **Realistic** — questions a real user would ask

Example question candidates (to be verified):
1. "What is the default execution command configured by `setup_project` for a new Playwright-BDD project?"
2. "Which tools does `workflow_guide` recommend for the 'generate' objective? List them in order."
3. "What is the maximum number of auto-healing retry attempts in `validate_and_write`?"
4. "Which tool should be called before `generate_gherkin_pom_test_suite` to populate the analysis cache?"
5. "What field in `mcp-config.json` controls the test run timeout?"

**Verify each answer yourself by using the tools before adding to the XML.**

### Step 3 — Create the XML file

```bash
# Location:
Skills/scripts/testforge_evaluation.xml
```

Format:
```xml
<evaluation>
  <qa_pair>
    <question>...</question>
    <answer>...</answer>
  </qa_pair>
</evaluation>
```

### Step 4 — Run the baseline evaluation

```bash
# Install dependencies (one-time)
pip install -r Skills/scripts/requirements.txt

# Set API key
set ANTHROPIC_API_KEY=your_api_key_here

# Run evaluation against built TestForge server
python Skills/scripts/evaluation.py \
  -t stdio \
  -c node \
  -a dist/index.js \
  Skills/scripts/testforge_evaluation.xml
```

### Step 5 — Record baseline accuracy

Document the initial score in `Skills/scripts/testforge_eval_results.md`. Re-run after any significant tool description change to detect regressions.

---

## Files Created
- `Skills/scripts/testforge_evaluation.xml` — 10 QA pairs
- `Skills/scripts/testforge_eval_results.md` — baseline accuracy log

## Acceptance Criteria
- 10 verified, read-only, stable QA pairs in the XML
- Baseline accuracy ≥ 70% (acceptable for initial run)
- Results documented in markdown log

---

## Dependencies
- `Skills/reference/evaluation.md` — question guidelines
- `Skills/scripts/evaluation.py` — test runner (already present)
- `Skills/scripts/requirements.txt` — pip deps (already present)
