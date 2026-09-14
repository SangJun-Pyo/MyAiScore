/**
 * One-off helper (Phase 1 artifact generation only, not part of the CLI
 * contract): runs the real offline ingestion pipeline against the
 * case-02 calibration fixture and writes the resulting IngestionSnapshot to
 * artifacts/phase1/, as evidence that Task 0 and Task 1 are wired together.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestRepository } from "../src/server/ingestion/ingest.js";
import { OfflineHttpClient } from "../src/server/ingestion/offlineHttpClient.js";
import { buildFixturesFromLocalRepo } from "../tests/calibration/localRepoToFixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoDir = join(__dirname, "..", "fixtures", "calibration", "shared", "repos", "simple-tool-verified");

const fixtures = buildFixturesFromLocalRepo(repoDir, { owner: "fixture", repo: "case02", commitSha: "b".repeat(40) });
const snapshot = await ingestRepository(
  { repoUrl: "https://github.com/fixture/case02" },
  { httpClient: new OfflineHttpClient(fixtures), onProgress: (m) => process.stderr.write(`[dump] ${m}\n`) },
);

const outPath = join(__dirname, "..", "artifacts", "phase1", "case-02-offline-ingestion-snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
process.stderr.write(`wrote ${outPath}\n`);
