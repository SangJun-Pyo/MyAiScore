import { test } from "node:test";
import assert from "node:assert/strict";
import { createOrder } from "./createOrder.js";

test("accepts an order whose client total matches the server total", () => {
  const result = createOrder({ items: [{ unitPriceCents: 1000, quantity: 2 }], clientTotalCents: 2000 });
  assert.equal(result.ok, true);
});

test("rejects a tampered client total", () => {
  const result = createOrder({ items: [{ unitPriceCents: 1000, quantity: 2 }], clientTotalCents: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "total_mismatch");
});
