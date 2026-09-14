# Calibration fixtures (Phase 1, Task 0)

This directory implements the 8 mandatory calibration cases from
`docs/Assessment/CALIBRATION_PLAN.md` section 2, as static synthetic input
data. **Nothing here has been evaluated by a real model yet.** Every
`expected.json` describes qualitative expectations (status per axis,
required evidence references, failure conditions) for a *future* Task 2
evaluator -- it never invents an exact score as ground truth, per
CALIBRATION_PLAN.md's explicit instruction not to fabricate precise totals
before a model has run.

## Layout

```text
fixtures/calibration/
  shared/repos/            small synthetic repos reused by multiple cases
  cases/
    case-01-tools-rich-no-verification/
    case-02-simple-tool-strong-verification/
    case-03-good-code-no-process/
    case-04-same-code-different-process/   (variant-a, variant-b)
    case-05-conflicting-evidence/
    case-06-prompt-injection/              (repo_ref_before/after)
    case-07-repeat-fixed-input/
    case-08-before-after/                  (3 subvariants: a-late-log, b-real-improvement, c-files-only)
```

Each case directory has some subset of:

- `repo_ref.json` (or `repo_ref_before.json` / `repo_ref_after.json` for case 6, or nested `before/`/`after/` for case 8): a relative path into `shared/repos/**`, so the same underlying code is never duplicated on disk for cases that need to share it.
- `collaboration_case.json`: matches `docs/Assessment/EVIDENCE_SCHEMA.md` section 4's `CollaborationCase` shape. Absent on purpose where the case is specifically about *no* process material being submitted (case 3).
- `excerpts/`: any user-provided text excerpts referenced by the collaboration case.
- `expected.json`: typed per `src/shared/contracts/calibration.ts` (`ExpectedOutcome`). States expected axis status/level range, required evidence paths, and an explicit failure condition an incorrect evaluator would trip.
- `provenance.json`: typed per `ExpectedOutcome`'s sibling `ProvenanceRecord`. All fixtures here are `synthetic: true`, `executedAt: null`, `humanReviewed: false` -- Claude Code authored these, and Astra (an AI design reviewer, not a person) has reviewed the *design decisions* behind Phase 2's corrections (see `docs/Development/ASTRA_PHASE1_REVIEW.md`). Neither of those is a human review. `humanReviewed` stays `false` until an actual person (상준님 or another designated reviewer) reviews fixture content, and Astra must never be recorded as satisfying that field.
- `evidence_map.json` (Phase 2, where present): resolves the synthetic `linked_evidence_ids` a `collaboration_case.json` references into either a real repo-static path (checked against that fixture's actual `IngestionSnapshot`) or an explicit `unresolved` entry with a reason. See `src/server/evaluation/evidenceMap.ts`. A missing map entry is always reported, never silently dropped or fabricated.

## What was actually verified in Phase 1

`tests/calibration/fixtures.test.ts` checks, without calling any LLM:

- every `expected.json` / `provenance.json` is well-formed per the shared contract types
- every `repo_ref*` path resolves to a real directory under `shared/repos/`
- every `requiredEvidenceRefs` path in `expected.json` actually exists in the referenced repo (or excerpts folder)
- `relatedFixtureIds` point at fixtures that actually exist
- case-02's repo is additionally run through the real (offline, no network) `ingestRepository()` pipeline from Task 1, and the resulting `IngestionSnapshot`'s evidence-candidate paths are cross-checked against case-02's `requiredEvidenceRefs` -- this is the one place Task 0 and Task 1 are wired together in this phase.

None of this is LLM criterion evaluation, calibration experiment execution, or human review. Those are explicitly out of scope for Phase 1 (see `CLAUDE_PHASE1_PROMPT.md`).

## What Phase 2 (offline) added

See `docs/Development/PHASE2_OFFLINE_REPORT.md` for the full report. In short: `evidence_map.json` files were added so every `collaboration_case.json`'s `linked_evidence_ids` and `external_excerpts` resolve to real, loaded Evidence (or an explicit unresolved reason) rather than an unverified symbolic string; case-04 was split into per-variant `expected.json`/`provenance.json` and its A-E expectations were re-derived per axis instead of assumed from code identity; case-08's mixed non-product status string was replaced with a typed `expectedComparisons` array. All of this is still validated with a MockProvider driven by test-supplied canned responses -- it is still not a real model's judgement, and still not proof of injection-attack resistance (case-06's actual before/after comparison is Task 2b's job).
