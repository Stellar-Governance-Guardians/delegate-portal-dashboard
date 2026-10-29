import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      // System Chrome keeps CI setup to npm ci + build (no browser download).
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 240_000,
    env: {
      // Deliberately unset: the e2e run proves the fail-loud state. A live
      // indexer run is a separate, opt-in invocation with INDEXER_URL set.
      INDEXER_URL: '',
    },
  },
});
