import { test, expect } from '@playwright/test';

test('evidence states stay distinct across private, comparison, and public views', async ({ page, request }) => {
  const example = await (await request.get('/api/examples/starter')).json();
  const criteria = [
    { criterion_code: 'A', status: 'observed', level: 3 },
    { criterion_code: 'B', status: 'insufficient_evidence', level: null },
    { criterion_code: 'C', status: 'not_observed', level: null },
    // D is absent and E is unknown: neither is evidence of an unobserved action.
    { criterion_code: 'E', status: 'future_status', level: null },
  ];
  const summary = {
    assessment_id: 'as_synthetic_states', repo_url: 'https://github.com/example/synthetic-states',
    commit_sha: 'a'.repeat(40), status: 'done', created_at: '2026-09-14T00:00:00Z',
    expires_at: '2026-09-21T00:00:00Z', score: { status: 'withheld', value: null },
    criteria, visibility: 'private',
  };
  const assessment = {
    ...example, ...summary, is_example: true, previous_assessment_id: 'as_synthetic_previous',
    result: { ...example.result, criteria, score: summary.score },
  };
  await page.addInitScript(() => sessionStorage.setItem('myaiscore_owner_token', 's'.repeat(43)));
  await page.route('**/api/assessments**', async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${'s'.repeat(43)}`);
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/assessments') return route.fulfill({ json: { assessments: [summary], total: 1, limit: 50, has_more: false } });
    if (path.endsWith('/comparison')) return route.fulfill({ json: {
      comparison_allowed: false, score_delta: null, behavior_change: 'not_established',
      reasons: ['score_withheld'], evidence_changed: true, code_revision_changed: false,
      explanations: [], previous_assessment_id: 'as_synthetic_previous', assessment_id: summary.assessment_id,
      axes: criteria.map(criterion => ({ criterion_code: criterion.criterion_code, previous: criterion, current: criterion })),
    } });
    expect(path).toBe(`/api/assessments/${summary.assessment_id}`);
    return route.fulfill({ json: assessment });
  });
  await page.route('**/api/results/synthetic-states', route => route.fulfill({ json: assessment }));

  await page.goto('/profile');
  const record = page.locator('.history-entry');
  await expect(record).toContainText('Withheld');
  await record.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`insights\\?assessment=${summary.assessment_id}`));
  await expect(page.locator('.insight-observation .level-badge')).toHaveText('3 / 4');
  await page.getByRole('tab', { name: /B Context & delegation/ }).click();
  await expect(page.locator('.insight-observation .level-badge')).toHaveText('Insufficient evidence');
  await page.getByRole('tab', { name: /C Tool choice/ }).click();
  await expect(page.locator('.insight-observation .level-badge')).toHaveText('Not observed');
  await page.getByRole('tab', { name: /D Verification/ }).click();
  await expect(page.locator('.insight-observation .level-badge')).toHaveText('Not assessed');
  await page.getByRole('tab', { name: /E Judgment & iteration/ }).click();
  await expect(page.locator('.insight-observation .level-badge')).toHaveText('Not assessed');

  await page.goto(`/assessments/${summary.assessment_id}`);
  await expect(page.locator('.finding .level-badge')).toHaveText(['3 / 4', 'Insufficient evidence', 'Not observed', 'Not assessed', 'Not assessed']);
  await expect(page.locator('.comparison-table tbody tr').nth(1).locator('td')).toHaveText(['Insufficient evidence', 'Insufficient evidence']);
  await expect(page.locator('.comparison-table tbody tr').nth(2).locator('td')).toHaveText(['Not observed', 'Not observed']);
  await expect(page.locator('.comparison-table tbody tr').nth(3).locator('td')).toHaveText(['Not assessed', 'Not assessed']);
  await page.getByRole('button', { name: 'Preview what will be shared' }).click();
  await expect(page.locator('.share-preview strong')).toHaveText(['Level 3', 'Insufficient evidence', 'Not observed', 'Not assessed', 'Not assessed']);

  await page.goto('/results/synthetic-states');
  await expect(page.locator('.finding .level-badge')).toHaveText(['3 / 4', 'Insufficient evidence', 'Not observed', 'Not assessed', 'Not assessed']);
});
