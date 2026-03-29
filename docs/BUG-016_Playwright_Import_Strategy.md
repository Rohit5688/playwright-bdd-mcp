# BUG-016: Playwright Import Strategy Alignment

## Description
The current implementation of TestForge (Playwright-BDD MCP) strictly enforces importing `test`, `expect`, `defineConfig`, and `devices` from the `playwright-bdd` package. This was originally implemented to prevent duplicate test runner instances that cause the `describe() unexpectedly called` error.

However, the preferred strategy for this project is:
1. **Direct Imports**: Standard Playwright APIs (`test`, `expect`, `defineConfig`, `devices`, `Page`, etc.) should be imported directly from `@playwright/test`.
2. **Implicit Dependency**: `@playwright/test` should **NOT** be added to the project's `package.json`. It is implicitly provided by `playwright-bdd` as a dependency.

This approach maintains standard Playwright coding patterns while avoiding the dependency bloat and potential version conflicts of an explicit secondary installation.

---

## Status: ✅ Fixed

## Impacted Components
- `src/services/ProjectSetupService.ts`: Templates for `package.json`, `playwright.config.ts`, and `BasePage.ts`.
- `src/services/TestGenerationService.ts`: AI prompt rules (specifically Rules 148-158) which currently forbid `@playwright/test` imports.
- `src/services/FixtureDataService.ts`: Code generation prompt for custom fixtures.
- `src/services/ProjectMaintenanceService.ts`: Upgrade logic and maintenance guidance.
- `src/services/EnvironmentCheckService.ts`: Project health check and validation logic.
- `src/index.ts`: Tool definitions and orchestrations.

## Proposed Fix
1. **Refactor Templates**: Update `BasePage.ts` and `playwright.config.ts` templates in `ProjectSetupService` to import from `@playwright/test`.
2. **Update AI Rules**: Modify `TestGenerationService.ts` to instruct the AI to use `@playwright/test` for standard imports while still using `playwright-bdd` for `createBdd`.
3. **Refine Fixtures**: Update `FixtureDataService.ts` to use `@playwright/test` when extending the base `test` object.
4. **Harden Health Checks**: Update `EnvironmentCheckService` to warn users against manually adding `@playwright/test` to `package.json`.
5. **Comment Updates**: Ensure all generated files contain clear comments explaining WHY `@playwright/test` is not in `package.json`.

## Detailed Code Review and Task Log
- [x] **Review ProjectRoot Templates**: Audited `ProjectSetupService` scaffolding logic. Verified `playwright.config.ts` and `BasePage.ts` correctly import from `@playwright/test`.
- [x] **Review Test Generators**: Audited `TestGenerationService`. Updated strict rules to mandate the use of `@playwright/test`.
- [x] **Review Fixture Generators**: Audited `FixtureDataService`. Updated template rule 30 to use `@playwright/test` for extending the base `test`.
- [x] **Review Maintenance Logic**: Audited `ProjectMaintenanceService`. Updated guidance comments regarding implicit dependency management.
- [x] **Review Health Check Logic**: Audited `EnvironmentCheckService`. Confirmed it detects and warns about duplicate `@playwright/test` entries in `package.json`.
- [x] **Final Verification**: Confirmed that all tools now generate code aligned with the direct import strategy.

---

## Related Context
- User Request: "expect, test etc imports which comes from @playwright/test has to be imported from the package, but we dont need to add this in package.json as playwright-bdd is installing @playeright/test package implicitely"
- Previous Conversations: `ce7b0c41-a218-4faa-b1aa-d7e2784dc5b7` (Hardening Architecture)

---

## Related Context
- User Request: "expect, test etc imports which comes from @playwright/test has to be imported from the package, but we dont need to add this in package.json as playwright-bdd is installing @playeright/test package implicitely"
- Previous Conversations: `ce7b0c41-a218-4faa-b1aa-d7e2784dc5b7` (Hardening Architecture)


check this doc for tool review and observations: tf-poc\docs\testforge-review.md

🛑 The "Bad" & Strict: Pain Points & Constraints
1. Metadata & Registry Sensitivity
The Tool Metadata Inconsistency (where the AI could see the server but not its specific commands) is a fragile point in the handshake process. If the server isn't registered correctly during setup, the automated onboarding becomes a manual CLI investigation.

2. Strict Import & Configuration Rules
TestForge is hypersensitive to where types and runners come from.

The Problem: Accidentally importing test from @playwright/test instead of playwright-bdd (or vice-versa) can lead to "Can't guess test instance" or "describe() unexpectedly called" errors.
The Strictness: The framework expects you to follow its internal "Source of Truth" strictly. Deviating from the scaffolded imports (like we did during the initial troubleshooting) causes immediate compilation failures.
3. Environmental & Shell Sensitivity
The BDD compiler can be sensitive to pathing and OS context. Hyphens in folder names (-poc) or using Linux-style && in Windows PowerShell (as seen in the earlier logs) can lead to confusing "Module Not Found" or syntax errors that require deep environment knowledge to fix.

🛠️ Lessons Learned & Best Practices
Use Short, Clean Paths: Avoid hyphens and deep nesting where possible to keep the BDD CLI happy.
Trust the Audit: If audit_utils says you're at 11%, believe it. The suggested refactors (moving to Action/Navigation helpers) significantly improved our test stability.
Follow the Extended Fixture Pattern: Do not try to use simple page objects in steps. Use the base.extend<Fixtures> pattern to keep your tests type-safe and your locators isolated.
[!IMPORTANT] Final Verdict: TestForge is a high-precision instrument. It is significantly more powerful than standard Playwright generators but requires an engineer who is willing to follow its strict architectural patterns to achieve its full potential.