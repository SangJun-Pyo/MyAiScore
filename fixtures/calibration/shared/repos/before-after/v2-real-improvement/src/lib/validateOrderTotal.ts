export function validateOrderTotal(items: { unitPriceCents: number; quantity: number }[], clientTotalCents: number): boolean {
  if (clientTotalCents < 0) return false;
  const serverTotal = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  return serverTotal === clientTotalCents;
}
