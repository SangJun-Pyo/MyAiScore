import { test, expect } from '@playwright/test';

// The primary product is now a local session summary. Legacy private/shared boundaries remain.
test('English local-first landing does not create an assessment or fake personal history', async ({ page }) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Discover your rhythm/ })).toBeVisible();
  await expect(page.locator('.session-hero-card')).toContainText('SYNTHETIC PREVIEW');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'See an example' }).click();
  await expect(page.locator('#example .session-report')).toContainText('SYNTHETIC EXAMPLE');
  await expect(page.locator('#example .session-report')).toContainText('ONE NEXT CHALLENGE');
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('product navigation and CLI instructions work at desktop/mobile with reduced motion', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const [name, path] of [['Home', '/'], ['Profile', '/profile'], ['Insights', '/insights'], ['New session', '/evaluate']]) {
    await page.getByRole('navigation').getByRole('link', { name: name!, exact: true }).click();
    await expect(page.getByRole('navigation').getByRole('link', { name: name!, exact: true })).toHaveAttribute('aria-current', 'page');
    if (path !== '/') await expect(page.getByRole('heading', { level: 1, name: name!, exact: true })).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(/[가-힣]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath((name ?? 'page').replace(' ', '-') + '.png'), fullPage: true });
  }
  await expect(page.locator('textarea,input[name="consent"],input[name="repo_url"]')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('npm run session:report');
  await expect(page.locator('main')).toContainText('An npm package is not published yet.');
  await page.getByText('Choose one session instead', { exact: true }).click();
  await expect(page.locator('details[open]')).toContainText('--session');
  expect(errors).toEqual([]);
});

test('legacy missing owner and revoked shared results retain honest boundaries', async ({ page }) => {
  await page.goto('/assessments/as_missing');
  await expect(page.locator('main [role="alert"]')).toContainText('access token');
  await page.goto('/results/not-a-share');
  await expect(page.locator('main [role="alert"]')).toContainText('not found');
});

test('legacy owned assessment still completes its question/result pipeline', async ({ page, request }) => {
  const example = await (await request.get('/api/examples/starter')).json();
  let status = 'draft', ingestion = 'not_started';
  const calls: string[] = [];
  const questions = [1, 2, 3].map(i => ({ question_id: `q_${i}`, text: `What did you check in verification step ${i}?`, grounding_evidence_ids: [], target_criteria: ['D'] }));
  await page.addInitScript(() => sessionStorage.setItem('myaiscore_owner_token', 'x'.repeat(43)));
  await page.route('**/api/assessments**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') calls.push(path);
    expect(req.headers().authorization).toBe(`Bearer ${'x'.repeat(43)}`);
    if (path.endsWith('/ingest')) ingestion = 'complete';
    if (path.endsWith('/questions')) status = 'awaiting_answers';
    if (path.endsWith('/finalize')) status = 'done';
    await route.fulfill({ json: { ...example, assessment_id: 'as_synthetic_browser', status, ingestion_status: ingestion, questions: status === 'draft' ? [] : questions, result: status === 'done' ? example.result : null } });
  });
  await page.goto('/assessments/as_synthetic_browser');
  await page.getByRole('button', { name: /Collect evidence/ }).click();
  await expect(page.getByLabel('What did you check in verification step 1?')).toBeVisible();
  await page.getByLabel('What did you check in verification step 1?').fill('Synthetic answer: I checked the failure result.');
  await page.getByRole('button', { name: /Review these answers/ }).click();
  await expect(page.locator('.result-view')).toContainText('synthetic example');
  expect(calls.map(p => p.split('/').at(-1))).toEqual(['ingest', 'questions', 'answers', 'finalize']);
});
