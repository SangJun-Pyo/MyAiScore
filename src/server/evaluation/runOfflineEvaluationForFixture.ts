/**
 * Orchestrates one end-to-end offline (mock, by default) run for a single
 * calibration fixture directory: ingest its repo -> resolve its
 * collaboration case's evidence -> generate questions -> apply fixed
 * answers -> judge criteria -> compute a score. Every step's real
 * validators run; the "model" is an injected EvaluationProvider (a
 * MockProvider unless the caller supplies a real one in Task 2b).
 *
 * Astra Phase 2 review (R1) requires that a failure at any stage stop the
 * pipeline from proceeding to later stages instead of quietly continuing --
 * this module tracks each stage's status explicitly (`stages`) and a single
 * `pipelineFailed` flag the CLI uses for its exit code. "not_attempted" and
 * "failed" are deliberately different: a stage skipped because an earlier
 * one failed is not_attempted, not itself a new failure.
 *
 * Exported as a function (not only a CLI) so tests can exercise the exact
 * same code path scripts/evaluateOffline.ts uses.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ingestRepository } from "../ingestion/ingest.js";
import { OfflineHttpClient } from "../ingestion/offlineHttpClient.js";
import { buildFixturesFromLocalRepo } from "../ingestion/localRepoFixtureBuilder.js";
import { resolveExternalExcerpts, resolveLinkedEvidence, type EvidenceMap } from "./evidenceMap.js";
import { resolveWithinRoot } from "./fixtureRoot.js";
import { parseCollaborationCase } from "./loadCollaborationCase.js";
import { assembleEvaluationInput, type EvaluationInputBundle } from "./inputAssembly.js";
import { MockProvider } from "./mockProvider.js";
import type { EvaluationProvider, RawProviderOutput } from "./provider.js";
import { withTimeout } from "./timeout.js";
import { validateAndBuildQuestions, type QuestionGenerationResult } from "./questionGeneration.js";
import { validateAndBuildCriterionResults, type CriterionJudgementResult } from "./criterionJudgement.js";
import { buildManifest } from "./manifest.js";
import { QUESTION_PROMPT_TEXT, QUESTION_PROMPT_VERSION } from "./prompts/questionPromptV1.js";
import { JUDGE_PROMPT_TEXT, JUDGE_PROMPT_VERSION } from "./prompts/judgePromptV1.js";
import { RUBRIC_CRITERIA, RUBRIC_CRITERIA_VERSION } from "./rubricCriteria.js";
import type { JudgementRequest, QuestionGenerationRequest } from "./providerRequest.js";
import { computeMyAiScore, IngestionNotScorableError, ScoringContractError } from "../scoring/scoreCalculator.js";
import { computeConfidenceSummary, deriveProcessEvidenceLevel } from "../scoring/confidenceSummary.js";
import type { Answer, CollaborationCase, Evidence, EvaluationManifest, MyAiScore, ConfidenceSummary } from "../../shared/contracts/evaluation.js";
import type { UnresolvedEvidenceRef } from "./evidenceMap.js";

/** No real provider exists yet (Task 2b); this bounds how long a mock/real call may run before the pipeline treats it as a timeout. */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

export type PipelineStageStatus = "succeeded" | "failed" | "not_attempted";

export interface StageRecord {
  status: PipelineStageStatus;
  detail: string | null;
}

export interface OfflineEvaluationInput {
  /** Directory containing repo_ref.json (or the case's own convention) and, optionally, collaboration_case.json + evidence_map.json. */
  fixtureDir: string;
  /** Name of the repo-ref file to read, in case a case uses a non-default name (e.g. case-06's repo_ref_before.json). */
  repoRefFile?: string;
  /** Directory collaboration_case.json / evidence_map.json actually live in, if different from fixtureDir (e.g. case-08 subvariants keep them under "after/"). Also the fixture-root boundary external_excerpts paths must resolve within. */
  caseDir?: string;
  assessmentId?: string;
  /**
   * An already-constructed provider (Astra Phase 2 review R2: "provider를
   * 주입하고"). If omitted, a MockProvider is built from
   * mockQuestionsResponse/mockJudgementResponse for convenience.
   */
  provider?: EvaluationProvider;
  /** Used only when `provider` is not supplied. Never derived from any expected.json. */
  mockQuestionsResponse?: RawProviderOutput;
  mockJudgementResponse?: RawProviderOutput;
  /** Positional fixed answers matched to the generated questions in order. A blank/whitespace-only text is omitted, never sent as grounding (EVIDENCE_SCHEMA.md: "빈 내용을 유효한 근거로 세지 않는다"). */
  fixedAnswers?: { text: string; linkedEvidenceIds?: string[] }[];
  /** Bounds each provider call. Default DEFAULT_PROVIDER_TIMEOUT_MS. Tests pass a small value to exercise the timeout path quickly. */
  providerTimeoutMs?: number;
  inferenceConfigVersion?: string;
}

export interface OfflineEvaluationOutcome {
  stages: {
    ingestion: StageRecord;
    questions: StageRecord;
    judgement: StageRecord;
    scoring: StageRecord;
  };
  /** true if any stage's status is "failed". The CLI uses this for its exit code -- a normal issued/withheld score is NOT a failure. */
  pipelineFailed: boolean;
  manifest: EvaluationManifest;
  evidenceCount: number;
  unresolvedEvidence: UnresolvedEvidenceRef[];
  questions: QuestionGenerationResult | null;
  answers: Answer[];
  judgement: CriterionJudgementResult | null;
  score: MyAiScore | null;
  confidence: ConfidenceSummary | null;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function runOfflineEvaluationForFixture(input: OfflineEvaluationInput): Promise<OfflineEvaluationOutcome> {
  const assessmentId = input.assessmentId ?? `as_offline_${randomUUID()}`;
  const caseDir = input.caseDir ?? input.fixtureDir;
  const timeoutMs = input.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const inferenceConfigVersion = input.inferenceConfigVersion ?? "not-applicable-mock";

  const stages: OfflineEvaluationOutcome["stages"] = {
    ingestion: { status: "not_attempted", detail: null },
    questions: { status: "not_attempted", detail: null },
    judgement: { status: "not_attempted", detail: null },
    scoring: { status: "not_attempted", detail: null },
  };

  // --- ingestion ---
  const repoRefPath = join(input.fixtureDir, input.repoRefFile ?? "repo_ref.json");
  const repoRef = loadJson<{ repoPath: string }>(repoRefPath);
  const repoDir = join(input.fixtureDir, repoRef.repoPath);
  const owner = "offline-eval";
  const repo = "fixture-repo";
  const fixtures = buildFixturesFromLocalRepo(repoDir, { owner, repo, commitSha: "e".repeat(40) });
  const snapshot = await ingestRepository({ repoUrl: `https://github.com/${owner}/${repo}` }, { httpClient: new OfflineHttpClient(fixtures) });

  stages.ingestion =
    snapshot.ingestionStatus === "failed"
      ? { status: "failed", detail: snapshot.failure?.message ?? "ingestion_status=failed" }
      : { status: "succeeded", detail: snapshot.ingestionStatus === "partial" ? "ingestion_status=partial -- coverage limited" : null };

  let collaborationCase: CollaborationCase | null = null;
  let evidence: Evidence[] = [];
  const unresolved: UnresolvedEvidenceRef[] = [];
  const analysisContext: Record<string, string> = {};
  let resolvedCaseEvidence: Evidence[] = [];

  if (stages.ingestion.status === "succeeded") {
    const collaborationCasePath = join(caseDir, "collaboration_case.json");
    const evidenceMapPath = join(caseDir, "evidence_map.json");

    if (existsSync(collaborationCasePath)) {
      collaborationCase = parseCollaborationCase(loadJson(collaborationCasePath), assessmentId);
      const evidenceMap: EvidenceMap = existsSync(evidenceMapPath) ? loadJson(evidenceMapPath) : {};
      const linkedResult = resolveLinkedEvidence({
        assessmentId,
        linkedEvidenceIds: collaborationCase.linkedEvidenceIds,
        evidenceMap,
        snapshot,
        collectedAt: new Date().toISOString(),
      });
      evidence = evidence.concat(linkedResult.resolved);
      unresolved.push(...linkedResult.unresolved);
      resolvedCaseEvidence = resolvedCaseEvidence.concat(linkedResult.resolved);
      for (const e of linkedResult.resolved) {
        if (e.sourceType === "repo_static" && e.path) {
          const file = snapshot.files.find((f) => f.path === e.path);
          if (file) analysisContext[e.evidenceId] = file.redactedContent;
        }
      }

      if (collaborationCase.externalExcerpts && collaborationCase.externalExcerpts.length > 0) {
        const excerptResult = resolveExternalExcerpts({
          assessmentId,
          externalExcerpts: collaborationCase.externalExcerpts,
          readExcerptText: (p) => {
            // Astra Phase 2 review (R3): fixture-local paths must stay inside
            // the declared case root -- a path escaping it (e.g. "../../../etc/passwd")
            // is treated exactly like "file not found", never read.
            const full = resolveWithinRoot(caseDir, p);
            if (!full) return null;
            return existsSync(full) ? readFileSync(full, "utf8") : null;
          },
          collectedAt: new Date().toISOString(),
        });
        evidence = evidence.concat(excerptResult.resolved);
        unresolved.push(...excerptResult.unresolved);
        resolvedCaseEvidence = resolvedCaseEvidence.concat(excerptResult.resolved);
        Object.assign(analysisContext, excerptResult.analysisContext);
      }
    }

    // Every repo-static evidence candidate the snapshot found is also
    // citable, not only the ones the collaboration case happened to link --
    // a question may need to ground itself in code the user never
    // explicitly mentioned.
    const claimedPaths = new Set(evidence.map((e) => e.path).filter((p): p is string => p !== null));
    for (const candidate of snapshot.evidenceCandidates) {
      if (!claimedPaths.has(candidate.path)) {
        const evidenceId = `cand_${candidate.path}`;
        evidence.push({
          evidenceId,
          assessmentId,
          sourceType: candidate.sourceType,
          collectionMethod: candidate.collectionMethod,
          summary: candidate.summary,
          contentSha256: candidate.contentSha256,
          collectedAt: snapshot.collectedAt,
          repo: candidate.repo,
          commitSha: candidate.commitSha,
          path: candidate.path,
          locator: candidate.locator,
          eventTime: candidate.eventTime,
          verificationNote: candidate.verificationNote,
        });
        claimedPaths.add(candidate.path);
        const file = snapshot.files.find((f) => f.path === candidate.path);
        if (file) analysisContext[evidenceId] = file.redactedContent;
      }
    }
  }

  const bundle: EvaluationInputBundle | null =
    stages.ingestion.status === "succeeded" ? assembleEvaluationInput({ assessmentId, snapshot, collaborationCase, evidence }) : null;

  const provider: EvaluationProvider =
    input.provider ??
    new MockProvider({
      questionsResponse: input.mockQuestionsResponse ?? { providerError: { code: "provider_failure", message: "no mock response configured", retryable: false } },
      judgementResponse: input.mockJudgementResponse ?? { providerError: { code: "provider_failure", message: "no mock response configured", retryable: false } },
    });

  let questions: QuestionGenerationResult | null = null;
  if (stages.ingestion.status === "succeeded" && bundle) {
    const request: QuestionGenerationRequest = {
      assessmentId,
      trustedInstructions: { promptVersion: QUESTION_PROMPT_VERSION, promptText: QUESTION_PROMPT_TEXT, rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION },
      untrusted: { evidence, collaborationCase, analysisContext },
      inferenceConfigVersion,
      timeoutMs,
    };
    const raced = await withTimeout((signal) => provider.generateQuestions(request, signal), timeoutMs);
    const questionsRaw: RawProviderOutput = raced.timedOut
      ? { providerError: { code: "timeout", message: `question generation exceeded ${timeoutMs}ms`, retryable: true } }
      : raced.value;
    questions = validateAndBuildQuestions(questionsRaw, bundle);
    stages.questions = questions.ok ? { status: "succeeded", detail: null } : { status: "failed", detail: `${questions.failure.code}: ${questions.failure.message}` };
  } else {
    stages.questions = { status: "not_attempted", detail: "ingestion did not succeed" };
  }

  const answers: Answer[] = [];
  if (stages.questions.status === "succeeded" && questions?.ok && input.fixedAnswers) {
    for (const [i, q] of questions.questions.entries()) {
      const fixed = input.fixedAnswers[i];
      if (!fixed) continue;
      if (fixed.text.trim() === "") continue; // blank answers are omitted, never treated as grounding
      answers.push({
        answerId: `ans_${randomUUID()}`,
        assessmentId,
        questionId: q.questionId,
        text: fixed.text,
        linkedEvidenceIds: fixed.linkedEvidenceIds ?? [],
        submittedAt: new Date().toISOString(),
      });
    }
  }

  let judgement: CriterionJudgementResult | null = null;
  let bundleWithAnswers: EvaluationInputBundle | null = null;
  if (stages.questions.status === "succeeded" && questions?.ok && bundle) {
    bundleWithAnswers = assembleEvaluationInput({ assessmentId, snapshot, collaborationCase, evidence, questions: questions.questions, answers });
    const request: JudgementRequest = {
      assessmentId,
      trustedInstructions: {
        promptVersion: JUDGE_PROMPT_VERSION,
        promptText: JUDGE_PROMPT_TEXT,
        rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION,
        rubricCriteria: RUBRIC_CRITERIA,
      },
      untrusted: { evidence, collaborationCase, analysisContext, questions: questions.questions, answers },
      inferenceConfigVersion,
      timeoutMs,
    };
    const raced = await withTimeout((signal) => provider.judgeCriteria(request, signal), timeoutMs);
    const judgementRaw: RawProviderOutput = raced.timedOut
      ? { providerError: { code: "timeout", message: `judgement exceeded ${timeoutMs}ms`, retryable: true } }
      : raced.value;
    judgement = validateAndBuildCriterionResults(judgementRaw, bundleWithAnswers);
    stages.judgement = judgement.ok ? { status: "succeeded", detail: null } : { status: "failed", detail: `${judgement.failure.code}: ${judgement.failure.message}` };
  } else {
    stages.judgement = {
      status: "not_attempted",
      detail: stages.questions.status === "failed" ? "questions stage failed" : stages.ingestion.status !== "succeeded" ? "ingestion did not succeed" : "questions not attempted",
    };
  }

  let score: MyAiScore | null = null;
  let confidence: ConfidenceSummary | null = null;
  if (stages.judgement.status === "succeeded" && judgement?.ok && bundleWithAnswers) {
    try {
      score = computeMyAiScore({
        criterionResults: judgement.criteria,
        ingestionStatus: snapshot.ingestionStatus,
        validEvidenceIds: new Set(evidence.map((e) => e.evidenceId)),
      });
      stages.scoring = { status: "succeeded", detail: null };
    } catch (err) {
      if (err instanceof ScoringContractError || err instanceof IngestionNotScorableError) {
        stages.scoring = { status: "failed", detail: err.message };
        score = null;
      } else {
        throw err;
      }
    }
    confidence = computeConfidenceSummary({
      coverage: snapshot.coverage,
      ingestionStatus: snapshot.ingestionStatus,
      processEvidence: deriveProcessEvidenceLevel({ hasCollaborationCase: collaborationCase !== null, resolvedCaseEvidence }),
      remainingUncertainty: [
        "이 결과는 mode=mock으로 생성됐다 -- 실제 LLM 판정이 아니다.",
        ...(unresolved.length > 0 ? [`연결되지 않은 evidence 참조 ${unresolved.length}건이 있다.`] : []),
      ],
    });
  } else {
    stages.scoring = { status: "not_attempted", detail: "judgement stage did not succeed" };
  }

  const pipelineFailed = [stages.ingestion, stages.questions, stages.judgement, stages.scoring].some((s) => s.status === "failed");

  const finalBundle = bundleWithAnswers ?? bundle;
  const manifest = buildManifest({
    mode: provider.mode,
    providerId: provider.providerId,
    versions: {
      rubricVersion: "scoring-rubric-v0.3.1",
      pipelineVersion: "phase2-fix-v1",
      questionPromptVersion: QUESTION_PROMPT_VERSION,
      evaluatorPromptVersion: JUDGE_PROMPT_VERSION,
      inferenceConfigVersion,
    },
    bundleTextHash: finalBundle?.bundleTextHash ?? "",
    modelInputHash: finalBundle?.modelInputHash ?? "",
    warnings: [
      provider.mode === "mock" ? "mode=mock: 실제 LLM 호출 없음. 이 출력은 provider 계약 검증용이며 실제 평가 정확도를 증명하지 않는다." : "mode=live",
      ...(unresolved.length > 0 ? unresolved.map((u) => `unresolved evidence: ${u.evidenceId} -- ${u.reason}`) : []),
      ...(pipelineFailed ? [`pipeline failed at stage(s): ${Object.entries(stages).filter(([, s]) => s.status === "failed").map(([name]) => name).join(", ")}`] : []),
    ],
  });

  return {
    stages,
    pipelineFailed,
    manifest,
    evidenceCount: evidence.length,
    unresolvedEvidence: unresolved,
    questions,
    answers,
    judgement,
    score,
    confidence,
  };
}
