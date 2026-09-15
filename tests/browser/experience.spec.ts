import { test, expect } from '@playwright/test';

test('evidence preview exposes all five perspectives through one keyboard tab stop', async ({ page }) => {
  await page.goto('/');
  const preview = page.getByTestId('evidence-preview');
  const tabs = preview.getByRole('tab');
  const panel = preview.getByRole('tabpanel');
  await expect(tabs).toHaveCount(5);
  await expect(preview.getByRole('tab', { name: 'D Verification', exact: true })).toHaveAttribute('aria-selected', 'true');
  await preview.getByRole('tab', { name: 'D Verification', exact: true }).focus();
  const moves = [
    ['Home', 'A Problem framing'], ['ArrowRight', 'B Context & delegation'],
    ['ArrowRight', 'C Tool choice'], ['ArrowRight', 'D Verification'],
    ['ArrowRight', 'E Judgment & iteration'], ['ArrowRight', 'A Problem framing'],
    ['ArrowLeft', 'E Judgment & iteration'], ['Home', 'A Problem framing'],
    ['End', 'E Judgment & iteration'],
  ];
  for (const [key, name] of moves) {
    await page.keyboard.press(key!);
    const selected = preview.getByRole('tab', { name: name!, exact: true });
    await expect(selected).toBeFocused();
    await expect(selected).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveAttribute('tabindex', '0');
    await expect(preview.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
    await expect(preview.locator('[role="tab"][tabindex="-1"]')).toHaveCount(4);
    await expect(panel).toHaveAttribute('aria-labelledby', (await selected.getAttribute('id'))!);
    await expect(selected).toHaveAttribute('aria-controls', (await panel.getAttribute('id'))!);
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText(name!.slice(2));
  }
  await page.keyboard.press('Tab');
  await expect(panel).toBeFocused();
  await preview.getByRole('tab', { name: 'C Tool choice', exact: true }).click();
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Tool choice');
});

test('hero illustration never creates an assessment or presents a score or progress', async ({ page }) => {
  const assessmentRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/assessments')) assessmentRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const preview = page.getByTestId('evidence-preview');
  await expect(preview).toContainText('Illustrative preview');
  await expect(preview).toContainText('Example content. No project has been analyzed.');
  for (const name of ['A Problem framing', 'B Context & delegation', 'C Tool choice', 'D Verification', 'E Judgment & iteration']) {
    await preview.getByRole('tab', { name, exact: true }).click();
    await expect(preview).toContainText('Project evidence');
    await expect(preview).toContainText('Your decision');
    await expect(preview).toContainText('Example content. No project has been analyzed.');
    expect(await preview.innerText()).not.toMatch(/\bscore\b|\d+\s*%|\/\s*100|\bLevel\s*[1-4]\b/i);
  }
  await expect(preview.locator('canvas, progress, [role="progressbar"], [role="meter"]')).toHaveCount(0);
  await expect(page.locator('.landing-hero canvas')).toHaveCount(0);
  expect(assessmentRequests).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('myaiscore_owner_token'))).toBeNull();
  expect(errors).toEqual([]);
});

test('reduced-motion preview and focused product pages remain usable at each viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const preview = page.getByTestId('evidence-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveCSS('animation-name', 'none');
  await preview.getByRole('tab', { name: 'B Context & delegation', exact: true }).click();
  await expect(preview.getByRole('tabpanel')).toContainText('Context & delegation');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home-evidence-preview.png'), fullPage: true });
  await page.screenshot({ path: testInfo.outputPath('home-hero.png') });
  for (const [name, path, heading] of [
    ['Profile', '/profile', 'Profile'], ['Insights', '/insights', 'Insights'],
    ['New assessment', '/evaluate', 'New assessment'],
  ]) {
    await page.getByRole('navigation').getByRole('link', { name: name!, exact: false }).click();
    await expect(page).toHaveURL(new RegExp(path! + '$'));
    await expect(page.getByRole('heading', { level: 1, name: heading!, exact: true })).toBeVisible();
    if (path === '/evaluate') await expect(page.getByLabel(/Public GitHub repository/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(path!.slice(1) + '.png'), fullPage: true });
  }
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
