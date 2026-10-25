# Test invariants and failure examples

10. **Tests for new logic.** Deterministic automated tests for new behavior, using test doubles for
    injected collaborators; assert behavior, not implementation. (Concrete coverage targets and the
    test framework are set by the per-language layer or the project.) A check that something bad is absent
    (no error, nothing torn, no overflow) also asserts the thing happened at all: an empty or inert input passes
    every "nothing bad" check — one such check stayed green for a day on output that did nothing. A lower bound
    ("more than N results") passes on duplicated output too: bound it on both sides or assert what must not be
    there (a split that cut every part twice still passed "more than 10 pieces"). Write the assertion first and
    watch it fail on the current code: a test that was never red proves nothing about the fix. Code that tells
    states apart (present / missing / broken) is tested on each state built for real, the broken one included: a
    platform's existence check can report a broken link as present.
    A check that fails on behaviour that is correct gets its rule fixed — what it measures, on the right unit —
    never its threshold loosened, and the change says which: a rigid part riding its base read as a leak while it
    was judged by its tip; judged by its base, the same tolerance passed it and still caught a base that leaked.
    The other way round: a check that fails on behaviour that is wrong gets the behaviour fixed, never its scope
    narrowed (the inputs, the cases, the limits a consumer may use) below what the consumers need — a deformation
    gate was "passed" by capping every joint at a third of the angle the animations required.
    A check that drives its input by a convention (a sign, an axis, a direction) asserts it drove what it names:
    a bend test's "+" opened the joint it claimed to close, and its axis sat 17-76° off the joint's own — every
    number it reported was about another motion.
