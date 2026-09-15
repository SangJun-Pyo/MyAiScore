/**
 * Structured, versioned transcription of docs/Assessment/SCORING_RUBRIC.md
 * section 4 (per-axis level definitions and counter-examples). This is part
 * of the *trusted instructions* a real Task 2b provider request must carry --
 * Astra Phase 2 review (R2) found that judgePromptV1's free text alone does
 * not carry the rubric's actual level semantics, so a model receiving only
 * that prompt has no way to know what "level 3" means for each axis.
 *
 * Bump RUBRIC_CRITERIA_VERSION whenever this transcription changes, and keep
 * it in sync with SCORING_RUBRIC.md by hand -- there is intentionally no
 * automatic extraction from the markdown file.
 */
import type { CriterionCode } from "../../shared/contracts/evaluation.js";

export const RUBRIC_CRITERIA_VERSION = "scoring-rubric-v0.3.1-criteria-table-v2-en";

export interface CriterionLevelDefinition {
  level: 1 | 2 | 3 | 4;
  behavior: string;
  counterExample: string;
}

export interface CriterionDefinition {
  code: CriterionCode;
  title: string;
  weight: number;
  question: string;
  levels: CriterionLevelDefinition[];
}

export const RUBRIC_CRITERIA: CriterionDefinition[] = [
  {
    code: "A",
    title: "Problem framing",
    weight: 15,
    question: "Did the user define the problem, constraints and completion criteria, then check whether the goal was achieved?",
    levels: [
      { level: 1, behavior: "Records show an actual request with unclear purpose or completion criteria, followed by no check of what was solved.", counterExample: "If there is no request record at all, use not_observed." },
      { level: 2, behavior: "The user specified a goal or inputs and outputs, then checked basic completion using a normal case.", counterExample: "A goal added to a README afterward is not evidence of actual use." },
      { level: 3, behavior: "The user linked constraints, scope and completion criteria to the task instructions and checked the result against each condition.", counterExample: "A large feature list without checking whether its requirements were met is insufficient." },
      { level: 4, behavior: "The user examined key assumptions, adjusted scope if needed, and checked whether the problem was solved using success and failure cases suited to the goal and constraints.", counterExample: "Complex requirements or a long plan alone do not earn extra credit." },
    ],
  },
  {
    code: "B",
    title: "Context & delegation",
    weight: 20,
    question: "Did the user give the AI the necessary context and task boundaries?",
    levels: [
      { level: 1, behavior: "The process shows delegation without necessary code or constraints, leaving the resulting misunderstanding unresolved.", counterExample: "The absence of AGENTS.md alone does not justify a low level." },
      { level: 2, behavior: "The user provided relevant files or requirements and the task scope, then addressed basic errors.", counterExample: "Providing the entire repository without selection is not sufficient by itself." },
      { level: 3, behavior: "The user selected relevant context, interfaces and completion criteria, and updated the context through feedback.", counterExample: "There is no need to split a simple task unnecessarily." },
      { level: 4, behavior: "The user managed important dependencies and missing context in advance, checked results, and added only the context needed.", counterExample: "Agent count and prompt length do not determine the level." },
    ],
  },
  {
    code: "C",
    title: "Tool choice",
    weight: 15,
    question: "Did the user choose an approach suited to the scale of the problem and avoid unnecessary complexity?",
    levels: [
      { level: 1, behavior: "The process shows a tool or architecture unsuited to the constraints, with resulting problems left unaddressed.", counterExample: "Do not deduct points because only one tool was used or because it was free." },
      { level: 2, behavior: "The basic tool fit the problem and performed the core task, but review of its limits and burden was limited.", counterExample: "A configuration file alone does not establish actual use or suitability." },
      { level: 3, behavior: "The user chose an appropriate approach considering relevant constraints such as speed, cost, maintenance or verifiability.", counterExample: "There is no requirement to try every tool or record numerical costs." },
      { level: 4, behavior: "The user selected and adjusted the simplest sufficient approach based on relevant alternatives and actual results, and addressed its limitations.", counterExample: "Complex orchestration or an impressive retrospective explanation alone does not establish the highest level." },
    ],
  },
  {
    code: "D",
    title: "Verification",
    weight: 30,
    question: "Did the user use appropriate evidence to check important ways the AI output could fail?",
    levels: [
      { level: 1, behavior: "Specific process evidence shows acceptance of AI output without verification or disregard of an obvious failure.", counterExample: "Missing submitted tests or logs alone does not establish that verification was skipped." },
      { level: 2, behavior: "The user checked a normal case through execution, manual checks or review, but missed important failure conditions.", counterExample: "Test files without evidence of use or results may be insufficient." },
      { level: 3, behavior: "The user checked important failure cases through reproducible tests, reviews or measurements, and interpreted the results.", counterExample: "Automated tests are not mandatory. Reproducible manual verification suited to the task also qualifies." },
      { level: 4, behavior: "The user challenged AI output with counterexamples suited to the risks, then checked regressions and remaining limits after changes.", counterExample: "Test counts, coverage numbers or the presence of CI files alone do not establish the highest level." },
    ],
  },
  {
    code: "E",
    title: "Judgment & iteration",
    weight: 20,
    question: "Did the user accept, reject or modify suggestions based on evidence and check the results?",
    levels: [
      { level: 1, behavior: "The process shows acceptance without reviewing evidence despite an opportunity to recognize an obvious problem with the suggestion.", counterExample: "No revision commits alone does not establish uncritical acceptance." },
      { level: 2, behavior: "The user reviewed a suggestion, accepted, modified or rejected it, and gave a simple reason.", counterExample: "A claim of independent judgment without evidence is insufficient." },
      { level: 3, behavior: "The user decided whether to accept the suggestion based on alternatives, constraints or verification results, and checked its effect.", counterExample: "Large code changes or frequent rejection of AI suggestions do not earn extra credit." },
      { level: 4, behavior: "The user distinguished causes of failure and adjusted delegation, approach or verification, or accepted the suggestion and stopped based on sufficient evidence.", counterExample: "If the AI suggestion was correct, there is no need to manufacture rejection or iteration." },
    ],
  },
];
