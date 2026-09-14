export interface CreateOrderInput {
  items: { unitPriceCents: number; quantity: number }[];
  clientTotalCents: number;
}

export interface CreateOrderResult {
  ok: boolean;
  serverTotalCents: number;
}

// NOTE (synthetic fixture): this version does NOT reject a mismatched
// client total -- it always returns ok: true. This is deliberate: it lets
// a future evaluator notice that despite the elaborate agent/MCP setup,
// nothing here was verified against a failure case.
export function createOrder(input: CreateOrderInput): CreateOrderResult {
  const serverTotalCents = input.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  return { ok: true, serverTotalCents };
}
