#!/usr/bin/env node
/** Fixed public-repository walkthrough. Real GitHub reads; explicitly scripted provider.
 * No local sessions, user answers, paid model, store or submitted code execution.
 * Only a curated DTO is saved. PreparedAssessment and file text stay in memory.
 */
import { access, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareAssessment, generateAssessmentQuestions, finalizeAssessment } from '../src/server/service/assessment.js';
import type { EvaluationProvider } from '../src/server/evaluation/provider.js';
import { resultView, snakeCase } from '../src/server/web/dto.js';

const repoUrl = 'https://github.com/SangJun-Pyo/MyAiScore';
const commit = '5bd958bcbdfa1766a40052857d2641c1985cdd9c';
const version = 'myaiscore-repository-walkthrough-v1';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--out') throw new Error('Use --out NEW_FILE.json. The parent directory must exist.');
  const destination = resolve(args[1]!);
  await access(dirname(destination));
  let exists = false;
  try { await access(destination); exists = true; } catch { /* exclusive write below remains authoritative */ }
  if (exists) throw new Error('Output already exists. Choose a new file; it will not be overwritten.');
  const prepared = await prepareAssessment({ assessmentId: 'walkthrough_myaiscore_5bd958b', repoUrl, commitRef: commit });
  if (prepared.snapshot.commitSha !== commit) throw new Error('Unexpected repository revision.');
  function evidence(path: string) {
    const item = prepared.evidence.find(e => e.path === path);
    if (!item) throw new Error(`Required sample evidence was not collected: ${path}`);
    return item;
  }
  const readme = evidence('README.md'), instructions = evidence('AGENTS.md'), pkg = evidence('package.json');
  const testPath = prepared.snapshot.staticSignals.testPaths[0];
  const ciPath = prepared.snapshot.staticSignals.ciPaths[0];
  if (!testPath || !ciPath) throw new Error('Required test/CI sample was not collected.');
  const testFile = evidence(testPath), ci = evidence(ciPath);
  // Authored after reading the pinned public project; these are not inferred levels.
  const observations = [
    { code: 'A', refs: [readme.evidenceId], rationale: 'README.md describes evidence-based, project-specific AI collaboration assessment and its scope. A current product description alone does not show when you set completion criteria or how you checked a particular AI-assisted task against them.', missing: 'One concrete task with the original goal, constraints, completion criteria and the result checked against them.' },
    { code: 'B', refs: [instructions.evidenceId], rationale: 'AGENTS.md defines shared agent instructions, ownership boundaries and review responsibilities. This demonstrates documented working rules, but does not establish how relevant context was actually delegated and corrected in one collaboration.', missing: 'The delegated request, relevant files, scope boundaries and any clarification you gave after the AI misunderstood context.' },
    { code: 'C', refs: [pkg.evidenceId], rationale: 'package.json records the Next.js/React/TypeScript toolchain. Installed tools and dependency count do not establish why a tool fit the problem, which alternative you considered, or what limitation you checked.', missing: 'One tool or approach decision linked to a task requirement, an alternative and an observed outcome.' },
    { code: 'D', refs: [testFile.evidenceId, ci.evidenceId], rationale: `The sample contains ${testPath} and ${ciPath}. This establishes the presence of checks and a CI definition. This collection did not execute them or retrieve a CI run, so their presence is not proof of successful verification or of your personal verification decisions.`, missing: 'A failing input or risk, the actual result before and after the change, and the record connecting the rerun to your decision.' },
    { code: 'E', refs: [instructions.evidenceId], rationale: 'AGENTS.md requires evidence-based decisions and independent review for important boundaries. A standing policy does not identify an original AI suggestion, your acceptance/rejection/revision, and its outcome in a particular task.', missing: 'One original AI suggestion, your decision and reason, the resulting change and its observed outcome.' },
  ];
  const rawQuestions = [
    { text: 'Choose one MyAiScore change you delegated to AI. What goal, constraints and completion criteria did you set, and which files or context did you include or deliberately exclude?', grounding_evidence_ids: [readme.evidenceId, instructions.evidenceId], target_criteria: ['A', 'B'] },
    { text: 'package.json lists the project toolchain. For one implementation choice, which alternative did you consider, and why did you accept, reject or revise the AI suggestion? Link that decision to the resulting change.', grounding_evidence_ids: [pkg.evidenceId, instructions.evidenceId], target_criteria: ['C', 'E'] },
    { text: `The repository includes ${testPath} and a CI workflow. For one important check, what input failed before the fix, what happened afterward, and which actual output or CI run supports your conclusion?`, grounding_evidence_ids: [testFile.evidenceId, ci.evidenceId], target_criteria: ['D'] },
  ];
  const scripted = {
    questions: { questions: rawQuestions },
    judgement: { criteria: observations.map(o => ({ criterion_code: o.code, status: 'insufficient_evidence', level: null,
      supporting_evidence_ids: o.refs, contrary_evidence_ids: [], rationale: o.rationale, missing_evidence: o.missing, blocking_conflict: false })) },
  };
  const provider: EvaluationProvider = { mode: 'mock', providerId: 'astra-scripted-myaiscore-walkthrough-v1',
    async generateQuestions() { return { raw: scripted.questions }; },
    async judgeCriteria() { return { raw: scripted.judgement }; },
  };
  const questioned = await generateAssessmentQuestions(prepared, provider);
  const result = await finalizeAssessment(questioned, [], provider);
  if (result.score.status !== 'withheld' || result.score.value !== null) throw new Error('A repository-only scripted walkthrough must not issue a personal score.');
  const payload = {
    example_kind: 'repository_walkthrough', repo_url: repoUrl, commit_sha: commit, collected_at: prepared.snapshot.collectedAt,
    collection: { read_files: prepared.snapshot.coverage.readFiles, candidate_files: prepared.snapshot.coverage.candidateFiles,
      selected_files: prepared.snapshot.coverage.selectedFiles, http_requests: prepared.snapshot.metrics.httpRequests,
      duration_ms: prepared.snapshot.metrics.durationMs, fetched_bytes: prepared.snapshot.metrics.fetchedBytes,
      selection_limited: prepared.snapshot.coverage.selectionLimited, context_truncated: prepared.contextTruncated },
    provenance: { generator_version: version,
      generator_sha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
      scripted_responses_sha256: createHash('sha256').update(JSON.stringify(scripted)).digest('hex'),
      collector_version: prepared.snapshot.collectorVersion, selection_digest: prepared.snapshot.selectionDigest,
      ingestion_status: prepared.snapshot.ingestionStatus, user_case_count: 0, user_excerpt_count: 0, user_answer_count: 0,
      service_model_calls: 0, submitted_code_executed: false, external_network: 'GitHub API collection only' },
    questions: snakeCase(questioned.questions),
    assessment: { assessment_id: result.assessmentId, repo_url: repoUrl, commit_sha: commit, status: 'done',
      result: snakeCase(resultView(result)), evidence: snakeCase(result.evidence), is_example: true, example_kind: 'repository_walkthrough',
      example_source: 'Real public GitHub snapshot with Astra-authored scripted interpretation; no user answers or service-model evaluation.', executed_at: null },
  };
  await writeFile(destination, JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output: destination, collection: payload.collection, commit, score: result.score,
    selected_paths: prepared.evidence.map(e => e.path), scripted_questions: rawQuestions.map(q => q.text) }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Walkthrough generation failed.'); process.exitCode = 1; });
