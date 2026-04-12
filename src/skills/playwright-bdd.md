# Playwright BDD Skills
- **Configuration**: Always ensure BDD configurations are defined in `playwright.config.ts` or `playwright-bdd` configuration files (`defineBddConfig`).
- **Step Definitions**: Use standard given/when/then step markers. Map step arguments according to feature files explicitly. Example pattern:
  `Given('I am on the {string} page', async ({ page }, url) => { await page.goto(url); });`
- **Fixture Patterns**: Leverage Playwright fixtures for page objects to ensure isolated state and clean setup/teardown. Avoid global singletons for page manipulation.
