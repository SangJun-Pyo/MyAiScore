import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type CohortEntry = {
  ecosystem: string;
  repo: string;
  commitSha: string;
  score: number;
  sizeBand: string;
  coverage: string;
};

type DemoScenario = {
  repo: string;
  commitSha: string;
  purpose: string;
  expected: Pick<CohortEntry, "ecosystem" | "score" | "sizeBand" | "coverage">;
};

const cohort = JSON.parse(readFileSync("docs/Assessment/Cohorts/repository-cohort-v1.json", "utf8")) as {
  version: string;
  entries: CohortEntry[];
};
const demo = JSON.parse(readFileSync("fixtures/demo/repository-scenarios.json", "utf8")) as {
  cohortVersion: string;
  repositories: DemoScenario[];
};

test("demo repositories stay pinned to diverse, verified cohort entries", () => {
  assert.equal(demo.cohortVersion, cohort.version);
  assert.equal(demo.repositories.length, 5);

  for (const scenario of demo.repositories) {
    const entry = cohort.entries.find(item => item.repo === scenario.repo && item.commitSha === scenario.commitSha);
    assert.ok(entry, `${scenario.repo}@${scenario.commitSha} must remain in the fixed cohort`);
    assert.deepEqual(scenario.expected, {
      ecosystem: entry.ecosystem,
      score: entry.score,
      sizeBand: entry.sizeBand,
      coverage: entry.coverage,
    });
  }

  assert.deepEqual(new Set(demo.repositories.map(item => item.expected.ecosystem)), new Set(["TypeScript", "Python", "Go", "Rust", "Java"]));
  assert.deepEqual(new Set(demo.repositories.map(item => item.expected.sizeBand)), new Set(["small", "medium", "large"]));
  assert.deepEqual(new Set(demo.repositories.map(item => item.expected.coverage)), new Set(["complete", "partial"]));
  const scores = demo.repositories.map(item => item.expected.score);
  assert.ok(Math.max(...scores) - Math.min(...scores) >= 50);
});
