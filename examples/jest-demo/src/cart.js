// A tiny shopping-cart library (prices in integer cents) — the thing speclock's
// criteria are written against. See ../SPEC.md.

/** Sum each line item's price times its quantity. */
function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/** Apply a coupon code to a total; unknown codes leave the total unchanged. */
function applyCoupon(total, coupon) {
  if (coupon === 'SAVE10') return Math.round(total * 0.9);
  if (coupon === 'HALF') return Math.round(total * 0.5);
  return total;
}

/** Orders of $50 (5000 cents) or more ship free. */
function isFreeShipping(total) {
  return total >= 5000;
}

module.exports = { subtotal, applyCoupon, isFreeShipping };
