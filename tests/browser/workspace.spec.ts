import { test, expect, type Page } from '@playwright/test';

const key = 'myaiscore_repository_reports_v1';

function report(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 'repository-report-v1', ruleVersion: 'repository-signals-v1', source: 'github_public_repository',
    repo: 'https://github.com/example/public-repo', commitSha: 'a'.repeat(40),
    coverage: { status: 'complete', selectedFiles: 12, readFiles: 12, warnings: [] },
    score: { value: 70, label: 'AI 협업 준비도', explanation: '공개 저장소에 남은 신호를 네 축으로 계산했습니다.', breakdown: { context: 20, verification: 20, traceability: 15, automation: 15 } },
    style: { id: 'careful-builder', title: '근거를 남기는 빌더', description: '문서와 검증 장치를 함께 남기는 경향이 보입니다.' },
    evidence: [
      { axis: 'context', title: '프로젝트 맥락', description: '작업 방법이 문서에 남아 있습니다.', paths: ['README.md', 'AGENTS.md'] },
      { axis: 'verification', title: '검증 기반', description: '자동 테스트가 있습니다.', paths: ['tests/example.test.ts'] },
      { axis: 'traceability', title: '결정 기록', description: '선택의 이유를 확인할 수 있습니다.', paths: ['docs/Architecture/ADR/0001.md'] },
      { axis: 'automation', title: '반복 자동화', description: 'CI 구성이 있습니다.', paths: ['.github/workflows/ci.yml'] },
    ],
    gaps: ['실제 AI 대화에서 사용자가 어떤 판단을 했는지는 확인할 수 없습니다.'],
    nextChallenge: { title: '실패 사례도 기록해 보기', description: '다음 변경에서 실패한 검증과 해결 과정을 한 문단으로 남겨 보세요.' },
    ...overrides,
  };
}

async function interceptReport(page: Page, payload = report()) {
  const bodies: unknown[] = [];
  await page.route('**/api/repository-report', async route => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  return bodies;
}

test('빈 내 리포트와 해석 가이드는 API를 호출하거나 결과를 꾸며내지 않는다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '저장한 리포트가 없습니다.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '해석 가이드', exact: true }).click();
  await expect(page.getByRole('heading', { name: '선택한 리포트가 없습니다.' })).toBeVisible();
  await expect(page.locator('.repo-guide')).toContainText('각 축은 최대 25점입니다.');
  expect(requests).toEqual([]);
});

test('공개 저장소 URL 하나를 보내고 진행 상태와 근거가 있는 리포트를 표시한다', async ({ page }, testInfo) => {
  const bodies = await interceptReport(page);
  await page.goto('/evaluate');
  await expect(page.locator('input')).toHaveCount(1);
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('.notice[role="status"]')).toContainText(/분석이 완료되었습니다/);
  await expect(page.locator('.repo-score > strong')).toHaveText('70');
  await expect(page.locator('.repo-style')).toContainText('근거를 남기는 빌더');
  await expect(page.locator('.repo-axis-card')).toHaveCount(4);
  await page.locator('.repo-axis-card').filter({ hasText: '프로젝트 맥락' }).getByText('근거 파일 2개').click();
  await expect(page.locator('.repo-axis-card').filter({ hasText: '프로젝트 맥락' })).toContainText('AGENTS.md');
  await expect(page.locator('.repo-report')).toContainText('12/12개 선택 파일 확인');
  await expect(page.locator('.repo-report')).toContainText('실제 AI 대화에서 사용자가 어떤 판단을 했는지는 확인할 수 없습니다.');
  await expect(page.locator('.repo-report')).toContainText('실패 사례도 기록해 보기');
  await expect(page.locator('.repo-boundary')).toContainText('저장소에 남은 신호이며 개인 AI 실력 인증이 아닙니다.');
  expect(bodies).toEqual([{ repo_url: 'https://github.com/example/public-repo' }]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('repository-report.png'), fullPage: true });
});

test('API 오류와 계약에 맞지 않는 응답을 점수 없이 명확히 표시한다', async ({ page }) => {
  await page.route('**/api/repository-report', async route => route.fulfill({ status: 404, json: { error: { message: '공개 저장소를 찾을 수 없습니다.' } } }));
  await page.goto('/evaluate');
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/missing');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('공개 저장소를 찾을 수 없습니다.');
  await expect(page.locator('.repo-report')).toHaveCount(0);

  await page.unroute('**/api/repository-report');
  const invalid = report();
  invalid.score = { ...invalid.score, value: 99 };
  await page.route('**/api/repository-report', async route => route.fulfill({ status: 200, json: invalid }));
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('서버 응답을 확인할 수 없습니다.');
  await expect(page.locator('.repo-report')).toHaveCount(0);
});

test('저장은 명시적이며 같은 저장소와 커밋을 중복 없이 보관하고 삭제할 수 있다', async ({ page }) => {
  await interceptReport(page);
  await page.goto('/evaluate');
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await page.getByRole('button', { name: '이 브라우저에 저장' }).click();
  await page.getByRole('button', { name: '이 브라우저에 저장' }).click();
  expect(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).toHaveLength(1);
  await page.getByRole('navigation').getByRole('link', { name: '내 리포트', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-entry')).toContainText('example/public-repo');
  await page.getByRole('button', { name: '리포트 보기' }).click();
  await expect(page.locator('.repo-report')).toContainText('근거를 남기는 빌더');
  await page.getByRole('navigation').getByRole('link', { name: '내 리포트', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('heading', { name: '저장한 리포트가 없습니다.' })).toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
});

test('저장 목록은 최근 20개로 제한되고 전체 삭제와 손상 복구가 가능하다', async ({ page }) => {
  const reports = Array.from({ length: 20 }, (_, index) => report({ repo: `https://github.com/example/repo-${index}`, commitSha: index.toString(16).padStart(40, '0') }));
  await page.addInitScript(({ storageKey, values }) => localStorage.setItem(storageKey, JSON.stringify(values)), { storageKey: key, values: reports });
  await page.goto('/profile');
  await expect(page.locator('.history-entry')).toHaveCount(20);
  await page.getByRole('button', { name: '저장된 리포트 모두 삭제' }).click();
  await expect(page.getByRole('heading', { name: '저장한 리포트가 없습니다.' })).toBeVisible();

  await page.evaluate(storageKey => localStorage.setItem(storageKey, '[{"private":"노출되면 안 됨"}]'), key);
  await page.getByRole('navigation').getByRole('link', { name: '홈', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: '내 리포트', exact: true }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('저장된 리포트를 읽을 수 없습니다.');
  await expect(page.locator('main')).not.toContainText('노출되면 안 됨');
  await page.getByRole('button', { name: '저장된 리포트 모두 삭제' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toHaveCount(0);
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
});

test('CLI 세션 리포트는 브라우저 자동 수집이 아닌 보조 안내로 남는다', async ({ page }) => {
  await page.goto('/evaluate');
  await page.getByText('Claude Code 세션 리포트 CLI가 필요하다면', { exact: true }).click();
  await expect(page.locator('.repo-cli-secondary')).toContainText('브라우저가 로컬 대화 기록을 자동으로 읽지는 않습니다.');
  await expect(page.locator('.repo-cli-secondary')).toContainText('npm run session:report');
});
