import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOrderTotal } from "./validateOrderTotal.js";

test("rejects a negative total (previously accepted -- this was the bug)", () => {
  assert.equal(validateOrderTotal([{ unitPriceCents: 100, quantity: 1 }], -1), false);
});
