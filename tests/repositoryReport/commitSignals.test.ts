import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCommitTraceability } from "../../src/server/repositoryReport/commitSignals.js";

const SHA = "a".repeat(40);

test("commit traceability excludes merge/automation and returns aggregates without raw messages", () => {
  const result = analyzeCommitTraceability([
    { sha: SHA, message: "fix(api): reject invalid origin\n\nCloses #31 after reproducing the proxy mismatch." },
    { sha: SHA, message: "update" },
    { sha: SHA, message: "docs: explain repository score" },
    { sha: SHA, message: "Merge pull request #20 from acme/topic" },
    { sha: SHA, message: "chore(deps): bump react" },
  ]);
  assert.equal(result.sampledCommits, 5);
  assert.equal(result.evaluatedCommits, 3);
  assert.equal(result.excludedMergeOrAutomated, 2);
  assert.equal(result.nonGenericSubjectRatio, 2 / 3);
  assert.equal(result.distinctSubjectRatio, 1);
  assert.equal(result.scopedSubjectRatio, 2 / 3);
  assert.equal(result.rationaleBodyRatio, 1 / 3);
  assert.equal(result.referenceRatio, 1 / 3);
  assert.doesNotMatch(JSON.stringify(result), /reject invalid origin|repository score/);
});

test("commit traceability keeps unsupported or empty evidence unknown instead of zero", () => {
  const result = analyzeCommitTraceability([
    { sha: SHA, message: "Merge branch 'main'" },
    { sha: SHA, message: "dependabot: update lockfile" },
  ]);
  assert.equal(result.evaluatedCommits, 0);
  assert.equal(result.nonGenericSubjectRatio, null);
  assert.equal(result.distinctSubjectRatio, null);
  assert.equal(result.rationaleBodyRatio, null);
});
