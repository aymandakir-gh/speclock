# A deliberately mixed suite (one pass, one fail, one skip) used by the pytest
# adapter integration test. NOT part of speclock's own suite — it lives under
# tests/fixtures/, which speclock's vitest config excludes.
import pytest


def test_pass_1():
    assert 1 + 1 == 2


def test_fail_1():
    assert 1 == 2


@pytest.mark.skip(reason="demo skip")
def test_skip_1():
    assert False
