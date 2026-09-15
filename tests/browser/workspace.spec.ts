import { test, expect } from '@playwright/test';
import { buildSessionReport, EMPTY_SESSION_METRICS, encodeSessionReportFragment } from '../../src/shared/sessionReport';

const report = buildSessionReport({ ...EMPTY_SESSION_METRICS, userMessages: 3, assistantMessages: 6, toolCalls: 7, readCalls: 2, changeCalls: 3, verificationCalls: 1, toolResults: 5, explicitSuccesses: 3, explicitFailures: 1, unknownResults: 1 });
const key = 'myaiscore_session_reports_v1';

test('empty profile and insights do not invent a session or use old owner history', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  await page.addInitScript(() => sessionStorage.setItem('myaiscore_owner_token', 'z'.repeat(43)));
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'No saved sessions yet.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No session selected.' })).toBeVisible();
  expect(requests).toEqual([]);
});

test('synthetic example has transparent rules but cannot contaminate personal history', async ({ page }) => {
  await page.goto('/evaluate');
  await page.getByRole('button', { name: 'Try a synthetic example' }).click();
  await expect(page.locator('.session-report')).toContainText('SYNTHETIC EXAMPLE');
  await expect(page.getByRole('button', { name: 'Save report locally' })).toBeDisabled();
  await page.getByRole('link', { name: 'Explore the counts' }).click();
  await expect(page.locator('.session-rules')).toContainText('Rule version: activity-mix-v1');
  await expect(page.locator('.session-metrics')).toContainText('explicit failures');
  await page.getByRole('navigation').getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No saved sessions yet.' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('safe JSON import previews without network or storage then explicitly saves and removes', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  await page.goto('/evaluate');
  await page.getByLabel('Open session report').setInputFiles({ name: 'session-report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await expect(page.locator('.session-report')).toContainText('LOCAL SESSION SUMMARY');
  await expect(page.locator('.session-score > strong')).toHaveText(String(report.score.value));
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('local-session-report.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save report locally' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Summary saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Save report locally' }).click();
  const stored = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(stored).toEqual([report]);
  expect(Object.keys(stored[0])).not.toContain('events');
  await page.getByRole('navigation').getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-entry')).toHaveCount(1);
  await page.getByRole('button', { name: 'View session' }).click();
  await expect(page.locator('.session-metrics')).toContainText('verification calls');
  await expect(page.locator('.session-report')).toContainText(report.style.title);
  await page.getByRole('navigation').getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Remove summary' }).click();
  await expect(page.getByRole('heading', { name: 'No saved sessions yet.' })).toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
  expect(requests).toEqual([]);
});

test('fragment report is decoded locally, removed from URL and never automatically saved', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/evaluate' + encodeSessionReportFragment(report));
  await expect(page.locator('.session-report')).toContainText(report.style.title);
  await expect(page).toHaveURL(/\/evaluate$/);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(requests.some(url => url.includes('userMessages') || url.includes('report='))).toBe(false);
  await page.reload();
  await expect(page.locator('.session-report')).toHaveCount(0);
});

test('raw, forged, malformed and oversize imports reject without revealing or saving content', async ({ page }) => {
  await page.goto('/evaluate');
  for (const content of [JSON.stringify({ ...report, events: ['PRIVATE_SENTINEL'] }), JSON.stringify({ ...report, score: { ...report.score, value: 100 } }), '{PRIVATE_SENTINEL', 'PRIVATE_SENTINEL'.repeat(2000)]) {
    await page.getByLabel('Open session report').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await expect(page.getByRole('alert')).toContainText('not a supported session summary');
    await expect(page.locator('main')).not.toContainText('PRIVATE_SENTINEL');
    await expect(page.locator('.session-report')).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  }
  await page.goto('/evaluate#report=PRIVATE_SENTINEL');
  await expect(page.getByRole('alert')).toContainText('not a supported session summary');
  await expect(page).toHaveURL(/\/evaluate$/);
});

test('corrupted saved history is recoverable and never renders untrusted text', async ({ page }) => {
  await page.addInitScript(storageKey => localStorage.setItem(storageKey, '[{"text":"PRIVATE_SENTINEL"}]'), key);
  await page.goto('/profile');
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await expect(page.locator('main')).not.toContainText('PRIVATE_SENTINEL');
  await page.getByRole('button', { name: 'Clear saved summaries' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
});

