import type {
  CommitTraceabilitySignals,
  IngestedFile,
  RepositoryInventory,
} from "../../shared/contracts/ingestion.js";
import {
  REPOSITORY_EVIDENCE_ORDER,
  repositoryEvidencePoints,
  type RepositoryReportAxis,
  type RepositoryReportEvidenceId,
  type RepositoryReportSignalAssessment,
} from "../../shared/repositoryReport.js";
import { repositoryPathMatchesEvidence } from "../../shared/repositorySignals.js";

const SUPPORTED_TEST_EXTENSION = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt)$/i;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function normalizedContent(files: IngestedFile[]): string {
  return files.map(file => file.redactedContent.replace(/\r\n/g, "\n")).join("\n");
}

function uniqueMeaningfulLines(content: string): string[] {
  return [...new Set(content.split("\n")
    .map(line => line.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"))
    .filter(line => line.length >= 4 && !/^[-=*#`_\s]+$/.test(line)))];
}

function cappedCount(content: string, pattern: RegExp, target: number): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return clamp((content.match(new RegExp(pattern.source, flags))?.length ?? 0) / target);
}

function present(content: string, pattern: RegExp): number {
  return pattern.test(content) ? 1 : 0;
}

function textDepth(content: string, target = 120): number {
  const uniqueWords = new Set(content.toLocaleLowerCase("en").match(/[\p{L}\p{N}_-]{2,}/gu) ?? []);
  const lines = uniqueMeaningfulLines(content);
  return clamp(Math.min(uniqueWords.size / target, lines.length / 12));
}

function average(parts: number[]): number {
  return parts.length ? rounded(parts.reduce((sum, value) => sum + clamp(value), 0) / parts.length) : 0;
}

function readmeSubstance(content: string): number {
  return average([
    textDepth(content),
    present(content, /(?:^|\n)#{1,4}\s*(?:about|overview|purpose|소개|개요|목적)|\b(?:project|service|library|application)\b.{0,50}\b(?:for|helps?|provides?)\b/iu),
    present(content, /(?:install|setup|getting started|quickstart|prerequisite|설치|시작|환경 설정)/iu),
    Math.max(present(content, /(?:usage|example|run|사용|실행|예시)/iu), present(content, /(?:test|lint|verify|check|검증|테스트)|\[[^\]]+\]\((?!https?:)[^)]+\)/iu)),
  ]);
}

function guidanceSubstance(content: string): number {
  return average([
    textDepth(content, 100),
    present(content, /(?:scope|goal|task|responsibilit|범위|목표|작업)/iu),
    present(content, /(?:must not|never|constraint|avoid|금지|제약|하지 (?:마|않))/iu),
    Math.max(present(content, /(?:test|lint|build|typecheck|검증|테스트)/iu), present(content, /(?:done|completion|acceptance|완료 조건|완료 기준)/iu)),
  ]);
}

function docsSubstance(files: IngestedFile[], content: string): number {
  const nonEmpty = files.filter(file => file.redactedContent.trim().length >= 40).length;
  return average([
    clamp(nonEmpty / 2),
    files.length ? nonEmpty / files.length : 0,
    textDepth(content, 160),
    present(content, /\[[^\]]+\]\((?!https?:)[^)]+\)|(?:see|관련|참고).{0,40}(?:docs?|adr|\.md)/iu),
  ]);
}

function metadataSubstance(files: IngestedFile[], content: string): number {
  let parsed = 0;
  let scripts = 0;
  let metadata = 0;
  for (const file of files) {
    if (file.path.toLowerCase() === "package.json") {
      try {
        const value = JSON.parse(file.redactedContent) as Record<string, unknown>;
        parsed = 1;
        const packageScripts = value.scripts && typeof value.scripts === "object" ? Object.keys(value.scripts as object) : [];
        scripts = packageScripts.some(key => /^(?:test|lint|build|check|typecheck)/i.test(key)) ? 1 : 0;
        metadata = ["name", "description", "main", "exports", "bin", "type"].some(key => key in value) ? 1 : 0;
      } catch { /* A malformed manifest remains observable but not substantive. */ }
    }
  }
  const structured = present(content, /(?:\[project\]|\[tool\.|<artifactId>|^module\s+\S+|^\[package\]|plugins\s*\{|dependencies\s*\{)/imu);
  return average([Math.max(parsed, structured), Math.max(scripts, present(content, /(?:test|lint|build|check|typecheck)/iu)), metadata, textDepth(content, 80)]);
}

function testSubstance(files: IngestedFile[], content: string): { status: "measured" | "unmeasured"; value: number | null } {
  const supported = files.filter(file => SUPPORTED_TEST_EXTENSION.test(file.path));
  if (supported.length === 0) return { status: "unmeasured", value: null };
  const supportedContent = normalizedContent(supported);
  const declarations = cappedCount(supportedContent, /(?:\b(?:describe|it|test)\s*\(|\bdef\s+test_|\bfunc\s+Test\w+|#\[test\]|@Test\b)/g, 4);
  const assertions = cappedCount(supportedContent, /(?:\bexpect\s*\(|\bassert(?:Equals?|True|False|That)?\b|\bself\.assert\w*\s*\(|\bt\.(?:Error|Fatal|Fail)\w*\s*\(|\bassert(?:_eq|_ne)?!\s*\()/g, 6);
  const uniqueAssertions = new Set(uniqueMeaningfulLines(supportedContent).filter(line => /expect\s*\(|assert|t\.(?:error|fatal|fail)/i.test(line))).size;
  return { status: "measured", value: average([textDepth(supportedContent, 80), declarations, assertions, clamp(uniqueAssertions / 4)]) };
}

function configSubstance(content: string): number {
  return average([
    textDepth(content, 45),
    present(content, /(?:compilerOptions|rules\s*[:=]|coverage|testEnvironment|testMatch|include\s*=|exclude\s*=|strict\s*[:=])/iu),
    present(content, /(?:test|lint|typecheck|coverage|check)/iu),
    present(content, /(?:extends|plugins?|preset|reporter|threshold|target|module)/iu),
  ]);
}

function changelogSubstance(content: string): number {
  return average([
    textDepth(content, 100),
    cappedCount(content, /(?:^|\n)#{1,3}\s*(?:\[?v?\d+\.\d+|\d{4}-\d{2}-\d{2}|unreleased)/gim, 2),
    cappedCount(content, /(?:^|\n)\s*[-*]\s+\S+/gm, 4),
    present(content, /(?:added|changed|fixed|removed|security|추가|변경|수정|삭제)/iu),
  ]);
}

function decisionSubstance(files: IngestedFile[], content: string): number {
  return average([
    clamp(files.filter(file => file.redactedContent.trim().length >= 80).length / 2),
    present(content, /(?:context|problem|status|문제|배경|상태)/iu),
    present(content, /(?:decision|결정|선택)/iu),
    Math.max(present(content, /(?:alternative|option|대안)/iu), present(content, /(?:consequence|trade-?off|결과|영향)/iu)),
  ]);
}

function templateSubstance(content: string): number {
  return average([
    textDepth(content, 70),
    cappedCount(content, /(?:^|\n)\s*-\s*\[[ xX]\]/gm, 3),
    present(content, /(?:reproduc|steps? to|재현|단계)/iu),
    present(content, /(?:expected|actual|verify|test plan|예상|실제|검증)/iu),
  ]);
}

function migrationSubstance(files: IngestedFile[], content: string): number {
  const nonEmpty = files.filter(file => file.redactedContent.trim().length >= 20).length;
  return average([
    files.length ? nonEmpty / files.length : 0,
    present(content, /(?:create|alter|drop)\s+(?:table|index|column)|\b(?:up|down)\s*\(|migrationBuilder/iu),
    cappedCount(content, /(?:create|alter|drop|add|remove|rename)\b/giu, 4),
    clamp(nonEmpty / 2),
  ]);
}

function ciSubstance(content: string): number {
  const taskKinds = [/(?:npm|pnpm|yarn|bun).{0,12}\btest\b|pytest|go test|cargo test/iu, /\blint\b|ruff|eslint/iu, /\bbuild\b|tsc/iu]
    .filter(pattern => pattern.test(content)).length;
  return average([
    textDepth(content, 65),
    present(content, /(?:^|\n)\s*(?:jobs|steps|on):\s*/imu),
    Math.max(present(content, /(?:^|\n)\s*(?:run|uses):\s*\S+/imu), clamp(cappedCount(content, /(?:run|uses):/gi, 3))),
    clamp(taskKinds / 3),
  ]);
}

function dependencyAutomationSubstance(content: string): number {
  return average([
    textDepth(content, 35),
    present(content, /(?:package-ecosystem|extends|renovate)/iu),
    present(content, /(?:schedule|interval|timezone)/iu),
    present(content, /(?:directory|target-branch|groups?|packageRules)/iu),
  ]);
}

function deliverySubstance(content: string): number {
  return average([
    textDepth(content, 50),
    present(content, /(?:^FROM\s+|\[build\]|builder|buildCommand|dockerfile)/imu),
    present(content, /(?:^CMD\s+|^ENTRYPOINT\s+|startCommand|\bstart\b)/imu),
    present(content, /(?:healthcheck|healthcheckPath|\/health|restartPolicy|deploy)/iu),
  ]);
}

function scriptsSubstance(files: IngestedFile[], content: string): number {
  const taskKinds = [/(?:test|pytest|go test|cargo test)/iu, /(?:lint|eslint|ruff|check)/iu, /(?:build|compile|tsc)/iu, /(?:deploy|release|publish)/iu]
    .filter(pattern => pattern.test(content)).length;
  return average([
    files.length ? files.filter(file => file.redactedContent.trim().length >= 20).length / files.length : 0,
    textDepth(content, 60),
    clamp(taskKinds / 3),
    present(content, /(?:^#!|set\s+-e|\.PHONY:|tasks?:|scripts?)/imu),
  ]);
}

function substanceFor(id: RepositoryReportEvidenceId, files: IngestedFile[]): { status: "measured" | "unmeasured"; value: number | null } {
  const content = normalizedContent(files);
  switch (id) {
    case "context-readme": return { status: "measured", value: readmeSubstance(content) };
    case "context-guidance": return { status: "measured", value: guidanceSubstance(content) };
    case "context-docs": return { status: "measured", value: docsSubstance(files, content) };
    case "context-metadata": return { status: "measured", value: metadataSubstance(files, content) };
    case "verification-tests": return testSubstance(files, content);
    case "verification-config": return { status: "measured", value: configSubstance(content) };
    case "traceability-changelog": return { status: "measured", value: changelogSubstance(content) };
    case "traceability-decisions": return { status: "measured", value: decisionSubstance(files, content) };
    case "traceability-templates": return { status: "measured", value: templateSubstance(content) };
    case "traceability-migrations": return { status: "measured", value: migrationSubstance(files, content) };
    case "automation-ci": return { status: "measured", value: ciSubstance(content) };
    case "automation-dependencies": return { status: "measured", value: dependencyAutomationSubstance(content) };
    case "automation-delivery": return { status: "measured", value: deliverySubstance(content) };
    case "automation-scripts": return { status: "measured", value: scriptsSubstance(files, content) };
  }
}

function breadthFor(id: RepositoryReportEvidenceId, inventory: RepositoryInventory): number {
  if (id === "verification-tests") return rounded(clamp((inventory.testFiles / Math.max(inventory.sourceFiles, 1)) / 0.25));
  if (id === "context-docs") {
    const target = Math.max(inventory.sourceFiles * 0.1, 1);
    return rounded(clamp(inventory.documentationFiles / target));
  }
  if (["traceability-decisions", "traceability-migrations", "automation-scripts"].includes(id)) {
    return rounded(clamp(inventory.signalCandidateCounts[id] / 2));
  }
  return 1;
}

function roleFor(id: RepositoryReportEvidenceId, databaseLikely: boolean): RepositoryReportSignalAssessment["role"] {
  if (["context-readme", "context-metadata", "verification-tests", "verification-config"].includes(id)) return "core";
  if (id === "traceability-migrations" && databaseLikely) return "conditional";
  return "bonus";
}

function databaseLikelyFrom(dependencies: string[], manifestContent: string): boolean {
  const normalized = dependencies.map(value => value.toLocaleLowerCase("en"));
  const databasePackages = ["pg", "mysql2", "prisma", "@prisma/client", "typeorm", "sequelize", "sqlalchemy", "django", "psycopg", "psycopg2", "pymongo", "gorm.io/gorm"];
  if (databasePackages.some(candidate => normalized.some(value => value === candidate || value.includes(candidate)))) return true;
  return /(?:^|["'\s=<{[(,])(?:pg|mysql2|prisma|typeorm|sequelize|sqlalchemy|django|psycopg2?|pymongo|gorm(?:\.io\/gorm)?)(?:["'\s=>})\],]|$)/imu.test(manifestContent);
}

function fileAssessment(
  id: RepositoryReportEvidenceId,
  axis: RepositoryReportAxis,
  allFiles: IngestedFile[],
  inventory: RepositoryInventory,
  databaseLikely: boolean,
): RepositoryReportSignalAssessment {
  const files = allFiles.filter(file => repositoryPathMatchesEvidence(id, file.path));
  const presence = files.length ? 1 : 0;
  const measured = presence ? substanceFor(id, files) : { status: "measured" as const, value: 0 };
  const breadth = breadthFor(id, inventory);
  const substance = measured.value;
  const quality = presence === 0 ? 0 : substance === null ? 0.15 : rounded(0.15 + 0.60 * substance + 0.25 * substance * breadth);
  const maxPoints = repositoryEvidencePoints(id);
  return {
    id,
    axis,
    role: roleFor(id, databaseLikely),
    status: measured.status,
    presence,
    substance,
    breadth,
    quality,
    points: Math.round(maxPoints * quality),
    maxPoints,
  };
}

function commitAssessment(signals?: CommitTraceabilitySignals): RepositoryReportSignalAssessment {
  const maxPoints = 5;
  const ratios = signals ? [signals.nonGenericSubjectRatio, signals.distinctSubjectRatio, signals.scopedSubjectRatio, signals.rationaleBodyRatio, signals.referenceRatio]
    .filter((value): value is number => value !== null) : [];
  const enoughEvidence = Boolean(signals && signals.evaluatedCommits >= 3 && ratios.length === 5);
  const substance = enoughEvidence ? average(ratios) : null;
  const presence = enoughEvidence ? 1 : 0;
  const quality = substance === null ? 0 : rounded(0.15 + 0.85 * substance);
  return {
    id: "traceability-commit-practice",
    axis: "traceability",
    role: "bonus",
    status: substance === null ? "unmeasured" : "measured",
    presence,
    substance,
    breadth: 1,
    quality,
    points: Math.round(maxPoints * quality),
    maxPoints,
  };
}

export interface RepositoryV2SignalAnalysis {
  assessments: RepositoryReportSignalAssessment[];
  databaseLikely: boolean;
}

export function analyzeRepositorySignals(
  files: IngestedFile[],
  inventory: RepositoryInventory,
  commitTraceability?: CommitTraceabilitySignals,
): RepositoryV2SignalAnalysis {
  const manifestFiles = files.filter(file => repositoryPathMatchesEvidence("context-metadata", file.path));
  const databaseLikely = databaseLikelyFrom(files.length ? files.flatMap(file => {
    if (file.path !== "package.json") return [];
    try {
      const value = JSON.parse(file.redactedContent) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      return [...Object.keys(value.dependencies ?? {}), ...Object.keys(value.devDependencies ?? {})];
    } catch { return []; }
  }) : [], normalizedContent(manifestFiles));
  const assessments = REPOSITORY_EVIDENCE_ORDER.map(id => fileAssessment(
    id,
    // The copy is the canonical axis map and is validated again by the public parser.
    ({
      "context-readme": "context", "context-guidance": "context", "context-docs": "context", "context-metadata": "context",
      "verification-tests": "verification", "verification-config": "verification",
      "traceability-changelog": "traceability", "traceability-decisions": "traceability", "traceability-templates": "traceability", "traceability-migrations": "traceability",
      "automation-ci": "automation", "automation-dependencies": "automation", "automation-delivery": "automation", "automation-scripts": "automation",
    } satisfies Record<RepositoryReportEvidenceId, RepositoryReportAxis>)[id],
    files,
    inventory,
    databaseLikely,
  ));
  assessments.push(commitAssessment(commitTraceability));
  return { assessments, databaseLikely };
}
