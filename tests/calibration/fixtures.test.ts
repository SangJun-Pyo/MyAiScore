import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExpectedOutcome, ProvenanceRecord, CriterionCode } from "../../src/shared/contracts/calibration.js";
import { ingestRepository } from "../../src/server/ingestion/ingest.js";
import { OfflineHttpClient } from "../../src/server/ingestion/offlineHttpClient.js";
import { buildFixturesFromLocalRepo } from "./localRepoToFixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = join(__dirname, "..", "..", "fixtures", "calibration", "cases");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function resolveRepoPath(fixtureDir: string, repoRefFile: string): string {
  const ref = loadJson<{ repoPath: string }>(join(fixtureDir, repoRefFile));
  return join(fixtureDir, ref.repoPath);
}

const VALID_CRITERION_CODES: CriterionCode[] = ["A", "B", "C", "D", "E"];
const VALID_STATUSES = ["observed", "not_observed", "insufficient_evidence"];
const VALID_SCORE_STATUSES = ["issued", "withheld", "not_determinable_without_model"];
const VALID_EVIDENCE_CHANGE_TYPES = ["added", "removed", "modified", "unchanged"];
const VALID_BEHAVIOR_CHANGE_TYPES = ["supported_improvement", "supported_regression", "supported_change", "not_established"];

interface FixtureCase {
  id: string;
  dir: string;
  /** repo directories this fixture's requiredEvidenceRefs may resolve against, tried in order. */
  repoDirs: string[];
  /** extra directories (e.g. excerpts) requiredEvidenceRefs may also resolve against, relative to `dir`. */
  extraDirs?: string[];
}

const CASE_02_DIR = join(CASES_ROOT, "case-02-simple-tool-strong-verification");
const CASE_04_ROOT = join(CASES_ROOT, "case-04-same-code-different-process");
const CASE_08_ROOT = join(CASES_ROOT, "case-08-before-after");

function repoDirFor(dir: string, file = "repo_ref.json"): string {
  return resolveRepoPath(dir, file);
}

const FIXTURE_CASES: FixtureCase[] = [
  {
    id: "case-01-tools-rich-no-verification",
    dir: join(CASES_ROOT, "case-01-tools-rich-no-verification"),
    repoDirs: [repoDirFor(join(CASES_ROOT, "case-01-tools-rich-no-verification"))],
  },
  {
    id: "case-02-simple-tool-strong-verification",
    dir: CASE_02_DIR,
    repoDirs: [repoDirFor(CASE_02_DIR)],
  },
  {
    id: "case-03-good-code-no-process",
    dir: join(CASES_ROOT, "case-03-good-code-no-process"),
    repoDirs: [repoDirFor(join(CASES_ROOT, "case-03-good-code-no-process"))],
  },
  {
    // Phase 2: split from a single case-level expected.json into per-variant
    // files (ASTRA_PHASE1_REVIEW.md section 2 -- each variant is judged
    // independently, so each needs its own expected/provenance, the same
    // pattern case-08's subvariants already use). Both variants defer to the
    // case-level repo_ref.json since they share the exact same code.
    id: "case-04-same-code-different-process/variant-a",
    dir: join(CASE_04_ROOT, "variant-a"),
    repoDirs: [repoDirFor(CASE_04_ROOT)],
  },
  {
    id: "case-04-same-code-different-process/variant-b",
    dir: join(CASE_04_ROOT, "variant-b"),
    repoDirs: [repoDirFor(CASE_04_ROOT)],
  },
  {
    id: "case-05-conflicting-evidence",
    dir: join(CASES_ROOT, "case-05-conflicting-evidence"),
    repoDirs: [repoDirFor(join(CASES_ROOT, "case-05-conflicting-evidence"))],
    extraDirs: ["."], // excerpts/... referenced relative to the case dir itself
  },
  {
    id: "case-06-prompt-injection",
    dir: join(CASES_ROOT, "case-06-prompt-injection"),
    repoDirs: [repoDirFor(join(CASES_ROOT, "case-06-prompt-injection"), "repo_ref_before.json")],
  },
  {
    id: "case-07-repeat-fixed-input",
    dir: join(CASES_ROOT, "case-07-repeat-fixed-input"),
    repoDirs: [repoDirFor(join(CASES_ROOT, "case-07-repeat-fixed-input"))],
  },
  {
    id: "case-08-before-after/subvariant-a-late-log",
    dir: join(CASE_08_ROOT, "subvariant-a-late-log"),
    repoDirs: [
      repoDirFor(join(CASE_08_ROOT, "subvariant-a-late-log", "before")),
      repoDirFor(join(CASE_08_ROOT, "subvariant-a-late-log", "after")),
    ],
  },
  {
    id: "case-08-before-after/subvariant-b-real-improvement",
    dir: join(CASE_08_ROOT, "subvariant-b-real-improvement"),
    repoDirs: [
      repoDirFor(join(CASE_08_ROOT, "subvariant-b-real-improvement", "before")),
      repoDirFor(join(CASE_08_ROOT, "subvariant-b-real-improvement", "after")),
    ],
    extraDirs: ["after"],
  },
  {
    id: "case-08-before-after/subvariant-c-files-only",
    dir: join(CASE_08_ROOT, "subvariant-c-files-only"),
    repoDirs: [
      repoDirFor(join(CASE_08_ROOT, "subvariant-c-files-only", "before")),
      repoDirFor(join(CASE_08_ROOT, "subvariant-c-files-only", "after")),
    ],
  },
];

const ALL_FIXTURE_IDS = new Set(FIXTURE_CASES.map((c) => c.id));

function assertValidExpected(expected: ExpectedOutcome, fixtureId: string): void {
  assert.equal(expected.fixtureId, fixtureId, `expected.json fixtureId must match its directory (${fixtureId})`);
  assert.ok(expected.calibrationCaseIndex >= 1 && expected.calibrationCaseIndex <= 8, "calibrationCaseIndex must be 1..8");
  assert.ok(expected.description.length > 0, "description must not be empty");
  assert.ok(VALID_SCORE_STATUSES.includes(expected.expectedMyAiScoreStatus), `invalid expectedMyAiScoreStatus: ${expected.expectedMyAiScoreStatus}`);
  assert.ok(expected.notes.length > 0, "notes must not be empty");

  const seenCodes = new Set<string>();
  for (const criterion of expected.criteria) {
    assert.ok(VALID_CRITERION_CODES.includes(criterion.criterionCode), `invalid criterionCode: ${criterion.criterionCode}`);
    assert.equal(seenCodes.has(criterion.criterionCode), false, `duplicate criterionCode ${criterion.criterionCode} in ${fixtureId}`);
    seenCodes.add(criterion.criterionCode);
    assert.ok(VALID_STATUSES.includes(criterion.expectedStatus), `invalid expectedStatus: ${criterion.expectedStatus}`);
    if (criterion.expectedStatus === "observed" && criterion.expectedLevelRange) {
      const [lo, hi] = criterion.expectedLevelRange;
      assert.ok(lo >= 1 && lo <= 4 && hi >= 1 && hi <= 4 && lo <= hi, `invalid expectedLevelRange for ${fixtureId}/${criterion.criterionCode}`);
    }
    assert.ok(criterion.rationale.length > 0, `rationale must not be empty (${fixtureId}/${criterion.criterionCode})`);
    assert.ok(criterion.failureCondition.length > 0, `failureCondition must not be empty (${fixtureId}/${criterion.criterionCode})`);
  }

  if (expected.expectedMyAiScoreStatus === "withheld") {
    assert.ok(expected.expectedWithheldReasons && expected.expectedWithheldReasons.length > 0, `withheld fixtures must state a reason (${fixtureId})`);
  }

  for (const comparison of expected.expectedComparisons ?? []) {
    assert.ok(VALID_CRITERION_CODES.includes(comparison.criterionCode), `invalid comparison criterionCode in ${fixtureId}`);
    assert.ok(VALID_STATUSES.includes(comparison.previousStatus), `invalid comparison previousStatus in ${fixtureId}`);
    assert.ok(comparison.currentStatusOptions.length > 0, `comparison currentStatusOptions must not be empty (${fixtureId})`);
    for (const status of comparison.currentStatusOptions) {
      assert.ok(VALID_STATUSES.includes(status), `invalid comparison currentStatusOptions entry in ${fixtureId}: ${status}`);
    }
    assert.ok(VALID_EVIDENCE_CHANGE_TYPES.includes(comparison.expectedEvidenceChange), `invalid expectedEvidenceChange in ${fixtureId}`);
    assert.ok(VALID_BEHAVIOR_CHANGE_TYPES.includes(comparison.expectedBehaviorChange), `invalid expectedBehaviorChange in ${fixtureId}`);
    assert.ok(comparison.rationale.length > 0, `comparison rationale must not be empty (${fixtureId})`);
  }
}

function assertValidProvenance(provenance: ProvenanceRecord, fixtureId: string): void {
  assert.equal(provenance.fixtureId, fixtureId);
  assert.equal(provenance.synthetic, true, `every Phase 1 fixture must be marked synthetic (${fixtureId})`);
  assert.equal(provenance.executedAt, null, `no fixture has actually been run by a model yet -- executedAt must be null (${fixtureId})`);
  assert.equal(provenance.humanReviewed, false, `no fixture has an independent human review yet (${fixtureId})`);
  assert.ok(provenance.humanReviewNote.length > 0);
  assert.ok(!Number.isNaN(Date.parse(provenance.createdAt)), `createdAt must be a valid ISO date (${fixtureId})`);
}

for (const fixtureCase of FIXTURE_CASES) {
  test(`fixture structure: ${fixtureCase.id}`, () => {
    const expectedPath = join(fixtureCase.dir, "expected.json");
    const provenancePath = join(fixtureCase.dir, "provenance.json");
    assert.ok(existsSync(expectedPath), `missing expected.json for ${fixtureCase.id}`);
    assert.ok(existsSync(provenancePath), `missing provenance.json for ${fixtureCase.id}`);

    const expected = loadJson<ExpectedOutcome>(expectedPath);
    const provenance = loadJson<ProvenanceRecord>(provenancePath);
    assertValidExpected(expected, fixtureCase.id);
    assertValidProvenance(provenance, fixtureCase.id);

    for (const repoDir of fixtureCase.repoDirs) {
      assert.ok(existsSync(repoDir), `referenced repo dir does not exist: ${repoDir} (${fixtureCase.id})`);
    }

    const searchDirs = [...fixtureCase.repoDirs, ...(fixtureCase.extraDirs ?? []).map((d) => join(fixtureCase.dir, d))];
    for (const criterion of expected.criteria) {
      for (const ref of criterion.requiredEvidenceRefs) {
        const found = searchDirs.some((base) => existsSync(join(base, ref)));
        assert.ok(found, `requiredEvidenceRef "${ref}" (criterion ${criterion.criterionCode}) does not exist under any known dir for ${fixtureCase.id}: ${searchDirs.join(", ")}`);
      }
    }

    for (const relatedId of expected.relatedFixtureIds ?? []) {
      assert.ok(ALL_FIXTURE_IDS.has(relatedId), `relatedFixtureId "${relatedId}" referenced by ${fixtureCase.id} does not exist`);
    }
  });
}

test("case-03 intentionally has no collaboration_case.json (no-process-material state)", () => {
  const dir = join(CASES_ROOT, "case-03-good-code-no-process");
  assert.equal(existsSync(join(dir, "collaboration_case.json")), false);
});

test("case-04 variants share the exact same repo but carry different collaboration cases", () => {
  const dir = join(CASES_ROOT, "case-04-same-code-different-process");
  // variant-a and variant-b don't have their own repo_ref.json -- they both defer to the case-level one.
  assert.ok(existsSync(join(dir, "repo_ref.json")));
  const caseA = loadJson<{ user_action: string }>(join(dir, "variant-a", "collaboration_case.json"));
  const caseB = loadJson<{ user_action: string }>(join(dir, "variant-b", "collaboration_case.json"));
  assert.notEqual(JSON.stringify(caseA), JSON.stringify(caseB));
});

test("case-06 before/after repos are identical except for README.md (the injected instruction)", () => {
  const dir = join(CASES_ROOT, "case-06-prompt-injection");
  const beforeRepo = repoDirFor(dir, "repo_ref_before.json");
  const overlay = loadJson<{ baseRepoPath: string; overlayFiles: Record<string, string> }>(join(dir, "repo_ref_after.json"));
  assert.equal(join(dir, overlay.baseRepoPath), beforeRepo);
  const afterReadme = readFileSync(join(dir, overlay.overlayFiles["README.md"]!), "utf8");
  assert.ok(afterReadme.includes("SYSTEM OVERRIDE"), "the injected instruction text must actually be present in the overlay file");
  const beforeReadme = readFileSync(join(beforeRepo, "README.md"), "utf8");
  assert.notEqual(afterReadme, beforeReadme);
  // and it must never be executed by anything in this codebase -- there is
  // no eval/exec of file content anywhere in src/server/ingestion. This test
  // documents that fact; it does not prove an LLM evaluator would resist it.
});

test("case-08 subvariant a: before and after repo code is byte-identical (only the submitted narrative differs)", () => {
  const before = repoDirFor(join(CASE_08_ROOT, "subvariant-a-late-log", "before"));
  const after = repoDirFor(join(CASE_08_ROOT, "subvariant-a-late-log", "after"));
  const beforeCode = readFileSync(join(before, "src", "lib", "validateOrderTotal.ts"), "utf8");
  const afterCode = readFileSync(join(after, "src", "lib", "validateOrderTotal.ts"), "utf8");
  assert.equal(beforeCode, afterCode);
});

test("case-08 subvariant b: after repo actually fixes the negative-total bug present in before", () => {
  const before = repoDirFor(join(CASE_08_ROOT, "subvariant-b-real-improvement", "before"));
  const after = repoDirFor(join(CASE_08_ROOT, "subvariant-b-real-improvement", "after"));
  const beforeCode = readFileSync(join(before, "src", "lib", "validateOrderTotal.ts"), "utf8");
  const afterCode = readFileSync(join(after, "src", "lib", "validateOrderTotal.ts"), "utf8");
  assert.ok(!beforeCode.includes("clientTotalCents < 0"), "before must still have the bug (no negative-total guard)");
  assert.ok(afterCode.includes("clientTotalCents < 0"), "after must contain the fix");
});

test("case-08 subvariant c: after repo's new test file never imports the function it claims to test", () => {
  const after = repoDirFor(join(CASE_08_ROOT, "subvariant-c-files-only", "after"));
  const trivialTest = readFileSync(join(after, "src", "lib", "validateOrderTotal.trivial.test.ts"), "utf8");
  assert.ok(
    !trivialTest.includes("from \"./validateOrderTotal") && !trivialTest.includes("validateOrderTotal("),
    "this test file must not actually import or call validateOrderTotal",
  );
  const code = readFileSync(join(after, "src", "lib", "validateOrderTotal.ts"), "utf8");
  assert.ok(!code.includes("clientTotalCents < 0"), "the underlying bug must still be present -- only a file was added, not a fix");
});

// --- Task 0 x Task 1 integration: run the real ingestion pipeline against a calibration fixture ---
test("case-02's repo can be ingested end-to-end (offline) and its evidence matches expected.json's required refs", async () => {
  const repoDir = repoDirFor(CASE_02_DIR);
  const expected = loadJson<ExpectedOutcome>(join(CASE_02_DIR, "expected.json"));

  const fixtures = buildFixturesFromLocalRepo(repoDir, { owner: "fixture", repo: "case02", commitSha: "b".repeat(40) });
  const snapshot = await ingestRepository({ repoUrl: "https://github.com/fixture/case02" }, { httpClient: new OfflineHttpClient(fixtures) });

  assert.equal(snapshot.ingestionStatus, "complete");
  assert.equal(snapshot.supportStatus, "nextjs_typescript");
  assert.ok(snapshot.staticSignals.testPaths.includes("src/lib/validateOrderTotal.test.ts"));

  const collectedPaths = new Set(snapshot.evidenceCandidates.map((e) => e.path));
  const allRequiredRefs = expected.criteria.flatMap((c) => c.requiredEvidenceRefs);
  for (const ref of allRequiredRefs) {
    assert.ok(collectedPaths.has(ref), `Task 1 ingestion did not produce an evidence candidate for a path Task 0's expected.json requires: ${ref}`);
  }
});
