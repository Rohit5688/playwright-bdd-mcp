# API Testing Protocols
- **Playwright Request API**: Use Playwright's native `request` fixture (the `APIRequestContext`) to test REST endpoints rather than relying on external libraries like axios or node-fetch. Example: `await request.post('/api/v1/auth', { data: payload })`.
- **Auth Patterns**: For secure environments, acquire authentication tokens via API calls (using `request` in `global-setup` or `beforeAll`) to bypass slow UI login interactions, saving the state into `storageState`.
- **Validation**: Assert API outcomes strictly. Check `expect(response.ok()).toBeTruthy()`, validate exact status codes (`response.status()`), and use schema validations or deep equality checks on `response.json()` payloads.
