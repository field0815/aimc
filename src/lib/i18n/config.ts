// ─────────────────────────────────────────────────────────────
// 다국어(i18n) 설정
//   기본 언어: 한국어(ko). 영어(en)는 옵션으로 헤더에서 전환.
//   언어는 쿠키(NEXT_LOCALE)에 저장되어 서버 렌더에 반영됩니다.
// ─────────────────────────────────────────────────────────────

export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ko" || value === "en";
}

/** 언어 토글 메뉴에 표시할 라벨 */
export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};
