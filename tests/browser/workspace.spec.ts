import { test, expect } from '@playwright/test';

test('empty profile and axis criteria never invent an assessment', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'No assessments yet.' })).toBeVisible();
  await expect(page.locator('.history-entry')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('navigation').getByRole('link', { name: 'Insights', exact: true }).click();
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

test('profile loads owner summaries and selected detail with explicitly synthetic fixtures', async ({ page, request }) => {
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
  await page.getByRole('link', { name: /Explore the evidence by dimension/ }).click();
  await expect(page).toHaveURL(/insights\?assessment=as_synthetic_history/);
  await expect(page.locator('.insight-rationale')).toBeVisible();
  await page.getByRole('tab', { name: /D Verification/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Verification');
  await expect(page.locator('.evidence-list')).toContainText('src/');
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
