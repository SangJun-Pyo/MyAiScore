// Read-only synthetic probes. No LLM, network, submitted-code execution or fixture mutation.
import fs from 'node:fs';
import { runOfflineEvaluationForFixture } from '../../src/server/evaluation/runOfflineEvaluationForFixture.ts';
import { validateAndBuildQuestions } from '../../src/server/evaluation/questionGeneration.ts';
import { validateAndBuildCriterionResults } from '../../src/server/evaluation/criterionJudgement.ts';
import { resolveExternalExcerpts } from '../../src/server/evaluation/evidenceMap.ts';
import { assembleEvaluationInput } from '../../src/server/evaluation/inputAssembly.ts';
import { makeEmptySnapshot } from '../../tests/evaluation/testHelpers.ts';
const canned = JSON.parse(fs.readFileSync('fixtures/mock-responses/case-02-generic-valid.json', 'utf8'));
const criteria = 'ABCDE'.split('').map(code => ({ criterion_code: code, status: 'observed', level: 4, supporting_evidence_ids: ['ev_fixture_case02_test'], contrary_evidence_ids: [], rationale: 'synthetic contract probe', missing_evidence: '', blocking_conflict: false }));
const out = await runOfflineEvaluationForFixture({ fixtureDir: 'fixtures/calibration/cases/case-02-simple-tool-strong-verification', mockQuestionsResponse: { raw: { questions: [] } }, mockJudgementResponse: { raw: { criteria } } });
const evidence = { evidenceId: 'ev_fixture_case02_test', assessmentId: 'other-assessment', sourceType: 'repo_static' };
const bundle = assembleEvaluationInput({ assessmentId: 'current-assessment', snapshot: makeEmptySnapshot(), collaborationCase: null, evidence: [evidence] });
const crossOwner = validateAndBuildQuestions(canned.questions, bundle);
const nullResults = {};
try { validateAndBuildQuestions({ raw: { questions: [null, null, null] } }, bundle); nullResults.questions = 'returned'; } catch (e) { nullResults.questions = e.name; }
try { validateAndBuildCriterionResults({ raw: { criteria: [null] } }, bundle); nullResults.criteria = 'returned'; } catch (e) { nullResults.criteria = e.name; }
const logText = 'UNIQUE_LOG_CONTENT_FAIL_THEN_PASS';
const excerpts = resolveExternalExcerpts({ assessmentId: 'current-assessment', externalExcerpts: ['log.txt'], readExcerptText: () => logText, collectedAt: '2026-09-14T00:00:00Z' });
const excerptBundle = assembleEvaluationInput({ assessmentId: 'current-assessment', snapshot: makeEmptySnapshot(), collaborationCase: null, evidence: excerpts.resolved });
console.log(JSON.stringify({ invalidQuestionsThenScore: { questionsOk: out.questions.ok, judgementOk: out.judgement.ok, score: out.score }, foreignAssessmentEvidenceAccepted: crossOwner.ok, nullEntryBehavior: nullResults, excerptBodyRetained: JSON.stringify(excerptBundle).includes(logText) }, null, 2));
