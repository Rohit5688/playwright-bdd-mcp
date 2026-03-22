# Continuous Integration & Jira Documentation

Moving your code from your local machine to production requires pipelines and reporting. The MCP natively scaffolds these flows.

## `generate_ci_pipeline`
Instantly writes a complete, highly-optimized YAML file for the CI/CD provider of your choice. Pre-configured with node setup, dependencies, headless browser installation, execution commands, and HTML trace reporting.
- **Supported Providers**: GitHub Actions, GitLab CI, Jenkins.

**Example Prompt to AI:**
> *"Generate a CI pipeline for GitHub Actions. It should trigger on Push to `main` and run nightly at midnight."*

## `export_jira_bug`
When a test fails, you can ask the AI to generate a Jira-formatted bug ticket. This tool captures the failing test name, the raw Playwright error logs, and automatically appends the local file paths to the Playwright Trace (`trace.zip`) and Video Recordings (`.webm`) so you can attach them directly to your Atlasian Jira board.

**Example Prompt to AI:**
> *"The 'Checkout' scenario just failed with a timeout. Generate a Jira bug report for me so I can open a ticket for the frontend team."*

## `analyze_coverage_gaps`
If your project generates LCOV code coverage reports, this tool parses `lcov.info` to find exactly which application paths are missing tests. It then prompts the LLM to write the missing Gherkin scenarios to fill those gaps!

**Example Prompt to AI:**
> *"Run the coverage analysis on my reporter folder. Tell me which UI components are untested and draft Gherkin test scenarios for them."*
