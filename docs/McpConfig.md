# Playwright BDD POM MCP Configuration Guide

The `mcp-config.json` file dictates project-level rules for test generation and execution. The AI reads this file to understand the environment parameters it must operate under.

## Configuration Fields

| Field | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `projectRoot` | `string` | `"."` | The absolute path to the Playwright root if running in monorepo setups. |
| `version` | `number` | `1.0` | Configuration schema version for internal MCP migration tools. |
| `basePageClass` | `string` | `"base.page.ts"` | Target Custom Wrapper package or native POM abstraction class if available. |
| `tags` | `string[]` | `["@smoke", "@regression"]` | Allowed tags for Gherkin features (`npm run bddgen --tags=@smoke`). |
| `testRunTimeout` | `number` | `120000` | (in ms) Maximum duration allowed via the `TestRunnerService`. |
| `backgroundBlockThreshold` | `number` | `3` | When to extract common Given steps into a `Background` block. |
| `waitStrategy` | `string` | `"domcontentloaded"` | Default wait-for-navigation load state in generated steps. |
| `authStrategy` | `string` | `"users-json"` | How tests fetch credentials (`env` or `users-json`). |
| `environments` | `string[]` | `["staging", "prod"]` | List of target environments (used to scaffold `users.{env}.json`). |
| `currentEnvironment` | `string` | `"staging"` | Active test data layer environment. |
| `a11yStandards` | `string[]` | `["wcag2aa"]` | Axe-core accessibility checklist compliance levels. |
| `a11yReportPath` | `string` | `"test-results/a11y-report.html"` | Default path to output a11y HTML results. |
