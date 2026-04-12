# Addressing the Architecture Concerns — Detailed Recommendations

> This document addresses the four concerns raised after reviewing both AppForge and TestForge in depth.  
> Each concern is grounded in what the code actually does, not what the task docs say it should do.

---

## Concern 1 — The dependency injection problem is already happening

### What the code actually shows

TestForge's `index.ts` uses flat module-level instantiation:

```ts
const analyzer = new CodebaseAnalyzerService();
const generator = new TestGenerationService();
const selfHealer = new SelfHealingService();
// ... 18 more flat `const` declarations
```

AppForge went one step further — it wraps everything in an `AppForgeServer` class, which looks like DI but is not. The services are still created as class fields in declaration order, which means a service declared on line 130 can silently depend on a service declared on line 106 being ready. When `OrchestrationService` was added it needed 7 dependencies injected through its constructor:

```ts
private orchestrationService = new OrchestrationService(
  this.generationService,
  this.fileWriterService,
  this.selfHealingService,
  this.sessionManager as any,  // ← 'as any' is the first warning sign
  this.learningService,
  this.configService,
  this.analyzerService
);
```

The `as any` cast on `sessionManager` is the tell. `OrchestrationService` was typed against `AppiumSessionService` but receives `SessionManager`. Someone noticed the mismatch, couldn't resolve it cleanly, and cast it away. That is exactly the failure mode that scales badly — as more orchestration services are added (TestForge Phase 4 adds `OrchestrationService` + `DnaTrackerService` + `NavigationGraphService` all calling each other), the cast count grows and type safety erodes.

The `setSessionManager` / `setLearningService` late-binding pattern on `SelfHealingService` is a symptom of the same problem — the class needs collaborators it cannot receive at construction time because of initialization order constraints.

```ts
// AppForge index.ts constructor, end of function:
this.selfHealingService.setSessionManager(this.sessionManager);
this.selfHealingService.setLearningService(this.learningService);
```

This works, but it means `SelfHealingService` has nullable private fields that are `null` between construction and `set*` calls. Any tool call arriving in that window would get a null-pointer exception.

---

### The actual fix — a Service Locator with explicit wiring

**Do not reach for a full DI framework** (InversifyJS, tsyringe). They add complexity and don't play well with MCP's stdio lifecycle. Instead, implement a lightweight `ServiceContainer` that:

1. Registers services by interface key
2. Resolves them lazily (first access triggers construction)
3. Makes initialization order explicit and compiler-checked

```ts
// src/container/ServiceContainer.ts

type Factory<T> = () => T;

export class ServiceContainer {
  private factories = new Map<string, Factory<unknown>>();
  private instances = new Map<string, unknown>();

  register<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    if (!this.instances.has(key)) {
      const factory = this.factories.get(key);
      if (!factory)
        throw new Error(`ServiceContainer: no factory for "${key}"`);
      this.instances.set(key, factory());
    }
    return this.instances.get(key) as T;
  }
}

export const container = new ServiceContainer();
```

Then in `src/container/registrations.ts`:

```ts
import { container } from "./ServiceContainer.js";
import { McpConfigService } from "../services/McpConfigService.js";
import { CodebaseAnalyzerService } from "../services/CodebaseAnalyzerService.js";
import { SelfHealingService } from "../services/SelfHealingService.js";
import { LearningService } from "../services/LearningService.js";
import { OrchestrationService } from "../services/OrchestrationService.js";
// ...

container.register("config", () => new McpConfigService());
container.register("analyzer", () => new CodebaseAnalyzerService());
container.register("learning", () => new LearningService());
container.register("healing", () => {
  const svc = new SelfHealingService(
    container.resolve("learning"), // explicit, type-checked
  );
  return svc;
});
container.register(
  "orchestration",
  () =>
    new OrchestrationService(
      container.resolve("generation"),
      container.resolve("fileWriter"),
      container.resolve("healing"),
      container.resolve("session"),
      container.resolve("learning"),
      container.resolve("config"),
      container.resolve("analyzer"),
    ),
);
```

Then `index.ts` becomes:

```ts
import "./container/registrations.js"; // side-effect: registers everything
import { container } from "./container/ServiceContainer.js";

registerGenerateCucumberPom(
  server,
  container.resolve("config"),
  container.resolve("analyzer"),
  container.resolve("generation"),
  container.resolve("learning"),
);
```

**The concrete benefits:**

- Initialization order is now the container's job, not declaration order
- No more `as any` casts — types flow through `resolve<T>()`
- No more nullable `setXxx()` fields — services receive collaborators at construction time
- Adding a new Phase 4 service is one `container.register()` call, not hunting through a 300-line constructor

**For TestForge:** implement this when Phase 2 SDK migration runs. The migration rewrites `index.ts` anyway — do the container at the same time. For AppForge: retrofit gradually, one service at a time, starting with `OrchestrationService` (remove the `as any`).

---

## Concern 2 — MobileSmartTreeService is treating the symptom

### What the code actually shows

`MobileSmartTreeService.buildSparseMap()` takes raw Appium XML and extracts only interactive elements, reducing 50-200KB XML to ~5KB. It does this by parsing the XML string and filtering for `clickable="true"` and similar attributes.

```ts
// Rough count of what it extracts:
// #1  button  "Login"      ~login_btn     [clickable]
// #2  input   "Username"   id=username    [editable]
```

This is genuinely useful. The problem is the root cause: Appium's UI Automator2 driver returns the _entire accessibility tree_ — every container view, every invisible layout wrapper, every text label on screen — because it doesn't know what the test needs. The tree is large because Appium was designed for desktop-era test frameworks that expected full document access.

The fix `MobileSmartTreeService` applies (filter the tree after receiving it) works, but it still pays the full Appium round-trip cost of serialising 200KB of XML through the WebDriver protocol. The token cost is addressed; the latency and bandwidth cost is not.

---

### The actual fix — two complementary approaches

**Approach A: Request a scoped subtree (Appium-side filter, available now)**

Appium's `find_elements` with XPATH can scope the search, but more usefully, `get_page_source` accepts a `subtree` parameter on some drivers. More reliably, use `mobile: getContexts` or restrict the initial element fetch to a known container:

```ts
// Instead of fetching the full page source:
// driver.getPageSource() → 200KB

// Fetch only elements within a known container:
// driver.findElement('accessibility id', 'main-content').then(el => el.getAttribute('content-desc'))
// Or for the whole visible layer:
// driver.executeScript('mobile: source', [{ format: 'description' }])
```

The `mobile: source` with `format: 'description'` returns a compact representation on both Android (UIAutomator2 ≥ 2.29) and iOS (XCUITest). This cuts the payload before it leaves the device.

**Approach B: Hash-gated delta refresh (already partially implemented, extend it)**

`MobileSmartTreeService` already does `xmlHash` caching with a 30-second TTL. Extend this to cross-tool-call persistence:

```ts
// Instead of re-fetching and re-parsing on every inspect_ui_hierarchy call:
// 1. Store the last xmlHash per session in SessionManager
// 2. Before fetching, check if the app is on the same screen (quick title check)
// 3. If yes and hash is fresh: return cached ActionMap immediately
// 4. If no: fetch, build new ActionMap, store hash

export class MobileSmartTreeService {
  // Persist cache in SessionManager, not in-memory singleton
  public buildSparseMapWithDelta(
    xml: string,
    platform: Platform,
    sessionId: string, // NEW: keyed to session, not process lifetime
    screenName?: string,
  ): ActionMap & { fromCache: boolean } {
    // ...
  }
}
```

**For TestForge specifically:** The equivalent is `DomInspectorService`. Playwright's `page.accessibility.snapshot()` already returns a compact accessibility tree — use that instead of `page.content()` (full HTML). The accessibility snapshot is typically 10× smaller for the same page and directly maps to what a test cares about.

```ts
// Current (TASK-62 planned):
const html = await page.content(); // 200KB+ for a real SPA

// Better starting point:
const snapshot = await page.accessibility.snapshot();
// Returns: { role, name, children[] } — already a semantic tree
// → SmartDomExtractor processes this instead of raw HTML
```

This means TASK-62 (`SmartDomExtractor`) should target `page.accessibility.snapshot()` as its input, not `page.content()`. The 70% token reduction claim in the task description becomes easier to achieve when starting from an already-compact representation.

---

## Concern 3 — The `AgentRoutingService` (GS-23) should stay deferred, but here's why precisely

### What the code actually shows

The GS-23 task proposes routing "simple tasks to Haiku, complex to Opus." It does not exist in code — it is a bullet in the Gold Standard summary. Nothing in either codebase routes requests to different models.

### Why this is premature right now

Three concrete problems that will appear immediately:

**Problem 1 — Complexity classification is circular.** To decide whether a task is "simple enough for Haiku," you need to analyse the task. That analysis is itself an LLM call. You have either a cheap model classifying its own inputs (unreliable) or an expensive model deciding which cheap model to use (defeats the purpose).

**Problem 2 — Model capability drift invalidates routing rules.** The routing config says "route generation tasks to Opus." Then Claude 3.5 Sonnet matches Opus on code generation at Haiku pricing. Now your routing rules are stale. Every model release requires re-tuning the routing logic.

**Problem 3 — MCP tool calls don't have a clean cost profile.** `generate_cucumber_pom` sounds expensive but completes in one generation call. `self_heal_test` sounds lightweight but triggers inspect → generate → validate → write — four LLM calls. Routing by tool name is wrong; routing by actual call depth requires instrumenting the orchestration layer first.

### When this becomes worth doing

After Phase 4 completes and `OrchestrationService` instruments actual token usage via `TokenBudgetService`, you will have real data on which tool flows are expensive. At that point, a simple threshold rule (not a routing service) in `TokenBudgetService` is sufficient:

```ts
// Not a routing service — just a budget gate:
if (tokenBudget.estimatedCost(toolName, inputSize) < SIMPLE_THRESHOLD) {
  // Flag this in the response: "low-cost operation"
  // Let the calling client decide the model — TestForge/AppForge don't control that
}
```

The MCP protocol does not give the server control over which model the client uses. Routing belongs in the client (Claude Desktop / your agent harness), not in the MCP server. GS-23 is solving a problem that is not the server's to solve.

---

## Concern 4 — The accumulation of `as any` casts and informal service coupling

### What the code actually shows

Beyond the `OrchestrationService` case already described, there are two other patterns that will compound as more services are added:

**Pattern A — Singleton-then-set (late binding via nullable fields)**

```ts
// AppForge SelfHealingService:
private sessionManager: SessionManager | null = null;
private learningService: LearningService | null = null;

public setSessionManager(sm: SessionManager): void {
  this.sessionManager = sm;
}
```

Every method in `SelfHealingService` that uses `this.sessionManager` must either null-check it or trust that the caller ran `setSessionManager` before invoking any healing logic. The type system cannot enforce this ordering. As more services follow this pattern (TestForge Phase 4 will add `DnaTrackerService` which needs `LearningService`, `ObservabilityService`, and `PlaywrightSessionService`), the number of implicit ordering constraints grows.

**Pattern B — Singletons mixed with constructor instances**

In AppForge `index.ts`:

```ts
private selfHealingService = SelfHealingService.getInstance(); // singleton
private learningService    = new LearningService();            // new instance
```

`SelfHealingService.getInstance()` returns a singleton. `new LearningService()` creates a fresh instance. When `setLearningService` is called, it wires a fresh instance into the singleton. If another part of the code calls `SelfHealingService.getInstance()` and also calls `setLearningService` with a _different_ `LearningService` instance, the singleton's internal state changes under the first caller. This is the classic shared-mutable-singleton problem.

---

### The concrete fixes — applied in order

**Fix 1: Eliminate nullable fields by using constructor injection everywhere**

Change this pattern:

```ts
// BEFORE
export class SelfHealingService {
  private sessionManager: SessionManager | null = null;

  setSessionManager(sm: SessionManager) {
    this.sessionManager = sm;
  }

  async healTest(path: string) {
    if (!this.sessionManager) throw new Error("No session manager set");
    // ...
  }
}
```

To this:

```ts
// AFTER
export class SelfHealingService {
  constructor(
    private readonly sessionManager: PlaywrightSessionService, // TestForge equivalent
    private readonly learningService: LearningService,
  ) {}

  async healTest(path: string) {
    // sessionManager is guaranteed non-null by TypeScript
  }
}
```

The `ServiceContainer` from Concern 1's fix handles the wiring. This is not a big migration — only 3 services in AppForge use the `set*` pattern. In TestForge, implement constructor injection from the start before the pattern spreads.

**Fix 2: Pick one instantiation strategy per service and enforce it**

Rule: a service is either a singleton OR always freshly constructed. Never both.

```ts
// Singletons: services that hold session state across tool calls
// → SessionManager, ObservabilityService, TokenBudgetService, StructuralBrainService
// → Use getInstance() pattern, register the singleton in the container

// Fresh instances: stateless services that transform inputs to outputs
// → CodebaseAnalyzerService, TestGenerationService, RefactoringService
// → Use constructor injection, new per server startup (not per request)

// Per-project instances: services that scope state to a projectRoot
// → NavigationGraphService (AppForge already does this with a Map)
// → Use factory registered in container: container.resolve('navGraphFactory')(projectRoot)
```

AppForge already found this the hard way — the comment `// MEMORY LEAK FIX: Instance pooling for NavigationGraphService` in `index.ts` shows that `NavigationGraphService` was initially a singleton, leaked memory, and had to be refactored to a `Map<projectRoot, NavigationGraphService>`. Apply this lesson upfront to `DnaTrackerService` and `NavigationGraphService` in TestForge before they're written.

**Fix 3: Write an interface for every cross-service dependency**

The `as any` cast in `OrchestrationService` exists because `OrchestrationService` was typed against `AppiumSessionService` but the real dependency is a subset of that interface — just the ability to run a selector verification. Define what you actually need:

```ts
// src/interfaces/ISessionVerifier.ts
export interface ISessionVerifier {
  verifySelector(
    selector: string,
  ): Promise<{ exists: boolean; displayed: boolean }>;
}

// AppiumSessionService implements ISessionVerifier (structural typing — no changes needed)
// PlaywrightSessionService implements ISessionVerifier (add the method)
// OrchestrationService depends on ISessionVerifier, not the concrete class
```

This removes the `as any`, makes the actual dependency surface explicit, and makes TestForge's `PlaywrightSessionService` able to satisfy the same interface. Both MCPs can share the `OrchestrationService` type if they both implement the interface.

---

## Implementation sequence for these fixes

These are not separate tasks to schedule — they are the _how_ of existing tasks. Slot them in as follows:

| Concern                                        | Where it gets fixed                         | Task it rides on                                                                    |
| ---------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| ServiceContainer (Concern 1)                   | `src/container/` new directory              | Phase 2, same session as TASK-28 (SDK migration rewrites index.ts anyway)           |
| Constructor injection (Concern 4, Fix 1)       | All services using `set*` pattern           | Phase 2, alongside error system (TASK-50)                                           |
| Singleton vs instance rule (Concern 4, Fix 2)  | Documented in container registrations       | Phase 2, when writing registrations.ts                                              |
| Interface extraction (Concern 4, Fix 3)        | `src/interfaces/` directory                 | Phase 2, one interface per cross-service boundary                                   |
| SmartTree root cause (Concern 2, Approach A)   | `DomInspectorService` + `SmartDomExtractor` | Phase 4, TASK-62 — change input to `page.accessibility.snapshot()`                  |
| Hash-gated delta cache (Concern 2, Approach B) | `DomInspectorService`                       | Phase 4, TASK-62 — persist hash in `PlaywrightSessionService`                       |
| AgentRouting (Concern 3)                       | Not implemented                             | Stays deferred. Revisit only after `TokenBudgetService` has 3+ months of real data. |

---

## One honest observation about both codebases

Reading the actual code rather than the task documents, the most important thing is not any of the four architectural concerns above.

**The most important thing is that both codebases were written the right way for the wrong reason.**

They were written to make an LLM agent's job easier — and they succeed at that. The tool descriptions, the structured error types, the atomic operations, the Champion selection, the DNA tracker — all of this is genuinely thoughtful. The architectural issues (nullable fields, mixed singleton strategies, growing `as any` count) are normal consequences of moving fast in an emerging field where the right patterns weren't established yet.

The ServiceContainer fix is worth doing not because the current code is broken — it isn't — but because Phase 4 will add 6+ new services that all need each other, and without a container, `index.ts` becomes unmaintainable at that scale. That is a real threshold, and you are approaching it in the current plan.

Everything else described here is polishing work that can happen incrementally. The current architecture is sound enough to ship Phase 1 and Phase 2 without any of these changes. Address Concerns 1 and 4 during Phase 2 (when index.ts is being rewritten anyway), address Concern 2 during Phase 4 (when DomInspectorService is being rewritten anyway), and leave Concern 3 alone indefinitely.
