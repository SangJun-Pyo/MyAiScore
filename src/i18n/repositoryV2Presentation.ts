import type { Locale } from "./locale";

const ko = {
  provisional: "일부 항목은 측정 범위가 부족해 잠정 결과입니다.",
  measuredQuality: (points: number, max: number, substance: number) => `${points}/${max}점 · 내용 실질 ${substance}%`,
  unmeasuredQuality: (points: number, max: number) => `${points}/${max}점 · 내용 측정 보류`,
  commitPractice: "커밋 설명 습관",
  commitPracticeDescription: "고정된 커밋의 최근 조상 기록에서 제목의 구체성·고유성·범위·이유·참조를 집계했어요. 원문은 보존하지 않아요.",
  diagnosticsHeading: "구조·위생 진단",
  hygieneSummary: (temporary: number, generated: number, secretLike: number) => `임시 파일 ${temporary}개 · 생성물 후보 ${generated}개 · 비밀정보 가능 경로 ${secretLike}개`,
  structureSummary: (oversized: number, over400: number, over800: number) => `큰 소스 후보 ${oversized}개 · 선택 파일 중 400줄 초과 ${over400}개 · 800줄 초과 ${over800}개`,
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
};

export function repositoryV2Presentation(locale: Locale) {
  return locale === "ko" ? ko : en;
}
