import { test } from "node:test";
import assert from "node:assert/strict";
import { IngestionBudget } from "../../src/server/ingestion/budget.js";
import { INGESTION_LIMITS } from "../../src/shared/contracts/ingestion.js";

test("allows requests until the request cap, then blocks", () => {
  const budget = new IngestionBudget();
  for (let i = 0; i < INGESTION_LIMITS.maxHttpRequests; i += 1) {
    assert.equal(budget.canMakeRequest(), true, `request ${i} should be allowed`);
    budget.recordRequest();
  }
  assert.equal(budget.canMakeRequest(), false);
});

test("allows bytes until the total content cap, then blocks", () => {
  const budget = new IngestionBudget();
  assert.equal(budget.canAddBytes(INGESTION_LIMITS.maxTotalContentBytes), true);
  budget.recordBytes(INGESTION_LIMITS.maxTotalContentBytes);
  assert.equal(budget.canAddBytes(1), false);
});

test("reports time exceeded once the injected clock passes the duration cap", () => {
  let now = 0;
  const budget = new IngestionBudget(() => now);
  assert.equal(budget.timeExceeded(), false);
  now = INGESTION_LIMITS.maxDurationMs + 1;
  assert.equal(budget.timeExceeded(), true);
  assert.equal(budget.canMakeRequest(), false);
});
