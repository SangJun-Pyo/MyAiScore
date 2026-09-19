import type { Locale } from "./locale";
import type { RepositoryRecommendationEffort, RepositoryReportScoreSignalId } from "../shared/repositoryReport";
import type { RepositoryCohortComparison, RepositoryCohortSizeBand } from "../shared/repositoryCohort";

const koSizeBands: Record<RepositoryCohortSizeBand, string> = { small: "소형", medium: "중형", large: "대형" };
const enSizeBands: Record<RepositoryCohortSizeBand, string> = { small: "small", medium: "medium", large: "large" };

const koActions: Record<RepositoryReportScoreSignalId, { title: string; description: string }> = {
  "context-readme": { title: "README의 출발점 선명하게 하기", description: "목적, 설치, 사용법, 확인 방법을 짧은 섹션으로 연결해 보세요." },
  "context-guidance": { title: "작업 지침 한 장 만들기", description: "AI와 사람이 따라야 할 범위, 금지 사항, 완료 기준을 작업 지침에 남겨 보세요." },
  "context-docs": { title: "문서 진입점 정리하기", description: "흩어진 설명을 문서 목차와 관련 파일 링크로 연결해 보세요." },
  "context-metadata": { title: "프로젝트 메타데이터 보강하기", description: "프로젝트 이름, 목적, 실행 명령을 루트 설정에서 확인하기 쉽게 정리해 보세요." },
  "context-contracts": { title: "인터페이스 계약 남기기", description: "주요 API나 데이터 형식의 입력, 출력, 오류 조건을 계약 파일로 고정해 보세요." },
  "context-reproducibility": { title: "개발 환경 고정하기", description: "런타임과 도구 버전을 저장소 설정으로 고정해 같은 환경을 재현하기 쉽게 만들어 보세요." },
  "verification-tests": { title: "핵심 동작을 테스트로 고정하기", description: "가장 중요한 정상·실패 동작을 자동 테스트로 남겨 보세요." },
  "verification-config": { title: "검사 설정 명시하기", description: "타입, 린트, 커버리지 규칙을 저장소 설정으로 명시해 보세요." },
  "verification-entrypoint": { title: "한 번에 실행되는 검사 명령 만들기", description: "테스트와 정적 검사를 누구나 같은 명령으로 시작할 수 있게 연결해 보세요." },
  "verification-test-substance": { title: "테스트의 검증문 강화하기", description: "중복되지 않는 사례와 실제 결과를 확인하는 검증문을 추가해 보세요." },
  "verification-test-breadth": { title: "테스트 분포 넓히기", description: "핵심 소스 영역마다 대표 동작을 확인하는 테스트를 고르게 배치해 보세요." },
  "verification-edge-cases": { title: "실패·경계 사례 추가하기", description: "빈 값, 잘못된 입력, 예외와 경계값 중 중요한 사례를 테스트로 남겨 보세요." },
  "verification-static-analysis": { title: "정적 검사 엄격하게 연결하기", description: "타입과 린트 규칙을 강화하고 실행 명령에서 실제로 적용되게 해 보세요." },
  "verification-coverage": { title: "커버리지 기준 세우기", description: "커버리지를 측정하고 핵심 영역에 최소 기준을 설정해 보세요." },
  "traceability-changelog": { title: "변경 기록 시작하기", description: "사용자에게 영향을 주는 변경을 짧은 변경 기록으로 누적해 보세요." },
  "traceability-decisions": { title: "결정 이유 연결하기", description: "중요한 선택 하나를 배경, 대안, 결과, 관련 파일과 함께 기록해 보세요." },
  "traceability-templates": { title: "이슈·PR 템플릿 만들기", description: "문제, 변경 이유, 검증 결과를 빠뜨리지 않도록 템플릿을 추가해 보세요." },
  "traceability-migrations": { title: "데이터 변경 단계 기록하기", description: "스키마 변경과 되돌림 순서를 마이그레이션으로 추적 가능하게 만들어 보세요." },
  "traceability-ownership": { title: "검토 책임 경로 정하기", description: "중요한 코드 영역별 검토 책임을 저장소 설정에 연결해 보세요." },
  "traceability-commit-practice": { title: "커밋에 변경 이유 남기기", description: "제목을 구체적으로 쓰고, 필요한 변경에는 이유나 이슈 참조를 덧붙여 보세요." },
  "automation-ci": { title: "반복 검사를 CI에 연결하기", description: "테스트와 품질 검사를 변경마다 자동으로 실행하게 만들어 보세요." },
  "automation-ci-tests": { title: "CI에서 테스트 실행하기", description: "로컬 테스트 명령을 CI 작업에 연결해 변경마다 실행되게 해 보세요." },
  "automation-ci-quality": { title: "CI에 품질 검사 더하기", description: "타입, 린트, 빌드 검사를 CI에서 함께 실행해 보세요." },
  "automation-dependencies": { title: "의존성 갱신 자동화하기", description: "정기적인 의존성 업데이트와 검토 흐름을 자동화해 보세요." },
  "automation-delivery": { title: "배포 절차 재현 가능하게 만들기", description: "빌드와 배포에 필요한 환경·명령을 설정 파일로 고정해 보세요." },
  "automation-scripts": { title: "반복 작업을 스크립트로 묶기", description: "자주 반복하는 준비·검사 작업을 이름 있는 명령 하나로 묶어 보세요." },
  "automation-environment": { title: "개발 환경 자동 구성하기", description: "도구 설치와 환경 준비를 설정이나 컨테이너로 자동화해 보세요." },
};

const enActions: typeof koActions = Object.fromEntries(Object.keys(koActions).map(id => [id, {
  title: ({
    "context-readme": "Clarify the README entry point", "context-guidance": "Add working instructions", "context-docs": "Organize a documentation entry point", "context-metadata": "Complete project metadata", "context-contracts": "Record interface contracts", "context-reproducibility": "Pin the development environment",
    "verification-tests": "Lock down core behavior with tests", "verification-config": "Make check configuration explicit", "verification-entrypoint": "Create one check command", "verification-test-substance": "Strengthen test assertions", "verification-test-breadth": "Broaden test distribution", "verification-edge-cases": "Add failure and boundary cases", "verification-static-analysis": "Tighten static analysis", "verification-coverage": "Set a coverage gate",
    "traceability-changelog": "Start a change log", "traceability-decisions": "Connect one decision", "traceability-templates": "Add issue and PR templates", "traceability-migrations": "Track data changes", "traceability-ownership": "Define review ownership", "traceability-commit-practice": "Explain why in commits",
    "automation-ci": "Connect checks to CI", "automation-ci-tests": "Run tests in CI", "automation-ci-quality": "Run quality checks in CI", "automation-dependencies": "Automate dependency updates", "automation-delivery": "Make delivery reproducible", "automation-scripts": "Script a repeated task", "automation-environment": "Automate environment setup",
  } as Record<string, string>)[id]!,
  description: "Strengthen this signal with one small, reviewable repository change, then run the relevant check.",
}])) as typeof koActions;

const ko = {
  provisional: "일부 항목은 측정 범위가 부족해 잠정 결과입니다.",
  measuredQuality: (points: number, max: number, substance: number) => `${points}/${max}점 · 내용 실질 ${substance}%`,
  unmeasuredQuality: (points: number, max: number) => `${points}/${max}점 · 내용 측정 보류`,
  commitPractice: "커밋 설명 습관",
  commitPracticeDescription: "고정된 커밋의 최근 조상 기록에서 제목의 구체성·고유성·범위·이유·참조를 집계했어요. 원문은 보존하지 않아요.",
  diagnosticsHeading: "구조·위생 진단",
  hygieneSummary: (temporary: number, generated: number, secretLike: number) => `임시 파일 ${temporary}개 · 생성물 후보 ${generated}개 · 비밀정보 가능 경로 ${secretLike}개`,
  structureSummary: (oversized: number, over400: number, over800: number) => `큰 소스 후보 ${oversized}개 · 선택 파일 중 400줄 초과 ${over400}개 · 800줄 초과 ${over800}개`,
  recommendationEffort: { quick: "빠르게 시작", medium: "보통 작업", large: "큰 작업" } satisfies Record<RepositoryRecommendationEffort, string>,
  recommendation: (signalId: RepositoryReportScoreSignalId) => koActions[signalId],
  recommendationPath: (path: string) => `연결된 근거: ${path}`,
  cohortPending: "고정 SHA 공개 저장소 코호트가 준비되기 전에는 순위나 백분위를 표시하지 않습니다.",
  cohortHeading: "v1 참조 코호트",
  cohortPosition: (cohort: RepositoryCohortComparison) => cohort.topPercentFrom === 0
    ? `상위 ${cohort.topPercentTo}% 이내`
    : `상위 ${cohort.topPercentFrom}~${cohort.topPercentTo}% 구간`,
  cohortDetails: (cohort: RepositoryCohortComparison) => `${koSizeBands[cohort.sizeBand]}·${cohort.coverageStatus === "complete" ? "수집 완료" : "일부 수집"} 공개 저장소 ${cohort.comparisonSampleSize}개와 비교한 참고 위치입니다. 전체 코호트는 고정 SHA 50개이며 GitHub 전체 순위가 아닙니다.`,
  noRecommendations: "현재 측정 가능한 신호에서는 총점을 높이는 추가 작업을 찾지 못했습니다.",
};

const en: typeof ko = {
  provisional: "This is a provisional result because some signals could not be measured within the collection scope.",
  measuredQuality: (points, max, substance) => `${points}/${max} points · ${substance}% substance`,
  unmeasuredQuality: (points, max) => `${points}/${max} points · content measurement withheld`,
  commitPractice: "Commit explanation practice",
  commitPracticeDescription: "Aggregates specificity, distinctness, scope, rationale, and references from recent ancestors of the fixed commit. Raw messages are not retained.",
  diagnosticsHeading: "Structure and hygiene diagnostics",
  hygieneSummary: (temporary, generated, secretLike) => `${temporary} temporary files · ${generated} generated candidates · ${secretLike} secret-like paths`,
  structureSummary: (oversized, over400, over800) => `${oversized} large-source candidates · ${over400} selected files over 400 lines · ${over800} over 800 lines`,
  recommendationEffort: { quick: "Quick", medium: "Medium", large: "Larger task" },
  recommendation: signalId => enActions[signalId],
  recommendationPath: path => `Connected evidence: ${path}`,
  cohortPending: "Ranks and percentiles stay hidden until a fixed-SHA public repository cohort is available.",
  cohortHeading: "v1 reference cohort",
  cohortPosition: cohort => cohort.topPercentFrom === 0
    ? `Within the top ${cohort.topPercentTo}%`
    : `Top ${cohort.topPercentFrom}–${cohort.topPercentTo}% band`,
  cohortDetails: cohort => `A reference position among ${cohort.comparisonSampleSize} ${enSizeBands[cohort.sizeBand]}, ${cohort.coverageStatus} public repositories. The full cohort contains 50 fixed-SHA repositories and is not a GitHub-wide ranking.`,
  noRecommendations: "No additional action would raise the score among the currently measurable signals.",
};

export function repositoryV2Presentation(locale: Locale) {
  return locale === "ko" ? ko : en;
}
