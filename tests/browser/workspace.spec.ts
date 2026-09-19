import { test, expect, type Page } from '@playwright/test';
import {
  REPOSITORY_REPORT_COPY,
  deriveRepositoryReportPresentation,
  type RepositoryReport,
  type RepositoryReportEvidenceCard,
} from '../../src/shared/repositoryReport.js';

const key = 'myaiscore_repository_reports_v1';

function report(overrides: Partial<RepositoryReport> = {}): RepositoryReport {
  const evidenceCards: RepositoryReportEvidenceCard[] = [
    { id: 'context-readme', ...REPOSITORY_REPORT_COPY.evidence['context-readme'], paths: ['README.md'] },
    { id: 'context-guidance', ...REPOSITORY_REPORT_COPY.evidence['context-guidance'], paths: ['AGENTS.md'] },
    { id: 'verification-tests', ...REPOSITORY_REPORT_COPY.evidence['verification-tests'], paths: ['tests/example.test.ts'] },
    { id: 'verification-config', ...REPOSITORY_REPORT_COPY.evidence['verification-config'], paths: ['tsconfig.json'] },
    { id: 'traceability-decisions', ...REPOSITORY_REPORT_COPY.evidence['traceability-decisions'], paths: ['docs/Architecture/ADR/0001.md'] },
    { id: 'automation-ci', ...REPOSITORY_REPORT_COPY.evidence['automation-ci'], paths: ['.github/workflows/ci.yml'] },
  ];
  const derived = deriveRepositoryReportPresentation(evidenceCards, 'complete');
  const base: RepositoryReport = {
    schemaVersion: 'repository-report-v1', ruleVersion: 'repository-signals-v1',
    repo: 'example/public-repo', commitSha: 'a'.repeat(40),
    coverage: { status: 'complete', basis: 'selected_files', selectedFiles: 12, readFiles: 12, candidateFiles: 20, treeTruncated: false, selectionLimited: false, note: REPOSITORY_REPORT_COPY.coverageNotes.complete },
    score: { value: derived.value, label: '저장소 기반 AI 협업 준비도', explanation: REPOSITORY_REPORT_COPY.scoreExplanation, axes: {
      context: { label: REPOSITORY_REPORT_COPY.axisLabels.context, value: derived.axes.context },
      verification: { label: REPOSITORY_REPORT_COPY.axisLabels.verification, value: derived.axes.verification },
      traceability: { label: REPOSITORY_REPORT_COPY.axisLabels.traceability, value: derived.axes.traceability },
      automation: { label: REPOSITORY_REPORT_COPY.axisLabels.automation, value: derived.axes.automation },
    } },
    style: derived.style, evidenceCards, gaps: derived.gaps, nextChallenge: derived.nextChallenge,
  };
  return { ...base, ...overrides };
}

async function interceptReport(page: Page, payload = report(), delayMs = 0) {
  const bodies: unknown[] = [];
  await page.route('**/api/repository-report', async route => {
    bodies.push(route.request().postDataJSON());
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  return bodies;
}

test('홈은 자연스러운 한국어로 분석 범위와 네 가지 신호를 설명한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI 협업을 뒷받침하는 신호를 찾습니다.');
  await expect(page.locator('.repo-animated-title .repo-title-line')).toHaveCount(2);
  await expect(page.locator('.repo-title-animation')).toHaveCount(0);
  await expect(page.locator('.landing-availability')).toHaveText('회원가입 불필요 · 공개 저장소만 분석 · AI 모델 호출 없음');
  await expect(page.locator('.repo-hero-card')).toContainText('검증 체계');
  await expect(page.locator('.repo-hero-card')).toContainText('기록·추적');
  await expect(page.locator('.site-footer')).toContainText('개인의 AI 활용 능력을 인증하는 서비스가 아닙니다.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('빈 내 리포트와 해석 가이드는 API를 호출하거나 결과를 꾸며내지 않는다', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '저장한 리포트가 없습니다.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '해석 가이드', exact: true }).click();
  await expect(page.getByRole('heading', { name: '선택한 리포트가 없습니다.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '신호별 점수를 모두 공개합니다.' })).toBeVisible();
  await expect(page.locator('.repo-score-table tbody')).toHaveCount(4);
  await expect(page.getByRole('region', { name: '네 축의 신호별 배점표' })).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.repo-score-table')).toContainText('프로젝트 안내7점');
  await expect(page.locator('.repo-score-table')).toContainText('테스트 코드21점');
  await expect(page.locator('.repo-score-table')).toContainText('의사결정 기록9점');
  await expect(page.locator('.repo-score-table')).toContainText('자동 검사15점');
  await expect(page.locator('.repo-axis-total')).toHaveText(['축 합계25점', '축 합계25점', '축 합계25점', '축 합계25점']);
  await expect(page.locator('.repo-style-rules > li')).toHaveCount(6);
  await expect(page.locator('.repo-style-rules').first()).toContainText('총점이 20점 미만');
  await expect(page.locator('.repo-style-rules').first()).toContainText('네 축이 모두 10점 이상');
  await expect(page.locator('.repo-tie-priority')).toContainText('맥락 → 검증 체계 → 기록·추적 → 자동화');
  await page.screenshot({ path: testInfo.outputPath('repository-guide.png'), fullPage: true });
  expect(requests).toEqual([]);
});

test('공개 저장소 URL 하나를 보내고 진행 상태와 근거가 있는 리포트를 표시한다', async ({ page }, testInfo) => {
  const bodies = await interceptReport(page, report(), 250);
  await page.goto('/evaluate');
  await expect(page.locator('input')).toHaveCount(1);
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('.repo-uplink-frame iframe[title="SYS.LINK uplink progress loader"]')).toBeVisible();
  await expect(page.locator('.repo-uplink-frame .uplink-loader[data-state="ready"]')).toBeVisible();
  await expect(page.frameLocator('.repo-uplink-frame iframe').locator('#stage')).toBeVisible();
  await expect(page.locator('.repo-progress')).toContainText('저장소의 협업 신호를 찾고 있습니다.');
  await expect(page.frameLocator('.repo-uplink-frame iframe').locator('#num')).toHaveText('100', { timeout: 12000 });
  await expect(page.locator('.notice[role="status"]')).toContainText(/분석이 완료되었습니다/, { timeout: 4000 });
  await expect(page.locator('.repo-score > strong')).toHaveText('63');
  await expect(page.locator('.repo-style')).toContainText('AI 협업 신호 레이더');
  await expect(page.locator('.repo-axis-card')).toHaveCount(4);
  await page.locator('.repo-axis-card').filter({ hasText: '프로젝트 안내' }).getByText('근거 파일 1개').first().click();
  await expect(page.locator('.repo-axis-card').filter({ hasText: '프로젝트 안내' })).toContainText('AGENTS.md');
  await expect(page.locator('.repo-report')).toContainText('후보 파일 20개 · 분석 파일 12개 · 12개 확인 완료');
  await expect(page.locator('.repo-report')).toContainText('변경 사항과 의사결정 과정을 보여주는 기록을 충분히 확인하지 못했습니다.');
  await expect(page.locator('.repo-report')).toContainText('의사결정 하나 기록하기');
  await expect(page.locator('.repo-boundary')).toContainText('개인의 AI 활용 능력을 인증하지 않습니다.');
  expect(bodies).toEqual([{ repo_url: 'https://github.com/example/public-repo' }]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('repository-report.png'), fullPage: true });
});

test('API 오류와 계약에 맞지 않는 응답을 점수 없이 명확히 표시한다', async ({ page }) => {
  await page.route('**/api/repository-report', async route => route.fulfill({ status: 404, json: { error: { code: 'repo_not_found_or_private', message: 'PRIVATE SERVER DETAIL' } } }));
  await page.goto('/evaluate');
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/missing');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('공개 저장소를 찾을 수 없어요. 비공개 저장소는 분석하지 않아요.');
  await expect(page.locator('main')).not.toContainText('PRIVATE SERVER DETAIL');
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
  await expect(page.locator('.repo-report')).toContainText('AI 협업 신호 레이더');
  await expect(page.locator('.repo-style-rules > li.is-active')).toHaveCount(1);
  await expect(page.locator('.repo-style-rules > li.is-active')).toContainText('AI 협업 신호 레이더');
  await expect(page.locator('.repo-current-style-note')).toContainText('총점 구간이 아니라 네 축의 분포');
  await page.getByRole('navigation').getByRole('link', { name: '내 리포트', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('heading', { name: '저장한 리포트가 없습니다.' })).toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
});

test('저장 목록은 최근 20개로 제한되고 전체 삭제와 손상 복구가 가능하다', async ({ page }) => {
  const reports = Array.from({ length: 20 }, (_, index) => report({ repo: `example/repo-${index}`, commitSha: index.toString(16).padStart(40, '0') }));
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

test('언어 쿠키를 첫 응답에 반영하고 영어 화면에서도 원본 리포트는 바꾸지 않는다', async ({ context, page }) => {
  await context.addCookies([{ name: 'myaiscore_locale', value: 'en', url: 'http://127.0.0.1:3100' }]);
  await interceptReport(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('MyAiScore — AI collaboration signals in public repositories');
  await expect(page.getByRole('heading', { level: 1, name: /Find AI collaboration traces/ })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No saved reports yet.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Guide', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No report selected.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Every signal and point value is visible.' })).toBeVisible();
  await expect(page.locator('.repo-score-table')).toContainText('Test traces21 points');
  await expect(page.locator('.repo-style-rules')).toContainText('Use this style when the total is below 20.');
  await expect(page.locator('.repo-tie-priority')).toContainText('Context → Verification basis → Traceability → Automation');
  await page.getByRole('navigation').getByRole('link', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Analyze a public repository' })).toBeVisible();
  await page.getByLabel('Public GitHub repository URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: 'Analyze repository' }).click();
  await expect(page.locator('.repo-style')).toContainText('Verification radar', { timeout: 12000 });
  await expect(page.locator('.repo-report')).toContainText('Decision records');
  await expect(page.locator('.repo-report')).toContainText('Connect one decision');
  await expect(page.locator('.repo-boundary')).toContainText('does not certify personal AI ability');
  await page.getByRole('button', { name: 'Save in this browser' }).click();
  const saved = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(saved[0].style.title).toBe(REPOSITORY_REPORT_COPY.styles.verification.title);
  expect(saved[0].evidenceCards[0].title).toBe(REPOSITORY_REPORT_COPY.evidence['context-readme'].title);

  await page.getByRole('button', { name: '한국어' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { name: '공개 저장소 분석' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page).toHaveTitle('MyAiScore — 공개 저장소의 AI 협업 신호');
});

test('영어 화면은 안정된 API 오류 코드를 번역한다', async ({ context, page }) => {
  await context.addCookies([{ name: 'myaiscore_locale', value: 'en', url: 'http://127.0.0.1:3100' }]);
  await page.route('**/api/repository-report', async route => route.fulfill({ status: 429, json: { error: { code: 'github_api_rate_limited', message: '내부 한국어 메시지' } } }));
  await page.goto('/evaluate');
  await page.getByLabel('Public GitHub repository URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: 'Analyze repository' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('The GitHub request limit was reached. Please try again later.');
  await expect(page.locator('main')).not.toContainText('내부 한국어 메시지');
  await page.getByRole('button', { name: '한국어' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('GitHub 요청 한도에 도달했어요. 잠시 뒤 다시 시도해 주세요.');
});

test('상속된 객체 키와 알 수 없는 API 오류 코드는 일반 오류로 안전하게 표시한다', async ({ page }) => {
  await page.route('**/api/repository-report', async route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"__proto__","message":"UNSAFE DETAIL"}}' }));
  await page.goto('/evaluate');
  await page.getByLabel('공개 GitHub 저장소 URL').fill('https://github.com/example/public-repo');
  await page.getByRole('button', { name: '저장소 분석하기' }).click();
  await expect(page.locator('main .notice[role="alert"]')).toContainText('서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  await expect(page.locator('main')).not.toContainText('UNSAFE DETAIL');
});
