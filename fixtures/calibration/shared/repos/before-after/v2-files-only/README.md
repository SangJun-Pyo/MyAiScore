# before-after / v2-files-only (synthetic fixture)

"After" commit for CALIBRATION_PLAN case 8(c): a new test *file* was added,
but it does not exercise any failure case and nothing was actually run
against the original bug. This exists to check that a future evaluator does
not treat "a test file now exists" as behavior improvement by itself.
