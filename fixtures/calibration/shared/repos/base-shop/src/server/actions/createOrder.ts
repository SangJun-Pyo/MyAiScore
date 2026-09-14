export interface CreateOrderInput {
  items: { unitPriceCents: number; quantity: number }[];
  clientTotalCents: number;
}

export interface CreateOrderResult {
  ok: boolean;
  serverTotalCents: number;
  reason?: string;
}

/**
 * Recomputes the order total on the server instead of trusting the
 * client-submitted total, and rejects the order if the two disagree.
 */
export function createOrder(input: CreateOrderInput): CreateOrderResult {
  const serverTotalCents = input.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  if (serverTotalCents !== input.clientTotalCents) {
    return { ok: false, serverTotalCents, reason: "total_mismatch" };
  }
  if (serverTotalCents < 0) {
    return { ok: false, serverTotalCents, reason: "negative_total" };
  }
  return { ok: true, serverTotalCents };
}
