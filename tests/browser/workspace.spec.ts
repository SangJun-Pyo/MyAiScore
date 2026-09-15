import { test, expect } from '@playwright/test';

test('empty profile and axis criteria never invent an assessment', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No assessments yet.' })).toBeVisible();
  await expect(page.locator('.history-entry')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('navigation').getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible();
  await expect(page.getByText('No completed assessments to show.')).toBeVisible();
  await expect(page.locator('.example-banner')).toHaveCount(0);
  const tabA = page.getByRole('tab', { name: /A Problem framing/ });
  await tabA.focus(); await tabA.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /B Context & delegation/ })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Context & delegation');
  await page.getByRole('tab', { name: /B Context & delegation/ }).press('End');
  await expect(page.getByRole('tab', { name: /E Judgment & iteration/ })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('explicit synthetic insight can be exited without contaminating history', async ({ page }) => {
  await page.goto('/insights?view=example&axis=D');
  await expect(page.locator('.example-banner')).toContainText('synthetic example');
  await expect(page.getByRole('tab', { name: /D Verification/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.getByRole('button', { name: 'Synthetic example', exact: true }).click();
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.getByRole('button', { name: 'My assessments', exact: true }).click();
  await expect(page.locator('.example-banner')).toHaveCount(0);
  await expect(page.getByText('No completed assessments to show.')).toBeVisible();
  await expect(page.locator('.insight-rationale')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('myaiscore_owner_token'))).toBeNull();
});

test('same-route query navigation updates the selected axis and source', async ({ page }) => {
  await page.goto('/insights?view=example&axis=A');
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.evaluate(() => window.history.pushState(null, '', '/insights?view=example&axis=E'));
  await expect(page.getByRole('tab', { name: /E Judgment & iteration/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.evaluate(() => window.history.pushState(null, '', '/insights?axis=B'));
  await expect(page.getByRole('tab', { name: /B Context & delegation/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.example-banner')).toHaveCount(0);
  await expect(page.locator('.insight-rationale')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('tab', { name: /E Judgment & iteration/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.insight-rationale')).toBeVisible();
});

test('profile loads owner summaries and selected detail with explicitly synthetic fixtures', async ({ page, request }, testInfo) => {
  const example = await (await request.get('/api/examples/starter')).json();
  const token = 'y'.repeat(43);
  await page.addInitScript(value => sessionStorage.setItem('myaiscore_owner_token', value), token);
  const summary = { assessment_id: 'as_synthetic_history', repo_url: 'https://github.com/example/synthetic-history', commit_sha: 'a'.repeat(40), status: 'done', created_at: '2026-09-14T00:00:00Z', expires_at: '2026-09-21T00:00:00Z', score: { status: 'withheld', value: null }, criteria: example.result.criteria.map((c: any) => ({ criterion_code: c.criterion_code, status: c.status, level: c.level })), visibility: 'private' };
  await page.route('**/api/assessments**', async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/assessments') return route.fulfill({ json: { assessments: [summary], total: 1, limit: 50, has_more: false } });
    expect(path).toBe('/api/assessments/as_synthetic_history');
    await route.fulfill({ json: { ...example, assessment_id: summary.assessment_id, repo_url: summary.repo_url } });
  });
  await page.goto('/profile');
  await expect(page.locator('.history-entry')).toHaveCount(1);
  await expect(page.locator('.history-entry')).toContainText('Withheld');
  await expect(page.locator('.history-entry')).not.toContainText('/100');
  await expect(page.locator('.history-entry').getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/assessments/as_synthetic_history');
  await page.screenshot({ path: testInfo.outputPath('profile-populated-synthetic.png'), fullPage: true });
  await page.locator('.history-entry').getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page).toHaveURL(/insights\?assessment=as_synthetic_history/);
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.getByRole('tab', { name: /D Verification/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Verification');
  await expect(page.locator('.evidence-list')).toContainText('src/');
  await expect(page.locator('.assessment-criteria')).not.toHaveAttribute('open', '');
  await page.screenshot({ path: testInfo.outputPath('insights-populated-synthetic.png'), fullPage: true });
  await page.locator('.assessment-criteria > summary').click();
  await expect(page.locator('.assessment-criteria > ol > li')).toHaveCount(4);
  await expect(page.locator('.assessment-criteria > ol')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('insights-criteria-expanded-synthetic.png'), fullPage: true });
});

test('explicit missing assessment is never replaced by a different history result', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('myaiscore_owner_token', 'z'.repeat(43)));
  const requested: string[] = [];
  await page.route('**/api/assessments**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/assessments') return route.fulfill({ json: { assessments: [{ assessment_id: 'as_another_project', repo_url: 'https://github.com/example/other', status: 'done', criteria: [], score: null, created_at: '2026-09-14T00:00:00Z' }], total: 1, limit: 50, has_more: false } });
    requested.push(path);
    await route.fulfill({ status: 404, json: { error: { code: 'not_found', message: 'Assessment not found.' } } });
  });
  await page.goto('/insights?assessment=as_deleted');
  await expect(page.locator('main [role="alert"]')).toContainText('Assessment not found.');
  expect(requested).toEqual(['/api/assessments/as_deleted']);
  await expect(page.locator('.insight-rationale')).toHaveCount(0);
});

test('focused assessment form retains optional inputs and requires consent before submission', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/config', route => route.fulfill({ json: { live_enabled: true, provider_configured: true } }));
  await page.route('**/api/assessments', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { assessment_id: 'as_synthetic_form', status: 'draft', owner_access_token: 'f'.repeat(43) } });
  });
  await page.route('**/api/assessments/as_synthetic_form', route => route.fulfill({ json: {
    assessment_id: 'as_synthetic_form', status: 'draft', repo_url: 'https://github.com/example/synthetic-form', result: null,
  } }));
  await page.goto('/evaluate');
  await expect(page.getByRole('heading', { level: 1, name: 'New assessment', exact: true })).toBeVisible();
  await expect(page.locator('.case-details')).not.toHaveAttribute('open', '');
  await expect(page.locator('.excerpt-details')).not.toHaveAttribute('open', '');
  await page.getByLabel(/Public GitHub repository/).fill('https://github.com/example/synthetic-form');
  await page.getByRole('button', { name: 'Start project assessment' }).click();
  expect(submitted).toBeUndefined();
  await page.locator('.case-details > summary').click();
  await page.getByLabel('Include this case in the assessment').check();
  const collaborationCase = {
    problem: 'Synthetic problem', constraints: 'Synthetic constraints', done_criteria: 'Synthetic completion check',
    ai_suggestion_summary: 'Synthetic AI suggestion', user_action_detail: 'Synthetic decision reasons',
    verification_summary: 'Synthetic observed result', user_action: 'rejected',
  };
  for (const [name, value] of Object.entries(collaborationCase)) {
    if (name === 'user_action') await page.getByLabel('Your decision', { exact: true }).selectOption(value);
    else await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.locator('.case-details > summary').click();
  await page.locator('.excerpt-details > summary').click();
  for (let index = 1; index <= 3; index++) {
    await page.getByRole('button', { name: '+ Add excerpt', exact: true }).click();
    await page.getByLabel(`Excerpt ${index}`, { exact: true }).fill(`Synthetic excerpt ${index}`);
  }
  await expect(page.getByRole('button', { name: '+ Add excerpt', exact: true })).toHaveCount(0);
  await page.locator('.excerpt-details > summary').click();
  await page.locator('input[name="consent"]').check();
  await page.getByRole('button', { name: 'Start project assessment' }).click();
  await expect(page).toHaveURL(/assessments\/as_synthetic_form/);
  expect(submitted).toEqual({
    repo_url: 'https://github.com/example/synthetic-form', collaboration_case: collaborationCase,
    excerpts: ['Synthetic excerpt 1', 'Synthetic excerpt 2', 'Synthetic excerpt 3'], consent: true,
  });
  expect(await page.evaluate(() => sessionStorage.getItem('myaiscore_owner_token'))).toBe('f'.repeat(43));
});
