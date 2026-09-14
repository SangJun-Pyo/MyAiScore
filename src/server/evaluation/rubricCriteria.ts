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

export const RUBRIC_CRITERIA_VERSION = "scoring-rubric-v0.3.1-criteria-table-v1";

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
    title: "문제 정의와 목표 부합",
    weight: 15,
    question: "문제·제약·완료 조건을 정하고 목표 달성 여부를 확인했는가?",
    levels: [
      { level: 1, behavior: "실제 요청은 있었지만 목적·완료 조건이 모호했고, 무엇을 해결했는지 확인하지 않은 행동이 드러남", counterExample: "요청 기록 자체가 없으면 not_observed" },
      { level: 2, behavior: "목표나 입출력을 지정하고 정상 사례로 기본 완료 여부를 확인함", counterExample: "README에 목표만 사후 작성한 것은 실제 사용 근거가 아님" },
      { level: 3, behavior: "제약·범위·완료 조건을 작업 지시에 연결하고 결과를 각 조건에 대조함", counterExample: "큰 기능 목록만 있고 충족 여부를 확인하지 않았으면 부족" },
      { level: 4, behavior: "핵심 가정을 검토해 필요하면 범위를 조정하고, 목표·제약에 맞는 성공과 실패 사례로 해결 여부를 확인함", counterExample: "복잡한 요구사항이나 긴 기획서 자체는 가산점이 아님" },
    ],
  },
  {
    code: "B",
    title: "맥락 제공과 위임",
    weight: 20,
    question: "필요한 맥락과 작업 경계를 AI에 전달했는가?",
    levels: [
      { level: 1, behavior: "필요한 코드·제약을 누락한 채 위임하고 그로 인한 오해를 방치한 과정이 확인됨", counterExample: "AGENTS.md가 없다는 사실만으로 낮은 레벨을 주지 않음" },
      { level: 2, behavior: "관련 파일이나 요구사항과 작업 범위를 전달하고 기본 오류를 보완함", counterExample: "저장소 전체를 무작정 제공한 것만으로 충분하다고 보지 않음" },
      { level: 3, behavior: "관련 맥락·인터페이스·완료 조건을 선별해 전달하고 피드백으로 맥락을 갱신함", counterExample: "단순 작업을 불필요하게 분해할 필요 없음" },
      { level: 4, behavior: "중요한 의존성과 맥락 누락을 사전에 관리하고 결과를 확인해 필요한 맥락만 보완함", counterExample: "에이전트 수나 프롬프트 길이는 단계 기준이 아님" },
    ],
  },
  {
    code: "C",
    title: "도구·접근 적합성",
    weight: 15,
    question: "문제 규모에 맞는 방법을 선택하고 불필요한 복잡성을 피했는가?",
    levels: [
      { level: 1, behavior: "제약에 맞지 않는 도구나 과도한 구조를 선택했고 발생한 문제를 다루지 않은 과정이 확인됨", counterExample: "도구가 한 개이거나 무료라는 이유로 감점하지 않음" },
      { level: 2, behavior: "기본 도구가 문제에 맞고 핵심 작업을 수행했지만 한계·부담 검토는 제한적임", counterExample: "설정 파일 존재만으로 사용과 적합성을 판정하지 않음" },
      { level: 3, behavior: "속도·비용·유지보수·검증 가능성 중 관련 제약을 고려해 적절한 방법을 선택함", counterExample: "모든 도구를 실험하거나 비용 숫자를 반드시 기록할 필요 없음" },
      { level: 4, behavior: "관련 대안과 실제 결과를 근거로 최소한의 충분한 방법을 선택·조정하고 한계에 대응함", counterExample: "복잡한 오케스트레이션 자체나 사후의 멋진 설명만으로 최고 단계가 아님" },
    ],
  },
  {
    code: "D",
    title: "검증의 질",
    weight: 30,
    question: "AI 결과의 중요한 실패 가능성을 적절한 근거로 검증했는가?",
    levels: [
      { level: 1, behavior: "AI 결과를 검증 없이 수용하거나 명백한 실패를 무시한 행동이 구체적 과정 자료로 확인됨", counterExample: "테스트·로그를 제출하지 않은 것만으로 검증 생략을 단정하지 않음" },
      { level: 2, behavior: "실행·수동 확인·리뷰 등으로 정상 사례를 확인했으나 주요 실패 조건은 놓침", counterExample: "테스트 파일만 있고 사용·결과 근거가 없으면 부족할 수 있음" },
      { level: 3, behavior: "중요한 실패 사례를 재현 가능한 테스트·리뷰·실측으로 확인하고 결과를 해석함", counterExample: "자동화 테스트가 필수는 아님. 작업에 적절한 재현 가능한 수동 검증도 인정" },
      { level: 4, behavior: "위험에 맞는 반례로 AI 결과를 반박해 보고, 변경 후 회귀와 남은 한계까지 확인함", counterExample: "테스트 수·커버리지 숫자·CI 파일 존재만으로 최고 단계가 아님" },
    ],
  },
  {
    code: "E",
    title: "인간의 판단·수정·반복",
    weight: 20,
    question: "제안을 근거로 채택·거절·수정하고 결과를 확인했는가?",
    levels: [
      { level: 1, behavior: "제안의 명백한 문제를 인식할 기회가 있었지만 근거 검토 없이 수용한 과정이 확인됨", counterExample: "수정 커밋이 없다는 이유만으로 무비판 수용으로 판정하지 않음" },
      { level: 2, behavior: "제안을 검토해 채택·수정·거절하고 간단한 이유를 제시함", counterExample: "근거 없이 \"직접 판단했다\"는 주장만으로 판정하지 않음" },
      { level: 3, behavior: "대안·제약·검증 결과에 따라 수용 여부를 결정하고 그 효과를 확인함", counterExample: "코드를 많이 수정하거나 AI 제안을 거절한 횟수는 가산점이 아님" },
      { level: 4, behavior: "실패 원인을 구분하고 위임·접근·검증 방식을 조정하거나, 충분한 근거로 그대로 채택하고 종료함", counterExample: "AI 제안이 맞았다면 의도적인 거절·반복을 만들 필요 없음" },
    ],
  },
];
