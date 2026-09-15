# ADR-0013: Separate ingestion response and content accounting

Status: accepted. Date: 2026-09-15. Related: [MAS-011 / issue #23](https://github.com/SangJun-Pyo/MyAiScore/issues/23), [ADR-0012](0012-repository-walkthrough.md).

## Context

The fixed MyAiScore snapshot selected 40 files but read 34. The collector added HTTP JSON response bodies and accepted decoded file content to the same 800 KiB budget, producing premature partial collection. That measurement is preserved as an original mixed counter; individual missing-file reasons were not saved in the walkthrough.

## Decision

The 800 KiB budget applies only to accepted decoded file bytes. Response body bytes are separate telemetry and include error/retry responses. They are UTF-8 body measurements, not exact compressed wire traffic. Existing request, time and service per-response limits remain separate. Collector versioning distinguishes the corrected meaning of `fetchedBytes`; additive optional `contentBytes` is unknown in old snapshots, never inferred as zero.

Record safe path/reason metadata for files not read. Preserve the original walkthrough and source generator; collect the same pinned SHA into a new artifact. The walkthrough defaults to the new record and shows the old/new coverage comparison. Completing the planned sample does not mean reading the whole repository, and cannot establish personal AI collaboration skill without process evidence.

## Consequences and validation

Regression tests must separate transport overhead from content, enforce real content limits without overshoot, count retries, and retain reasons. Compare fresh collection at the same SHA with the original. No service model, invented user answers, private session collection or score-policy change is included. See [Phase 7](../../Development/Sessions/Phase-07-Repository-Walkthrough.md) for executed results.
