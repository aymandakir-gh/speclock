// A tiny shopping-cart library (prices in integer cents) — the thing speclock's
// criteria are written against. See ../SPEC.md.

export interface LineItem {
  price: number;
  qty: number;
}

/** Sum each line item's price times its quantity. */
export function subtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/** Apply a coupon code to a total; unknown codes leave the total unchanged. */
export function applyCoupon(total: number, coupon: string): number {
  if (coupon === 'SAVE10') return Math.round(total * 0.9);
  if (coupon === 'HALF') return Math.round(total * 0.5);
  return total;
}

/** Orders of $50 (5000 cents) or more ship free. */
export function isFreeShipping(total: number): boolean {
  return total >= 5000;
}
