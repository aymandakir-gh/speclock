# Python test names can't contain a "[PY-1]" tag, so this example maps criteria
# to tests with the explicit `tests:` substrings in specs/spec.yaml (the other
# half of speclock's resolver). Each function name below is listed there.
from cart import subtotal, apply_coupon, is_free_shipping


def test_subtotal_sums_line_items():
    assert subtotal([{"price": 250, "qty": 2}, {"price": 100, "qty": 1}]) == 600
    assert subtotal([]) == 0


def test_coupon_discounts_total():
    assert apply_coupon(1000, "SAVE10") == 900
    assert apply_coupon(1000, "HALF") == 500
    assert apply_coupon(1000, "BOGUS") == 1000


def test_free_shipping_threshold():
    assert is_free_shipping(5000) is True
    assert is_free_shipping(4999) is False
