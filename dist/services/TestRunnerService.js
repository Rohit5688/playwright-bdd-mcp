import { exec } from 'child_process';
import { promisify } from 'util';
import { sanitizeShellArg } from '../utils/SecurityUtils.js';
const execAsync = promisify(exec);
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes
/**
 * TestRunnerService
 *
 * Executes Playwright-BDD tests via shell commands.
 * Phase 35: Sanitizes user-supplied test arguments to prevent command injection.
 * Phase 35b: Per-run timeout is config-driven via mcp-config.json (testRunTimeout).
 */
export class TestRunnerService {
    async runTests(projectRoot, specificTestArgs, timeoutMs) {
        const runTimeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        try {
            // Phase 35: Sanitize user-supplied arguments before shell interpolation
            const safeArgs = specificTestArgs ? sanitizeShellArg(specificTestArgs) : '';
            const command = `npx bddgen && npx playwright test ${safeArgs}`;
            const { stdout, stderr } = await execAsync(command, {
                cwd: projectRoot,
                timeout: runTimeout,
            });
            return {
                passed: true,
                output: `[SUCCESS] Tests passed!\n\nStandard Output:\n${stdout}\n\nStandard Error:\n${stderr}`
            };
        }
        catch (error) {
            // Check if the error is a timeout kill
            if (typeof error === 'object' && error !== null && 'killed' in error && error.killed) {
                return {
                    passed: false,
                    output: `[TIMEOUT] Test run exceeded the ${runTimeout / 1000}s limit and was killed.\n\nPartial Output:\n${error.stdout || ''}\n\nIncrease testRunTimeout in mcp-config.json if your suite needs more time.`
                };
            }
            // In JS, exec throws if exit code is not 0, which happens on test failures.
            const msg = error instanceof Error ? error.message : String(error);
            return {
                passed: false,
                output: `[FAILED] Tests failed or failed to compile.\n\nCommand Error:\n${msg}\n\nStandard Output:\n${error?.stdout || ''}\n\nStandard Error:\n${error?.stderr || ''}`
            };
        }
    }
}
//# sourceMappingURL=TestRunnerService.js.map