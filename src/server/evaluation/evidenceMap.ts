/**
 * Resolves the synthetic evidence IDs a fixture's collaboration_case.json
 * references (e.g. "ev_fixture_case02_test") into real Evidence objects.
 *
 * Why this exists (docs/Development/ASTRA_PHASE1_REVIEW.md section "A."):
 * Phase 1's fixtures already had collaboration_case.json files with
 * linked_evidence_ids like "ev_fixture_case02_test", but nothing tied that
 * string to an actual file, path, or excerpt. Astra's review requires that
 * every such reference either resolves to real, loaded content, or is
 * reported as an explicit, visible gap -- never silently dropped and never
 * fabricated to make a fixture look more complete than its inputs are.
 *
 * Each fixture case ships an `evidence_map.json` (EvidenceMap) declaring,
 * for every synthetic ID it uses, either:
 *   - where in the ingested repo it points ("repo_static"), resolved
 *     against that fixture's real IngestionSnapshot.evidenceCandidates, or
 *   - that it is deliberately unresolved, with a reason (e.g. "subvariant-a
 *     claims a log was submitted, but no log excerpt file exists in this
 *     fixture" -- CALIBRATION_PLAN case 8's "지연 제출" scenario).
 *
 * A map with no entry at all for a referenced ID is also treated as
 * unresolved (fixture input gap), not a crash and not a fabrication.
 */
import { createHash } from "node:crypto";
import type { IngestionSnapshot } from "../../shared/contracts/ingestion.js";
import type { Evidence } from "../../shared/contracts/evaluation.js";
import { redactSecrets } from "../ingestion/redact.js";

/** API_DATA_CONTRACTS.md section 4: "사용자 발췌 최대 3건, 건당 2,000자". Applied to the transient analysis-context text, not the permanent Evidence record (which never carries content at all). */
export const MAX_EXCERPT_ANALYSIS_CHARS = 2000;

export type EvidenceMapEntry =
  | { kind: "repo_static"; path: string }
  | { kind: "unresolved"; reason: string };

export type EvidenceMap = Record<string, EvidenceMapEntry>;

export interface UnresolvedEvidenceRef {
  evidenceId: string;
  reason: string;
}

export interface EvidenceResolutionResult {
  resolved: Evidence[];
  unresolved: UnresolvedEvidenceRef[];
}

/**
 * Resolves collaboration_case.json's linked_evidence_ids against a fixture's
 * evidence_map.json and the real IngestionSnapshot produced for that fixture's
 * repo. Never invents Evidence for an ID the map does not explain.
 */
export function resolveLinkedEvidence(params: {
  assessmentId: string;
  linkedEvidenceIds: string[];
  evidenceMap: EvidenceMap;
  snapshot: IngestionSnapshot;
  collectedAt: string;
}): EvidenceResolutionResult {
  const { assessmentId, linkedEvidenceIds, evidenceMap, snapshot, collectedAt } = params;
  const resolved: Evidence[] = [];
  const unresolved: UnresolvedEvidenceRef[] = [];

  for (const evidenceId of linkedEvidenceIds) {
    const entry = evidenceMap[evidenceId];
    if (!entry) {
      unresolved.push({ evidenceId, reason: "evidence_map.json에 이 ID에 대한 항목이 없음 (fixture 입력 누락)" });
      continue;
    }
    if (entry.kind === "unresolved") {
      unresolved.push({ evidenceId, reason: entry.reason });
      continue;
    }
    const candidate = snapshot.evidenceCandidates.find((c) => c.path === entry.path);
    if (!candidate) {
      unresolved.push({
        evidenceId,
        reason: `evidence_map.json이 가리키는 경로가 이 fixture의 IngestionSnapshot에 존재하지 않음: ${entry.path}`,
      });
      continue;
    }
    resolved.push({
      evidenceId,
      assessmentId,
      sourceType: candidate.sourceType,
      collectionMethod: candidate.collectionMethod,
      summary: candidate.summary,
      contentSha256: candidate.contentSha256,
      collectedAt,
      repo: candidate.repo,
      commitSha: candidate.commitSha,
      path: candidate.path,
      locator: candidate.locator,
      eventTime: candidate.eventTime,
      verificationNote: candidate.verificationNote,
    });
  }

  return { resolved, unresolved };
}

export interface ExcerptResolutionResult extends EvidenceResolutionResult {
  /**
   * evidenceId -> truncated (MAX_EXCERPT_ANALYSIS_CHARS), secret-masked
   * excerpt text. This is the ONLY place the actual excerpt content lives --
   * the Evidence objects in `resolved` never carry it (EVIDENCE_SCHEMA.md:
   * "원문 발췌는 기본 저장하지 않으며"). Astra Phase 2 review (R3): without
   * this, a real model has no way to read what the excerpt actually said.
   * Callers must route this map into the provider request's untrusted
   * analysis context, and must NOT copy it into any permanent
   * result/public-DTO/general log.
   */
  analysisContext: Record<string, string>;
}

/**
 * Resolves CollaborationCase.externalExcerpts (raw pasted text files) into
 * user_provided_excerpt Evidence. Unlike linked_evidence_ids these are
 * already file paths, not symbolic IDs -- no evidence_map entry is needed,
 * but a missing file is still reported explicitly, not skipped silently.
 */
export function resolveExternalExcerpts(params: {
  assessmentId: string;
  externalExcerpts: string[];
  /** Reads the excerpt file's text, or returns null if it does not exist (or, per the caller's own boundary check, would escape the fixture root). Injected for testability -- no fs import needed by callers that already have content in memory. */
  readExcerptText: (relativePath: string) => string | null;
  collectedAt: string;
}): ExcerptResolutionResult {
  const { assessmentId, externalExcerpts, readExcerptText, collectedAt } = params;
  const resolved: Evidence[] = [];
  const unresolved: UnresolvedEvidenceRef[] = [];
  const analysisContext: Record<string, string> = {};

  for (const excerptPath of externalExcerpts) {
    const text = readExcerptText(excerptPath);
    if (text === null) {
      unresolved.push({ evidenceId: `excerpt:${excerptPath}`, reason: `external_excerpts가 참조한 파일을 읽을 수 없음(또는 fixture 루트를 벗어남): ${excerptPath}` });
      continue;
    }
    const evidenceId = `excerpt:${excerptPath}`;
    resolved.push({
      evidenceId,
      assessmentId,
      sourceType: "user_provided_excerpt",
      collectionMethod: "user_submission",
      summary: `사용자 제출 발췌: ${excerptPath}`,
      contentSha256: createHash("sha256").update(text, "utf8").digest("hex"),
      collectedAt,
      repo: null,
      commitSha: null,
      path: null,
      locator: null,
      eventTime: null,
      verificationNote: "사용자가 제출한 원문 텍스트다. 서비스가 독립적으로 실행하거나 시점을 확인하지 않았다.",
    });
    const { redacted } = redactSecrets(text);
    analysisContext[evidenceId] = redacted.length > MAX_EXCERPT_ANALYSIS_CHARS ? `${redacted.slice(0, MAX_EXCERPT_ANALYSIS_CHARS)}…[truncated]` : redacted;
  }

  return { resolved, unresolved, analysisContext };
}
