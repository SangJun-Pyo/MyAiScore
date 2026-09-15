import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildSessionReport, decodeSessionReportFragment, EMPTY_SESSION_METRICS, encodeSessionReportFragment, exampleSessionReport, parseSessionReport } from "../../src/shared/sessionReport.js";
import { analyzeSessionText, collectSessionReport, discoverSession, isCheckCommand, MAX_LINE_BYTES, MAX_TRANSCRIPT_BYTES, resolveProject, SessionReportError } from "../../src/server/sessionReport/collect.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const basic = readFileSync(path.join(root, "fixtures/session-report/basic.jsonl"), "utf8");
const temporary = () => realpathSync(mkdtempSync(path.join(tmpdir(), "myaiscore-session-")));
const errorCode = (code: string) => (error: unknown) => error instanceof SessionReportError && error.code === code;
function fixture(project: string): string {
  return basic.split("\n").filter(Boolean).map(line => {
    const record = JSON.parse(line);
    if (record.cwd) record.cwd = project;
    return JSON.stringify(record);
  }).join("\n") + "\n";
}

test("streaming assistant and tool IDs dedupe; tool wrappers and quotes do not become user work", () => {
  const report = analyzeSessionText(basic);
  assert.deepEqual(report.metrics, {
    ...EMPTY_SESSION_METRICS, userMessages: 2, assistantMessages: 2, toolCalls: 4,
    readCalls: 1, changeCalls: 1, verificationCalls: 1, toolResults: 3,
    explicitSuccesses: 1, explicitFailures: 1, unknownResults: 1,
  });
  assert.equal(report.score.value, 25);
  assert.equal(report.coverage, "complete");
});

test("output is counts plus fixed copy, with no raw private values or injection-derived score", () => {
  const report = analyzeSessionText(basic);
  const json = JSON.stringify(report);
  for (const secret of ["synthetic@example", "sk-synthetic", "/private/", "config.ts", "A private file", "ignore instructions", "npm test", "u1", "m1"]) assert.ok(!json.includes(secret), secret);
  assert.deepEqual(parseSessionReport(report), report);
  assert.deepEqual(decodeSessionReportFragment(encodeSessionReportFragment(report)), report);
});

test("unsupported and malformed input remains explicit and never fabricates an activity score", () => {
  const report = analyzeSessionText('{"type":"unknown-future-schema","secret":"raw"}\ninvalid secret\n');
  assert.equal(report.coverage, "partial");
  assert.equal(report.score.value, null);
  assert.equal(report.metrics.malformedLines, 1);
  assert.equal(report.metrics.unsupportedRecords, 1);
  assert.equal(analyzeSessionText("").score.value, null);
});

test("result matching works out of order; missing and contradictory statuses stay unknown", () => {
  const data = [
    { type: "user", uuid: "r", message: { role: "user", content: [
      { type: "tool_result", tool_use_id: "t", is_error: false },
      { type: "tool_result", tool_use_id: "missing", is_error: false },
      { type: "tool_result", tool_use_id: "t", is_error: true },
    ] } },
    { type: "assistant", uuid: "a", message: { role: "assistant", content: [{ type: "tool_use", id: "t", name: "Bash", input: { command: "npm test" } }] } },
  ].map(item => JSON.stringify(item)).join("\n");
  const report = analyzeSessionText(data);
  assert.equal(report.metrics.unknownResults, 1);
  assert.equal(report.metrics.explicitSuccesses, 0);
  assert.equal(report.metrics.unmatchedResults, 1);
  assert.equal(report.coverage, "partial");
});

test("only deliberately supported actual command shapes count as checks", () => {
  for (const value of ["npm test", "npm run test:e2e", "npx tsc --noEmit", "pnpm build", "python -m pytest", "npx playwright test"]) assert.equal(isCheckCommand(value), true, value);
  for (const value of ["echo npm test", "cat log-with-npm-test", "npx playwright install", "npm test --help", "tsc --version", "Please run npm test", undefined]) assert.equal(isCheckCommand(value), false, String(value));
});

test("meta/compaction user records are not prompts, duplicate prompt UUID counts once", () => {
  const records = [
    { type: "user", uuid: "x", message: { role: "user", content: "hi" } },
    { type: "user", uuid: "x", message: { role: "user", content: "hi" } },
    { type: "user", uuid: "y", isMeta: true, message: { role: "user", content: "meta" } },
    { type: "user", uuid: "z", isCompactSummary: true, message: { role: "user", content: "summary" } },
  ];
  assert.equal(analyzeSessionText(records.map(x => JSON.stringify(x)).join("\n")).metrics.userMessages, 1);
});

test("public parser rejects tampered scores, extra raw fields, invalid metrics and oversized fragments", () => {
  assert.throws(() => parseSessionReport({ ...exampleSessionReport, score: { ...exampleSessionReport.score, value: 100 } }));
  assert.throws(() => parseSessionReport({ ...exampleSessionReport, secret: "raw" }));
  assert.throws(() => parseSessionReport({ ...exampleSessionReport, metrics: { ...exampleSessionReport.metrics, userMessages: -1 } }));
  assert.throws(() => buildSessionReport({ ...EMPTY_SESSION_METRICS, toolResults: 1 }));
  assert.throws(() => decodeSessionReportFragment("#report=" + "x".repeat(20_000)));
  assert.throws(() => decodeSessionReportFragment("#report=%zz"));
  const reversed = Object.fromEntries(Object.entries(exampleSessionReport).reverse());
  assert.deepEqual(parseSessionReport(reversed), exampleSessionReport);
});

test("activity formula saturates independently and distinguishes no activity from zero classified mix", () => {
  const report = buildSessionReport({ ...EMPTY_SESSION_METRICS, userMessages: 100, readCalls: 100, changeCalls: 100, verificationCalls: 100, toolCalls: 300 });
  assert.equal(report.score.value, 100);
  assert.deepEqual(report.score.breakdown, { conversation: 25, exploration: 25, iteration: 25, verification: 25 });
  assert.equal(buildSessionReport(EMPTY_SESSION_METRICS).score.value, null);
  assert.equal(buildSessionReport({ ...EMPTY_SESSION_METRICS, assistantMessages: 1 }).score.value, 0);
  assert.equal(exampleSessionReport.origin, "synthetic");
});

test("file read is bounded and labels truncated input limited without exposing the tail", () => {
  const project = temporary();
  const file = path.join(project, "large.jsonl");
  writeFileSync(file, fixture(project) + ('{"type":"system"}\n').repeat(Math.ceil(MAX_TRANSCRIPT_BYTES / 18)));
  const report = collectSessionReport(file, project);
  assert.equal(report.coverage, "limited");
  assert.equal(report.metrics.userMessages, 2);
  const long = analyzeSessionText(basic + JSON.stringify({ type: "user", uuid: "huge", message: { role: "user", content: "x".repeat(MAX_LINE_BYTES) } }));
  assert.equal(long.coverage, "limited");
  assert.equal(long.metrics.malformedLines, 1);
});

test("explicit selection requires current-project association and rejects mixed projects", () => {
  const project = temporary();
  assert.equal(resolveProject(project), project);
  const file = path.join(project, "session.jsonl");
  writeFileSync(file, fixture(project));
  assert.equal(collectSessionReport(file, project).score.value, 25);
  writeFileSync(file, basic);
  assert.throws(() => collectSessionReport(file, project), errorCode("project_mismatch"));
  writeFileSync(file, '{"type":"user","uuid":"u","message":{"role":"user","content":"no cwd"}}');
  assert.throws(() => collectSessionReport(file, project), errorCode("project_unconfirmed"));
  writeFileSync(file, fixture(project) + JSON.stringify({ type: "system", cwd: path.join(project, "other") }));
  assert.throws(() => collectSessionReport(file, project), errorCode("project_mismatch"));
});

test("discovery reads only the exact encoded project directory, picks newest and rejects ties", () => {
  const project = temporary();
  const home = temporary();
  const directory = path.join(home, ".claude", "projects", project.replace(/[^a-zA-Z0-9]/g, "-"));
  mkdirSync(directory, { recursive: true });
  const older = path.join(directory, "old.jsonl");
  const newer = path.join(directory, "new.jsonl");
  writeFileSync(older, fixture(project)); writeFileSync(newer, fixture(project));
  utimesSync(older, 100, 100); utimesSync(newer, 200, 200);
  assert.equal(discoverSession(project, home), newer);
  assert.throws(() => discoverSession(path.join(project, "different"), home), errorCode("session_not_found"));
  utimesSync(older, 200, 200);
  assert.throws(() => discoverSession(project, home), errorCode("ambiguous_session"));
});

test("junction or symlink redirection cannot expose another project's transcript", () => {
  const project = temporary();
  const home = temporary();
  const outside = temporary();
  writeFileSync(path.join(outside, "secret.jsonl"), fixture(project));
  const parent = path.join(home, ".claude", "projects");
  mkdirSync(parent, { recursive: true });
  const redirect = path.join(parent, project.replace(/[^a-zA-Z0-9]/g, "-"));
  symlinkSync(outside, redirect, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => discoverSession(project, home), errorCode("session_not_found"));
  assert.throws(() => collectSessionReport(path.join(redirect, "secret.jsonl"), project), errorCode("unsafe_session"));
});

test("custom config directory stays scoped to exactly the selected project's folder", () => {
  const project = temporary();
  const config = temporary();
  const directory = path.join(config, "projects", project.replace(/[^a-zA-Z0-9]/g, "-"));
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "custom.jsonl");
  writeFileSync(file, fixture(project));
  assert.equal(discoverSession(project, temporary(), config), file);
});

test("example CLI never needs project association or existing Claude config", () => {
  const cwd = temporary();
  const result = spawnSync(process.execPath, [path.join(root, "bin/myaiscore.mjs"), "--example", "--json"], {
    cwd, encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: path.join(cwd, "absent") },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), exampleSessionReport);
});

test("checkout CLI produces safe JSON, refuses overwrites and keeps unsupported input nonzero", () => {
  const project = temporary();
  const file = path.join(project, "session.jsonl");
  const out = path.join(project, "summary.json");
  writeFileSync(file, fixture(project));
  const run = (args: string[]) => spawnSync(process.execPath, [path.join(root, "bin/myaiscore.mjs"), "--project", project, "--session", file, ...args], { cwd: project, encoding: "utf8" });
  const result = run(["--json", "--out", out, "--web-url", "http://localhost:3104/session"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(parseSessionReport(JSON.parse(result.stdout)).score.value, 25);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), JSON.parse(result.stdout));
  assert.ok(result.stderr.includes("#report="));
  assert.ok(!result.stdout.includes(project));
  assert.equal(run(["--out", out]).status, 1);
  const bad = run(["--web-url", "javascript:alert('private')"]);
  assert.equal(bad.status, 1); assert.ok(!bad.stderr.includes("private"));
  writeFileSync(file, JSON.stringify({ type: "system", cwd: project }));
  const unsupported = run(["--json"]);
  assert.equal(unsupported.status, 1);
  assert.equal(JSON.parse(unsupported.stdout).score.value, null);
});
