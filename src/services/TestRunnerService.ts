import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ITestRunner, TestRunnerResult } from '../interfaces/ITestRunner.js';
import { sanitizeShellArg } from '../utils/SecurityUtils.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * TestRunnerService
 *
 * Executes Playwright-BDD tests via shell commands.
 * Phase 35: Sanitizes user-supplied test arguments to prevent command injection.
 * Phase 35b: Per-run timeout is config-driven via mcp-config.json (testRunTimeout).
 */
export class TestRunnerService implements ITestRunner {
  public async runTests(
    projectRoot: string,
    specificTestArgs?: string,
    timeoutMs?: number,
    executionCommand?: string
  ): Promise<TestRunnerResult> {
    const runTimeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      // Phase 35: Sanitize user-supplied arguments before shell interpolation
      const safeArgs = specificTestArgs ? sanitizeShellArg(specificTestArgs) : '';

      let command = 'npx bddgen && npx playwright test';

      if (executionCommand) {
        command = executionCommand;
      } else {
        // Auto-detect package manager locally if no custom executionCommand provided
        if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
          command = 'yarn bddgen && yarn playwright test';
        } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
          command = 'pnpm bddgen && pnpm exec playwright test';
        }
      }
      const isPackageRunner = /^(npm|yarn|pnpm|bun)\s+run\b/.test(command.trim());
      const needsSeparator = isPackageRunner && safeArgs;
      const argsToAppend = (needsSeparator && !command.includes(' -- ')) ? `-- ${safeArgs}` : safeArgs;

      const fullCommand = `${command} ${argsToAppend}`.trim();
      const commandSegments = fullCommand.split('&&').map(c => c.trim()).filter(Boolean);

      let aggregatedStdout = '';
      let aggregatedStderr = '';

      for (const cmdStr of commandSegments) {
        const parts = cmdStr.split(/\s+/).filter(p => p.length > 0);
        let exe = parts.shift();
        if (!exe) throw new Error(`Invalid execution segment: ${cmdStr}`);
        
        // Prevent path traversal in executable
        if (exe.includes('..') || (exe.includes('/') && !exe.startsWith('/'))) {
          throw new Error(`Invalid executable path: ${exe}`);
        }

        // On Windows, package managers often need .cmd extension for execFile
        const isWin = process.platform === 'win32';
        if (isWin && ['npm', 'npx', 'yarn', 'pnpm', 'bun'].includes(exe)) {
          exe = `${exe}.cmd`;
        }

        const args = parts;

        const { stdout, stderr } = await execFileAsync(exe, args, {
          cwd: projectRoot,
          timeout: runTimeout,
          env: { ...process.env, FORCE_COLOR: '0' }
        });

        aggregatedStdout += stdout + '\n';
        aggregatedStderr += stderr + '\n';
      }

      return {
        passed: true,
        output: `[SUCCESS] Tests passed!\n\nStandard Output:\n${aggregatedStdout.trim()}\n\nStandard Error:\n${aggregatedStderr.trim()}`
      };
    } catch (error) {
      // Check if the error is a timeout kill
      if (typeof error === 'object' && error !== null && 'killed' in error && error.killed) {
        return {
          passed: false,
          output: `[TIMEOUT] Test run exceeded the ${runTimeout / 1000}s limit and was killed.\n\nPartial Output:\n${(error as any).stdout || ''}\n\nIncrease testRunTimeout in mcp-config.json if your suite needs more time.`
        };
      }
      // In JS, exec throws if exit code is not 0, which happens on test failures.
      const msg = error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        output: `[FAILED] Tests failed or failed to compile.\n\nCommand Error:\n${msg}\n\nStandard Output:\n${(error as any)?.stdout || ''}\n\nStandard Error:\n${(error as any)?.stderr || ''}`
      };
    }
  }
}
