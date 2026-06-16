"""A tiny shopping-cart library (prices in integer cents).

The thing speclock's criteria in SPEC.md are written against, tested with pytest.
"""


def subtotal(items):
    """Sum each line item's price times its quantity."""
    return sum(item["price"] * item["qty"] for item in items)


def apply_coupon(total, coupon):
    """Apply a coupon code; unknown codes leave the total unchanged."""
    if coupon == "SAVE10":
        return round(total * 0.9)
    if coupon == "HALF":
        return round(total * 0.5)
    return total


def is_free_shipping(total):
    """Orders of $50 (5000 cents) or more ship free."""
    return total >= 5000
