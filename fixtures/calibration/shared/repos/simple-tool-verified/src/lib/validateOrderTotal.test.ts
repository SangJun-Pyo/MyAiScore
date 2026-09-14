import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderTotal } from "./validateOrderTotal.js";

test("rejects a negative total", () => {
  assert.equal(validateOrderTotal([{ unitPriceCents: 100, quantity: 1 }], -1), false);
});

test("rejects a tampered client total", () => {
  assert.equal(validateOrderTotal([{ unitPriceCents: 100, quantity: 2 }], 1), false);
});

test("accepts a correctly computed total", () => {
  assert.equal(validateOrderTotal([{ unitPriceCents: 100, quantity: 2 }], 200), true);
});
