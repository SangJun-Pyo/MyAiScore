/**
 * Phase 2: this function moved to src/server/ingestion/localRepoFixtureBuilder.ts
 * so scripts/evaluateOffline.ts (production code) can reuse it without
 * importing from tests/. Re-exported here so existing test imports of
 * "./localRepoToFixtures.js" keep working unchanged.
 */
export { buildFixturesFromLocalRepo } from "../../src/server/ingestion/localRepoFixtureBuilder.js";
