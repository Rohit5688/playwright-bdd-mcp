import type { ITestRunner, TestRunnerResult } from '../interfaces/ITestRunner.js';
/**
 * TestRunnerService
 *
 * Executes Playwright-BDD tests via shell commands.
 * Phase 35: Sanitizes user-supplied test arguments to prevent command injection.
 * Phase 35b: Per-run timeout is config-driven via mcp-config.json (testRunTimeout).
 */
export declare class TestRunnerService implements ITestRunner {
    runTests(projectRoot: string, specificTestArgs?: string, timeoutMs?: number, executionCommand?: string): Promise<TestRunnerResult>;
}
//# sourceMappingURL=TestRunnerService.d.ts.map