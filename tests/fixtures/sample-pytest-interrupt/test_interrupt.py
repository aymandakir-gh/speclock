# Used by the pytest adapter's abnormal-exit regression test: test_three sends
# SIGINT mid-run, so pytest exits with code 2 (interrupted) while still writing a
# partial JUnit report whose collected testcases passed. The adapter must NOT
# report that as a green suite. NOT part of speclock's own suite (under fixtures/).
import os
import signal


def test_one():
    assert True


def test_two():
    assert True


def test_three_interrupts():
    os.kill(os.getpid(), signal.SIGINT)


def test_four():
    assert True
