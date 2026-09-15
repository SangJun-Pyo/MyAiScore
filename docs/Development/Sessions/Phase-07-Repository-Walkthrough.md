# Phase 7 — MyAiScore repository walkthrough

Date: 2026-09-15. Branch: `codex/myaiscore-simulation`. [Issue #22](https://github.com/SangJun-Pyo/MyAiScore/issues/22), [ADR-0012](../../Architecture/ADR/0012-repository-walkthrough.md).

## Request and boundaries

The user paused further design work and requested a functional simulation using their MyAiScore repository. The current task demonstrates the existing collection, question validation, judgment validation and deterministic scoring flow. It does not select a paid service model or fabricate a personal collaboration history.

Keep two facts separate: the public GitHub snapshot was really collected; the questions and interpretation are explicitly authored scripted responses. No collaboration case, excerpt or interview answer was invented. No service-model call, submitted-code execution or live personal score was produced.

## Collection record

Source of the following values: [saved curated walkthrough](../../../fixtures/walkthroughs/myaiscore.json).

| Field | Recorded value |
|---|---|
| Repository | `https://github.com/SangJun-Pyo/MyAiScore` |
| Fixed commit | `5bd958bcbdfa1766a40052857d2641c1985cdd9c` |
| Collected at | `2026-09-15T07:43:01.194Z` (16:43:01.194 KST) |
| Eligible / selected / read files | 285 / 40 / 34 |
| HTTP requests | 38 |
| Collection duration | 9,560 ms |
| Original mixed byte counter (`fetched_bytes`) | 819,270; not pure network bytes |
| Collector | `ingestion-0.2.1-en` |
| Ingestion status | `partial` |
| Selection limited / context truncated | `false` / `true` |

Independent review confirmed a premature-partial mechanism, tracked as MAS-011 / [#23](https://github.com/SangJun-Pyo/MyAiScore/issues/23): githubApi counts HTTP JSON response bodies and ingestion counts decoded accepted file content against the same 800 KiB counter. This run recorded 656,125 response-body bytes + 163,145 decoded file bytes = 819,270, overshooting the 819,200-byte bound by 70 bytes during response accounting. These are mixed accounting quantities, not a pure download metric. The individual reasons for the six unread files were not retained and remain unconfirmed. Preserve this original record; fix the budget before a separate rerun. `selection_limited=false` does not mean the whole repository was read: only 40 of 285 eligible files were selected. Context truncation separately records bounded content supplied to the scripted provider request.

## Scripted pipeline and saved replay

[buildMyAiScoreWalkthrough.ts](../../../scripts/buildMyAiScoreWalkthrough.ts) collects the fixed public repository and uses the dedicated `astra-scripted-myaiscore-walkthrough-v1` mock provider. Its authored questions refer to repository evidence such as README, AGENTS, package configuration, a test and CI. The existing validators and scorer process these responses; the provider does not run a model.

All five criteria are `insufficient_evidence`, with `level=null` and no dimension score. The total is `withheld`, `value=null`, for `ingestion_partial` and `insufficient_dimensions`; observed dimensions are 0/5. Repository policies and static tests do not establish the user's actual decisions or verification in a specific collaboration task. The improvement task describes the missing process evidence instead of awarding an invented score.

`result.source=github_repository` reflects zero user submissions. `mode=mock` identifies scripted interpretation independently of that real input provenance. Model identity, tokens, cost and model execution time remain null. Generator/source hashes, scripted-response hash, collection provenance and stage request hashes remain in the curated artifact. Raw file content, PreparedAssessment and analysisContext are not persisted in it.

`/walkthrough/myaiscore` displays three saved stages: Repository snapshot → 3 scripted questions → Report without answers. `GET /api/examples/myaiscore` returns this curated record. Opening the page neither recollects GitHub nor calls a model; stage controls navigate saved material. The walkthrough is outside owner storage and history and does not create an access token. The existing fully synthetic starter example remains separate.

## Reproduction

To view the saved walkthrough, start the development server and open [the local route](http://127.0.0.1:3000/walkthrough/myaiscore).

To generate a new record, create the output parent directory if absent and choose a new filename:

```bash
node --import tsx scripts/buildMyAiScoreWalkthrough.ts --out .data/myaiscore-walkthrough-new.json
```

The generator performs fresh GitHub API reads, uses the fixed repository/commit and refuses to overwrite an existing output. A rerun is not an offline or byte-identical replay: times, API conditions, coverage and resulting hashes can differ. It does not call a paid LLM. Do not replace the committed collection record to hide a failed or partial run.

## Verification and next work

Executed locally: 239 unit/regression tests, typecheck, production build and all 32 desktop/mobile browser tests passed. After improving stage-transition keyboard focus, the production build and both walkthrough browser tests passed again; the three dedicated API tests also passed after making the source-hash assertion independent of checkout line endings. The final browser run used an ignored temporary Playwright config targeting port 3104 because restarting port 3100 returned Windows `EFAULT`; the committed CI configuration is unchanged. [Six browser captures](../../../artifacts/phase7-walkthrough/README.md) preserve all three stages on desktop and mobile. The expanded Verification result was visually checked at both sizes.

Independent review found no walkthrough blocker and verified the generator hash, scripted-response hash and all 34 collected Git blob hashes. The example returned GET 200 with zero store access; mutations returned 405 and unsupported action paths 404. Browser checks also verify no owner history, access token or assessment creation. These checks do not establish model accuracy. The UI subtask was integrated as commit `3a495a1`; the generator, API, curated artifact and verification were committed as `a4fdbae`. `npm run check:docs` checked 55 documents and 392 local links with zero problems; `git diff --check` passed. Final integration and exact-head remote checks are recorded in [PR #24](https://github.com/SangJun-Pyo/MyAiScore/pull/24). The test preview runs locally at [port 3104](http://127.0.0.1:3104/walkthrough/myaiscore); this is not a deployment.

Next: fix MAS-011 byte accounting before rerunning collection, then review which real collaboration case and answers are needed. API/provider/model/budget decisions still precede any live evaluation. Supabase operational validation and deployment remain separate pending work under issue #4. Further design changes are paused; canonical checkout synchronization follows integration.

## 2026-09-15 — MAS-011 fix and same-commit recollection

The user authorized fixing the collector and rerunning the same repository after the explanation of partial collection. [ADR-0013](../../Architecture/ADR/0013-separated-ingestion-byte-accounting.md) records the accounting change. Core implementation commit `ca4a2f2` was integrated as `d65963b` on `codex/ingestion-byte-accounting`; independent review was performed by a separate subagent. No design redesign, service-model call, invented collaboration case/answer, deployment or submitted-code execution was included.

### Implementation

Collector `ingestion-0.3.0` counts accepted decoded file bytes against 800 KiB atomically, separately from UTF-8 HTTP response-body telemetry. Error/retry bodies are counted when returned by the transport. Bodies interrupted before return are not measurable by this counter; it is not exact wire traffic. File size is checked after decoding even when upstream sizes are absent/wrong. Selected unread paths retain time/request/content/file-size/binary/fetch reasons. Old snapshots remain readable with optional `contentBytes`; missing old values remain unknown.

The generator records curated path/reason metadata, original-run comparison and both new byte metrics. The old [34-file JSON](../../../fixtures/walkthroughs/myaiscore.json) is unchanged (original Windows file SHA256 `1e8dac2f51c36677f186b5644a2d8def9023b34ef8a4a61c1312c8d5c880f704`); its generator is preserved as source text under the original artifacts directory. The API now serves [the separate new record](../../../fixtures/walkthroughs/myaiscore-recollected.json). The page displays complete **selected sample**, old/new coverage, and expandable excluded/unselected path reasons. It does not claim the entire repository was read.

### Actual network run

The unauthenticated core allowance had 22 requests left, below the 43 needed. The existing configured GitHub Git credential was reused in memory for authorized public-repository API reads; it was not printed, saved or passed as a command-line argument. The generator accepts optional `GITHUB_TOKEN`, continues to reject private repositories, and retains the service's bounded response reader and timeout. The local credential launcher is ignored and not shipped. No new credential or permission scope was created. Authentication changes response metadata, so before/after body bytes and duration are not a controlled performance comparison.

| Field | New actual record |
|---|---|
| Repository / commit | `SangJun-Pyo/MyAiScore@5bd958bcbdfa1766a40052857d2641c1985cdd9c` |
| Collected at | `2026-09-15T08:17:29.740Z` |
| Candidates / selected / read | 285 / 40 / 40 |
| Status | `complete` (planned sample only) |
| HTTP requests / duration | 43 / 12,603 ms |
| Returned response-body UTF-8 bytes | 692,198 |
| Accepted decoded file bytes | 188,778 |
| Skipped path records | 272: 245 not_selected, 25 binary, 2 excluded |
| Context truncated | true; collection completeness does not remove evaluator input bounds |
| Score | withheld, value=null, reasons=[insufficient_dimensions], 0/5 observed |

The original run's six individual failure reasons remain unknown. All six additional paths were read in the new run. No original record was edited to turn partial into complete, and no personal score was invented after collection succeeded.

### Executed validation

- Core agent reproduced the same offline 40×18 KiB fixture on the old and corrected collector: 18/40 partial (mixed counter 803,017) → 40/40 complete (response 988,569 / content 737,280). True content exhaustion remains partial without overshooting. No external network in this reproduction.
- Root ran typecheck and 248 unit/regression tests: all passed. Production build initially hit an `EBUSY` lock from the existing preview; stopping that owned process and rebuilding succeeded. Production preview restarted at the same port 3104.
- All 32 desktop/mobile browser tests passed against that production build using the ignored port-3104 config. After adjusting capture scroll position and adding a mobile overflow check while skip details are expanded, both walkthrough tests passed again. [Six new screenshots](../../../artifacts/phase7-recollection/README.md) preserve the revised flow; initial off-scroll captures were regenerated, not image-edited.
- Independent reviewer executed 11 focused accounting tests and 4 API tests. All 40 evidence content hashes match Git blobs at the pinned SHA; accepted content totals 188,778 bytes. 40 read + 272 skipped covers all 312 Git paths exactly once. Both generator hashes and scripted response hash match; the original JSON is unchanged. No raw source context/credentials or owner-store/provider accesses were found. No required fixes.

Next: select a real collaboration case and its evidence, then choose a service provider/model/budget before live evaluation. Collection is working for this sample; real model accuracy, process-evidence quality and private-session compatibility are still unverified. The root recollection/UI/docs commit is `1fee787`; final integration and exact-head CI are recorded in [PR #25](https://github.com/SangJun-Pyo/MyAiScore/pull/25). The final documentation check covered 56 documents and 407 local links with zero problems. The canonical checkout is synchronized by fast-forward after merge, preserving original and fresh artifacts together.
