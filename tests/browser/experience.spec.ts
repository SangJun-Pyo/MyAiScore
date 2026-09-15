import { test, expect } from '@playwright/test';
test('Logic Core retains one canvas through axis and motion changes and survives context loss', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  await expect(scene).toHaveAttribute('data-renderer', 'webgl');
  await page.screenshot({ path: testInfo.outputPath('logic-core.png'), fullPage: true });
  const originalCanvas = await scene.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'A Problem framing', exact: true }).click();
  await expect(scene).toHaveAttribute('data-active-axis', 'A');
  await expect(scene.locator('canvas')).toHaveCount(1);
  expect(await scene.locator('canvas').evaluate((canvas, original) => canvas === original, originalCanvas)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene.locator('canvas')).toBeHidden();
  await page.getByRole('button', { name: 'E Judgment & iteration', exact: true }).click();
  await expect(scene.locator('svg [data-axis="E"]')).toHaveAttribute('data-active', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  await expect(scene).toHaveAttribute('data-renderer', 'webgl');
  expect(await scene.locator('canvas').evaluate((canvas, original) => canvas === original, originalCanvas)).toBe(true);
  await scene.locator('canvas').dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(errors).toEqual([]);
});

test('motion preference is reconciled even when the browser misses its change event', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const media = original(query);
      if (query.includes('prefers-reduced-motion')) media.addEventListener = () => {};
      return media;
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const scene = page.getByTestId('hero-scene');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-renderer', 'webgl');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene.locator('canvas')).toBeHidden();
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-renderer', 'webgl');
  await expect(scene.locator('canvas')).toHaveCount(1);
});

test('reduced motion keeps the decorative hero static and the form usable', async ({ page }) => {
  const errors: string[] = []; page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('hero-scene')).toHaveAttribute('data-renderer', 'static');
  await expect(page.getByTestId('hero-scene').locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'C Tool choice', exact: true }).click();
  await expect(page.getByTestId('hero-scene')).toHaveAttribute('data-active-axis', 'C');
  await page.goto('/evaluate');
  await expect(page.getByLabel(/Public GitHub repository/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
test('unavailable WebGL falls back without blocking navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('hero-scene')).toHaveAttribute('data-renderer', 'static');
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await expect(page.locator('#example')).toContainText('synthetic');
  expect(errors).toEqual([]);
});
test('landing and real synthetic example render without a model key', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Build with AI/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: /Explore a sample/ }).click();
  await expect(page.locator('#example')).toContainText('synthetic');
  await expect(page.locator('#example')).toContainText('improvement');
  await expect(page.locator('#example').getByRole('button', { name: /Copy/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
test('direct example URL and missing owner token have honest states', async ({ page }) => {
  await page.goto('/?view=example#example');
  await expect(page.locator('#example')).toContainText('synthetic');
  await page.goto('/assessments/as_missing');
  await expect(page.locator('main [role="alert"]')).toContainText('access token');
});
test('revoked/unknown shared result never exposes an owner view', async ({ page }) => {
  await page.goto('/results/not-a-share');
  await expect(page.locator('main [role="alert"]')).toBeVisible();
  await expect(page.locator('main [role="alert"]')).toContainText('not found');
});
test('browser completes input, questions and result with explicitly synthetic API fixtures', async ({ page, request }) => {
  const example = await (await request.get('/api/examples/starter')).json();
  let status = 'draft', ingestion = 'not_started';
  const calls: string[] = [];
  const questions = [1, 2, 3].map(i => ({ question_id: `q_${i}`, text: `What did you check in verification step ${i}?`, grounding_evidence_ids: [], target_criteria: ['D'] }));
  await page.route('**/api/config', route => route.fulfill({ json: { live_enabled: true, provider_configured: true } }));
  await page.route('**/api/assessments**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') calls.push(path);
    if (path === '/api/assessments') { await route.fulfill({ status: 201, json: { assessment_id: 'as_synthetic_browser', status, owner_access_token: 'x'.repeat(43) } }); return; }
    expect(req.headers().authorization).toBe(`Bearer ${'x'.repeat(43)}`);
    if (path.endsWith('/ingest')) ingestion = 'complete';
    if (path.endsWith('/questions')) status = 'awaiting_answers';
    if (path.endsWith('/finalize')) status = 'done';
    await route.fulfill({ json: { ...example, assessment_id: 'as_synthetic_browser', status, ingestion_status: ingestion, questions: status === 'draft' ? [] : questions, result: status === 'done' ? example.result : null } });
  });
  await page.goto('/evaluate');
  await page.getByLabel(/Public GitHub repository/).fill('https://github.com/example/project');
  await page.locator('input[name="consent"]').check();
  await page.getByRole('button', { name: /Start project assessment/ }).click();
  await expect(page).toHaveURL(/assessments\/as_synthetic_browser/);
  await page.getByRole('button', { name: /Collect evidence/ }).click();
  await expect(page.getByLabel('What did you check in verification step 1?')).toBeVisible();
  await page.getByLabel('What did you check in verification step 1?').fill('Synthetic answer: I checked the failure result.');
  await page.getByRole('button', { name: /Review these answers/ }).click();
  await expect(page.locator('.result-view')).toContainText('synthetic example');
  expect(calls.map(p => p.split('/').at(-1))).toEqual(['assessments', 'ingest', 'questions', 'answers', 'finalize']);
});

test('English landing chapters, FAQ and product pages remain usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('a[href="#process"]').click();
  await expect(page).toHaveURL(/#process$/);
  const faq = page.locator('details').first();
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  for (const path of ['/', '/profile', '/insights', '/evaluate', '/?view=example#example']) {
    await page.goto(path);
    if (path.includes('view=example')) await expect(page.locator('.result-view')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.locator('main').innerText()).not.toMatch(/[가-힣]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
