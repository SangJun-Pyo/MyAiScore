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

Independent review found no walkthrough blocker and verified the generator hash, scripted-response hash and all 34 collected Git blob hashes. The example returned GET 200 with zero store access; mutations returned 405 and unsupported action paths 404. Browser checks also verify no owner history, access token or assessment creation. These checks do not establish model accuracy. The UI subtask was integrated as commit `3a495a1`; final integration and remote checks are recorded in the pull request.

Next: fix MAS-011 byte accounting before rerunning collection, then review which real collaboration case and answers are needed. API/provider/model/budget decisions still precede any live evaluation. Supabase operational validation and deployment remain separate pending work under issue #4. Further design changes are paused; canonical checkout synchronization follows integration.
