import { defineConfig, devices } from '@playwright/test';
const testPort = process.env.PLAYWRIGHT_PORT ?? '3100';
const testOrigin = `http://127.0.0.1:${testPort}`;
export default defineConfig({
  testDir: './tests/browser', timeout: 30_000, retries: 0,
  use: { baseURL: testOrigin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${testPort}`, url: `${testOrigin}/api/health`, reuseExistingServer: !process.env.CI,
    env: { MYAISCORE_ENABLE_LIVE: 'false', MYAISCORE_ALLOW_FILE_STORE: 'true', NEXT_TELEMETRY_DISABLED: '1' } },
});
