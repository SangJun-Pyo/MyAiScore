import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { deriveRepositoryCohortComparison, repositoryCohortSizeBand } from "../../src/shared/repositoryCohort.js";

const MANIFEST_PATH = new URL("../../docs/Assessment/Cohorts/repository-cohort-v1.json", import.meta.url);

test("reference cohort has 50 unique fixed-SHA repositories and a valid content digest", async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown> & {
    digest: string;
    sampleSize: number;
    entries: Array<{ repo: string; commitSha: string; ecosystem: string; score: number }>;
    failures: unknown[];
  };
  const { digest, ...body } = manifest;
  assert.equal(createHash("sha256").update(JSON.stringify(body)).digest("hex"), digest);
  assert.equal(manifest.sampleSize, 50);
  assert.equal(manifest.entries.length, 50);
  assert.equal(manifest.failures.length, 0);
  assert.equal(new Set(manifest.entries.map(entry => entry.repo.toLowerCase())).size, 50);
  assert.ok(manifest.entries.every(entry => /^[a-f0-9]{40}$/.test(entry.commitSha) && Number.isInteger(entry.score)));
  for (const ecosystem of ["TypeScript", "Python", "Go", "Rust", "Java"]) {
    assert.equal(manifest.entries.filter(entry => entry.ecosystem === ecosystem).length, 10);
  }
});

test("cohort comparison uses matching size and coverage groups with coarse percentage bands", () => {
  assert.equal(repositoryCohortSizeBand(99), "small");
  assert.equal(repositoryCohortSizeBand(100), "medium");
  assert.equal(repositoryCohortSizeBand(500), "large");
  assert.equal(repositoryCohortSizeBand(null), "large");

  const complete = deriveRepositoryCohortComparison(50, { candidateFiles: 120, status: "complete" });
  assert.ok(complete);
  assert.equal(complete.sizeBand, "medium");
  assert.equal(complete.coverageStatus, "complete");
  assert.ok(complete.comparisonSampleSize >= 5);
  assert.equal(complete.topPercentFrom % 10, 0);
  assert.equal(complete.topPercentTo % 10, 0);

  assert.equal(deriveRepositoryCohortComparison(50, { candidateFiles: 120, status: "partial" }), null);
});
