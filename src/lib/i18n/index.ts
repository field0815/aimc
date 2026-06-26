import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

// ─────────────────────────────────────────────────────────────
// 서버 컴포넌트용 i18n 헬퍼.
// 쿠키에서 현재 언어를 읽어 사전을 반환합니다.
// ─────────────────────────────────────────────────────────────

/** 현재 요청의 언어 (쿠키 기반, 기본 ko) */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** 현재 언어의 사전 + 언어 코드 */
export function getI18n(): { locale: Locale; t: Dictionary } {
  const locale = getLocale();
  return { locale, t: getDictionary(locale) };
}

export type { Dictionary };
export { getDictionary };
