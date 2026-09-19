import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
}

test("공개 네 화면은 심각한 WCAG 위반 없이 핵심 랜드마크를 제공한다", async ({ page }) => {
  for (const route of ["/", "/evaluate", "/profile", "/insights"]) {
    await page.goto(route);
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectNoSeriousAccessibilityViolations(page);
  }
});

test("키보드 사용자는 건너뛰기 링크로 본문에 도달하고 분석 폼을 제출할 수 있다", async ({ page }) => {
  await page.goto("/evaluate");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "본문으로 건너뛰기" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();

  await page.getByLabel("공개 GitHub 저장소 URL").focus();
  await page.keyboard.type("https://github.com/example/public-repo");
  await expect(page.getByRole("button", { name: "저장소 분석하기" })).toBeEnabled();
});

test("동작 감소 환경과 작은 화면에서도 장식 효과 없이 핵심 콘텐츠를 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const titleMotion = await page.locator(".repo-title-line").first().evaluate(element => {
    const style = getComputedStyle(element);
    return { animationName: style.animationName, opacity: style.opacity, transform: style.transform };
  });
  expect(titleMotion).toEqual({ animationName: "none", opacity: "1", transform: "none" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto("/insights");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("region", { name: "네 축의 신호별 배점표" })).toBeVisible();
});
