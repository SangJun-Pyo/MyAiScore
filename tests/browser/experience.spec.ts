import { test, expect } from '@playwright/test';

test('한국어 홈은 로그인 없는 공개 저장소 흐름과 가상 예시를 설명하며 API를 호출하지 않는다', async ({ page }) => {
  const apiRequests: string[] = [], errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { level: 1, name: /공개 저장소에서/ })).toBeVisible();
  await expect(page.getByText('회원가입 불필요', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: '내 저장소 분석하기' })).toHaveAttribute('href', '/evaluate');
  await expect(page.locator('.repo-hero-card')).toContainText('실험실 프로토타이퍼');
  await page.getByRole('link', { name: '예시 리포트 보기' }).click();
  await expect(page.locator('#demo')).toContainText('가상 예시');
  await expect(page.locator('#demo .repo-profile-code')).toHaveText('RHSF');
  await expect(page.locator('#demo')).toContainText('개인의 AI 실력을 인증하지 않아요.');
  await expect(page.locator('#demo code')).toContainText(['README.md', 'AGENTS.md']);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('주요 메뉴는 데스크톱과 모바일에서 한국어로 탐색되고 키보드 초점이 보인다', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const [name, path, heading] of [
    ['홈', '/', /공개 저장소에서/],
    ['내 리포트', '/profile', '내 리포트'],
    ['해석 가이드', '/insights', '해석 가이드'],
    ['저장소 분석', '/evaluate', '공개 저장소 분석'],
  ] as const) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : `${path}$`}`));
    await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/evaluate');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '본문으로 건너뛰기' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('korean-repository-evaluate.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('기존 비공개 결과와 공유 결과의 접근 경계는 유지된다', async ({ page }) => {
  await page.goto('/assessments/as_missing');
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main [role="alert"]')).toContainText('access token');
  await page.goto('/results/not-a-share');
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main [role="alert"]')).toContainText('not found');
});

test('기존 소유 평가의 질문과 결과 파이프라인은 유지된다', async ({ page, request }) => {
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
