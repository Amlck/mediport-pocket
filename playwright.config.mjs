import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.POCKET_PORT || 4173);
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '*.spec.mjs',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    headless: true,
    viewport: { width: 393, height: 852 },
    reducedMotion: 'reduce',
    baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:${port}`,
    env: { POCKET_PORT: String(port) },
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
