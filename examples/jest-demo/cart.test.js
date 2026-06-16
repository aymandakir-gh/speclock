// Each test's name carries its criterion id in brackets (e.g. [JD-1]); that tag
// is the whole convention speclock uses to map a test to a criterion.
const { subtotal, applyCoupon, isFreeShipping } = require('./src/cart');

describe('cart', () => {
  test('[JD-1] subtotals item prices times quantities', () => {
    expect(subtotal([{ price: 250, qty: 2 }, { price: 100, qty: 1 }])).toBe(600);
    expect(subtotal([])).toBe(0);
  });

  test('[JD-2] a valid coupon reduces the order total', () => {
    expect(applyCoupon(1000, 'SAVE10')).toBe(900);
    expect(applyCoupon(1000, 'HALF')).toBe(500);
    expect(applyCoupon(1000, 'BOGUS')).toBe(1000);
  });

  test('[JD-3] orders over $50 qualify for free shipping', () => {
    expect(isFreeShipping(5000)).toBe(true);
    expect(isFreeShipping(4999)).toBe(false);
  });
});
