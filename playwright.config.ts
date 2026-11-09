import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './qa/playwright/tests',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  webServer: {
    command: 'python3 server.py',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
