# Setup & Configuration Guide

This MCP provides administrative tools to perfectly scaffold a Playwright-BDD project, guarding against conflicting installations and improperly routed test output.

## `setup_project`
Initializes a new or existing repository with Playwright-BDD configurations. It automatically enforces `featuresRoot` isolation to prevent infinite test runner loops.

**Example Prompt to AI:**
> *"Set up my Playwright automation framework natively in `C:/my-project`. Use `MyBasePage.ts` as the custom wrapper class."*

## `manage_env`
Safely manages local `.env` values without leaking secrets to the LLM context.
*   **Scaffold**: Generates `.env.example` and a boilerplate `.env`.
*   **Write**: Updates explicit keys.
*   **Read**: Securely lists existing keys (values redacted).

**Example Prompt to AI:**
> *"Scaffold a .env file for my project. I need keys for `baseUrl` (mapped via `config.envKeys.baseUrl`), `API_TOKEN`, and `DB_HOST`."*

## `manage_config`
Generates an `mcp-config.json` inside your root directory. This configures heuristics like the default Base Page wrapper, global test timeouts, or extra directories for payload scanning.
*   **Custom Environments**: Overriding the `testRunTimeout` or setting an `executionCommand` (e.g. `yarn test:e2e --`) allows seamless integration into mature monolithic NPM structures without relying on raw `npx`.

**Example Prompt to AI:**
> *"Set my MCP configuration so the default test timeout is 60000ms, the `customWrapperPackage` is set to `@my-company/qa-core`, and map my run command to `yarn run test:e2e --`."*

## `manage_users`
Testing applications often requires multiple user roles (Admin, Editor, Viewer). This tool scaffolds `test-data/users.json` with multi-environment credential support, storing the file safely in `.gitignore`.

**Example Prompt to AI:**
> *"Add user roles for 'Admin' and 'Guest' in the 'staging' environment."*
