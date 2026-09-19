#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateRepositoryReport } from "../src/server/repositoryReport/service.js";

type Seed = { ecosystem: string; starBand: string; repo: string };
type Seeds = {
  version: "repository-cohort-v1";
  selectedAt: string;
  selection: Record<string, unknown>;
  repositories: Seed[];
};

type Entry = Seed & {
  commitSha: string;
  score: number;
  axes: Record<string, number>;
  candidateFiles: number | null;
  coverage: "complete" | "partial";
  provisionalReasons: string[];
  sizeBand: "small" | "medium" | "large";
};

let manifestWriteSequence = 0;

function parseArgs(argv: string[]) {
  let seeds = "docs/Assessment/Cohorts/repository-cohort-v1-seeds.json";
  let output = "docs/Assessment/Cohorts/repository-cohort-v1.json";
  let refresh = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--seeds") seeds = argv[++index] ?? seeds;
    else if (argv[index] === "--output") output = argv[++index] ?? output;
    else if (argv[index] === "--refresh") refresh = true;
  }
  return { seeds: resolve(seeds), output: resolve(output), refresh };
}

function sizeBand(candidateFiles: number | null): Entry["sizeBand"] {
  if (candidateFiles === null) return "large";
  if (candidateFiles < 100) return "small";
  if (candidateFiles < 500) return "medium";
  return "large";
}

function validateSeeds(value: Seeds) {
  if (value.version !== "repository-cohort-v1" || value.repositories.length !== 50) throw new Error("Expected exactly 50 v1 cohort seeds.");
  if (new Set(value.repositories.map(item => item.repo.toLowerCase())).size !== 50) throw new Error("Cohort repositories must be unique.");
  for (const ecosystem of ["TypeScript", "Python", "Go", "Rust", "Java"]) {
    if (value.repositories.filter(item => item.ecosystem === ecosystem).length !== 10) throw new Error(`Expected 10 ${ecosystem} seeds.`);
  }
}

async function writeManifest(path: string, seeds: Seeds, entries: Entry[], failures: Array<Seed & { error: string }>) {
  const ordered = seeds.repositories.flatMap(seed => entries.filter(entry => entry.repo === seed.repo));
  const body = {
    version: seeds.version,
    ruleVersion: "repository-signals-v2.6",
    selectedAt: seeds.selectedAt,
    collectedAt: new Date().toISOString().slice(0, 10),
    selection: seeds.selection,
    sampleSize: ordered.length,
    distributions: {
      ecosystems: Object.fromEntries(["TypeScript", "Python", "Go", "Rust", "Java"].map(key => [key, ordered.filter(item => item.ecosystem === key).length])),
      sizeBands: Object.fromEntries(["small", "medium", "large"].map(key => [key, ordered.filter(item => item.sizeBand === key).length])),
      coverage: Object.fromEntries(["complete", "partial"].map(key => [key, ordered.filter(item => item.coverage === key).length])),
    },
    entries: ordered,
    failures,
  };
  const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const temp = `${path}.${process.pid}.${manifestWriteSequence++}.tmp`;
  await writeFile(temp, `${JSON.stringify({ ...body, digest }, null, 2)}\n`, "utf8");
  await rename(temp, path);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN is required to build the 50-repository cohort.");
  const seeds = JSON.parse(await readFile(args.seeds, "utf8")) as Seeds;
  validateSeeds(seeds);

  let entries: Entry[] = [];
  try {
    const previous = JSON.parse(await readFile(args.output, "utf8")) as { entries?: Entry[] };
    entries = previous.entries ?? [];
  } catch {
    // A missing or incomplete output starts a fresh resumable collection.
  }
  const failures: Array<Seed & { error: string }> = [];
  let cursor = 0;
  const workers = Array.from({ length: 2 }, async () => {
    while (cursor < seeds.repositories.length) {
      const seed = seeds.repositories[cursor++]!;
      const prior = entries.find(item => item.repo === seed.repo);
      if (prior && !args.refresh) continue;
      try {
        process.stderr.write(`[cohort] ${seed.repo}\n`);
        const report = await generateRepositoryReport(
          { repoUrl: `https://github.com/${seed.repo}`, commitRef: prior?.commitSha },
          { authToken: token },
        );
        // v2.7 only adds the cohort comparison; its score calculation is byte-for-byte v2.6 compatible.
        if (report.schemaVersion !== "repository-report-v2" || !["repository-signals-v2.6", "repository-signals-v2.7"].includes(report.ruleVersion)) {
          throw new Error(`unexpected_report_contract:${report.ruleVersion}`);
        }
        const entry: Entry = {
          ...seed,
          commitSha: report.commitSha,
          score: report.score.value,
          axes: Object.fromEntries(Object.entries(report.score.axes).map(([axis, item]) => [axis, item.value])),
          candidateFiles: report.coverage.candidateFiles,
          coverage: report.coverage.status,
          provisionalReasons: report.diagnostics.reasons,
          sizeBand: sizeBand(report.coverage.candidateFiles),
        };
        entries = [...entries.filter(item => item.repo !== seed.repo), entry];
      } catch (error) {
        failures.push({ ...seed, error: error instanceof Error ? error.message.slice(0, 120) : "unknown_error" });
      }
      await writeManifest(args.output, seeds, entries, failures);
    }
  });
  await Promise.all(workers);
  await writeManifest(args.output, seeds, entries, failures);
  if (entries.length !== 50 || failures.length > 0) throw new Error(`Cohort incomplete: ${entries.length}/50 entries, ${failures.length} failures.`);
}

main().catch(error => {
  process.stderr.write(`[cohort] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
