# TestForge MCP Config Reference

This document provides a reference for all fields supported in `mcp-config.json` for the TestForge project. 

The config structure defines how TestForge discovers, generates, and executes Playwright automation tests. All paths are relative to `projectRoot` unless otherwise specified.

## General Information
- `version` (`string`): Version of the project configuration structure. Default: `"2.4.0"`
- `projectRoot` (`string`, optional): Absolute path to the actual automation code. If provided, MCP tools can use this as a fallback projectRoot.
- `architectureNotesPath` (`string`): Path to store/read special architecture notes about custom wrappers or patterns. Default: `"docs/mcp-architecture-notes.md"`

## Environments & Auth
- `currentEnvironment` (`string`): Currently active environment (matches users.{env}.json). Default: `"staging"`
- `environments` (`string[]`): All supported environments for this project. Default: `["local", "staging", "prod"]`
- `authStrategy` (`'none' | 'users-json' | 'env'`): Auth strategy for the project. Default: `"users-json"`
  - `"none"`: no login step generated
  - `"users-json"`: credentials from test-data/users.{env}.json (recommended)
  - `"env"`: credentials from .env variables (legacy)
- `envKeys.baseUrl` (`string`): Mapping from logical key names to actual .env variable names. Default: `"BASE_URL"`
- `envKeys.[key: string]` (`string`): Any other custom env key mappings.

## Directory Layout
All paths are relative to the project root.
- `dirs.features` (`string`): Path to Gherkin feature files. Default: `"features"`
- `dirs.pages` (`string`): Path to Page Object Models. Default: `"pages"`
- `dirs.stepDefinitions` (`string`): Path to Cucumber step definitions. Default: `"step-definitions"`
- `dirs.testData` (`string`): Path to test fixtures and data. Default: `"test-data"`
- `additionalDataPaths` (`string[]`): Additional folder names or relative paths where test data (JSON/TS/JS) might be stored. Scanned recursively by the codebase analyzer. Default: `[]`

## Playwright & TypeScript Tools Settings
- `browsers` (`Array<'chromium' | 'firefox' | 'webkit'>`): Browsers to include in generated playwright.config.ts. Each entry maps to a Playwright project. Default: `["chromium"]`
- `playwrightConfig` (`string`, optional): Relative path to the Playwright config file. Passed as `--config <playwrightConfig>` to `bddgen` and `playwright test`.
- `tsconfigPath` (`string`, optional): Relative path to the TypeScript config file. Passed as `--tsconfig <path>` to every TypeScript compilation step. 
- `executionCommand` (`string`, optional): Custom execution command. Overrides the default test runner command (e.g., `'npm run test:e2e --'`).
- `retries` (`number`): Number of retries for test execution. Default: `1`

## Test Generation & Execution Behaviour
- `tags` (`string[]`): Tags the generation prompt enforces. Override to match your team's taxonomy. Default: `["@smoke", "@regression", "@e2e", "@a11y"]`
- `backgroundBlockThreshold` (`number`): How many scenarios must share the same first Given step before a Background block is auto-generated. Default: `3`
- `basePageClass` (`string`, optional): Package name or relative path to a base Page Object class. Injected into generation context so all new POMs extend it.
- `waitStrategy` (`'networkidle' | 'domcontentloaded' | 'load'`): Load state strategy to use after navigation calls. Default: `"domcontentloaded"`

## Timeouts
- `timeouts.testRun` (`number`): Maximum time (in ms) for a single test run shell execution. Default: `120000`
- `timeouts.sessionStart` (`number`): Maximum time (in ms) to wait for a Playwright session to start or navigate. Default: `30000`
- `timeouts.healingMax` (`number`): Max attempts for the validate_and_write self-healing loop. Default: `3`

## Accessibility Settings
- `a11yStandards` (`string[]`): Accessibility standards to check against. Default: `["wcag2aa"]`
- `a11yReportPath` (`string`): Path where accessibility violation reports should be saved. Default: `"test-results/a11y-report.json"`
