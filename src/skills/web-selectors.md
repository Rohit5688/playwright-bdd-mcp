# Web Selectors Protocol
- **CSS-First Priority**: Always prioritize CSS selectors over XPath. Playwright's CSS selector engine is robust, faster, and more readable. Only fall back to XPath when absolutely necessary (e.g., complex ancestor traversal not supported by `has` or `has-text`).
- **Data-TestId Strategy**: The most resilient locator is `data-testid`. Prefer `page.getByTestId('my-id')` wherever elements are instrumented.
- **Accessible Locators**: When test IDs are missing, rely on user-facing attributes. Use accessibility selectors: `getByRole('button', { name: 'Submit' })`, `getByLabel()`, `getByPlaceholder()`, or `getByText()`.
- Avoid absolute or brittle DOM paths like `div > div > span:nth-child(2) > a`.
