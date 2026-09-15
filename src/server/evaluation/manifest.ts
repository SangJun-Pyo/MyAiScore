/**
 * Builds the EvaluationManifest recorded alongside every offline (mock)
 * evaluation run. mode is always explicit so nothing downstream can mistake
 * a mock run for a real one. tokensUsed/costUsd are null with a stated
 * reason -- never a guessed number -- because no real provider call happened.
 */
import type { EvaluationManifest, EvaluationMode, EvaluationVersions } from "../../shared/contracts/evaluation.js";
import { hashPromptText } from "./inputAssembly.js";
import { QUESTION_PROMPT_TEXT } from "./prompts/questionPromptV1.js";
import { JUDGE_PROMPT_TEXT } from "./prompts/judgePromptV1.js";
import { RUBRIC_CRITERIA, RUBRIC_CRITERIA_VERSION } from "./rubricCriteria.js";

const RUBRIC_CRITERIA_HASH = hashPromptText(JSON.stringify(RUBRIC_CRITERIA));

export function buildManifest(params: {
  mode: EvaluationMode;
  providerId: string;
  versions: EvaluationVersions;
  bundleTextHash: string;
  modelInputHash: string;
  stageRequestHashes?: { questions: string | null; judgement: string | null };
  warnings: string[];
}): EvaluationManifest {
  return {
    mode: params.mode,
    providerId: params.providerId,
    versions: params.versions,
    bundleTextHash: params.bundleTextHash,
    modelInputHash: params.modelInputHash,
    stageRequestHashes: params.stageRequestHashes,
    questionPromptTextHash: hashPromptText(QUESTION_PROMPT_TEXT),
    judgePromptTextHash: hashPromptText(JUDGE_PROMPT_TEXT),
    rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION,
    rubricCriteriaHash: RUBRIC_CRITERIA_HASH,
    tokensUsed: null,
    costUsd: null,
    costNote:
      params.mode === "mock"
        ? "mode=mock -- no live LLM call; tokens and cost were not measured"
        : "Remains null until an actual call record provides this value",
    executedAt: null,
    warnings: params.warnings,
  };
}
