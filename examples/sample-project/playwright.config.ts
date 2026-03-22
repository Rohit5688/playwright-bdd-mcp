import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
const testDir = defineBddConfig({
  featuresRoot: 'src/features',
  features: 'src/features/**/*.feature',
  steps: 'src/step-definitions/**/*.ts',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000',
    headless: process.env['HEADLESS'] !== 'false',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
