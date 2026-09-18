import assert from "node:assert/strict";
import test from "node:test";
import { buildRepositoryGuide } from "../../src/i18n/repositoryGuide.js";
import { messagesFor } from "../../src/i18n/messages.js";
import {
  REPOSITORY_STYLE_ORDER,
  classifyRepositoryReportStyle,
  type RepositoryReportAxis,
} from "../../src/shared/repositoryReport.js";

const axes = (context: number, verification: number, traceability: number, automation: number): Record<RepositoryReportAxis, number> => ({ context, verification, traceability, automation });

test("repository guide derives every signal point and 25-point axis total from canonical IDs", () => {
  const guide = buildRepositoryGuide("ko", messagesFor("ko"));
  assert.deepEqual(guide.axes.map(axis => ({ id: axis.id, total: axis.total, signals: axis.signals.map(signal => [signal.id, signal.points]) })), [
    { id: "context", total: 25, signals: [["context-readme", 7], ["context-guidance", 7], ["context-docs", 6], ["context-metadata", 5]] },
    { id: "verification", total: 25, signals: [["verification-tests", 21], ["verification-config", 4]] },
    { id: "traceability", total: 25, signals: [["traceability-changelog", 8], ["traceability-decisions", 9], ["traceability-templates", 5], ["traceability-migrations", 3]] },
    { id: "automation", total: 25, signals: [["automation-ci", 15], ["automation-dependencies", 4], ["automation-delivery", 3], ["automation-scripts", 3]] },
  ]);
  assert.equal(guide.axes[0]?.signals[0]?.title, "시작 안내");
  assert.equal(buildRepositoryGuide("en", messagesFor("en")).axes[0]?.signals[0]?.title, "Getting started");
});

test("style classification keeps the documented first-match order and dominant-axis tie priority", () => {
  assert.equal(classifyRepositoryReportStyle(axes(5, 5, 5, 4)), "first-signals");
  assert.equal(classifyRepositoryReportStyle(axes(5, 5, 5, 5)), "context-cartographer");
  assert.equal(classifyRepositoryReportStyle(axes(10, 10, 10, 10)), "balanced-builder");
  assert.equal(classifyRepositoryReportStyle(axes(10, 11, 15, 16)), "balanced-builder");
  assert.equal(classifyRepositoryReportStyle(axes(10, 10, 10, 17)), "automation-tamer");
  assert.equal(classifyRepositoryReportStyle(axes(9, 10, 10, 10)), "verification-radar");
  assert.equal(classifyRepositoryReportStyle(axes(25, 0, 0, 0)), "context-cartographer");
  assert.equal(classifyRepositoryReportStyle(axes(0, 25, 0, 0)), "verification-radar");
  assert.equal(classifyRepositoryReportStyle(axes(0, 0, 25, 0)), "trace-collector");
  assert.equal(classifyRepositoryReportStyle(axes(0, 0, 0, 25)), "automation-tamer");
  assert.equal(classifyRepositoryReportStyle(axes(20, 20, 0, 0)), "context-cartographer");
  assert.equal(classifyRepositoryReportStyle(axes(0, 20, 20, 0)), "verification-radar");
  assert.equal(classifyRepositoryReportStyle(axes(0, 0, 20, 20)), "trace-collector");
});

test("guide lists all styles in canonical order and marks only the selected report style", () => {
  const guide = buildRepositoryGuide("en", messagesFor("en"), "verification-radar");
  assert.deepEqual(guide.styles.map(style => style.id), REPOSITORY_STYLE_ORDER);
  assert.deepEqual(guide.styles.map(style => style.title), ["First-signal explorer", "Balanced builder", "Context cartographer", "Verification radar", "Trace collector", "Automation tamer"]);
  assert.deepEqual(buildRepositoryGuide("ko", messagesFor("ko")).styles.map(style => style.title), ["첫 신호 탐험가", "균형 잡힌 빌더", "맥락 지도 제작자", "검증 레이더", "기록 수집가", "자동화 조련사"]);
  assert.deepEqual(guide.styles.filter(style => style.active).map(style => style.id), ["verification-radar"]);
  assert.match(guide.styles[0]!.rule, /below 20/);
  assert.match(guide.styles[1]!.rule, /at least 10.*6 or less/);
  assert.equal(guide.tiePriority, "Highest-axis tie priority: Context → Verification basis → Traceability → Automation.");
});
