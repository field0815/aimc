"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────
// 언어 토글 (KO / EN). 쿠키에 저장 후 서버 컴포넌트를 새로 렌더.
// ─────────────────────────────────────────────────────────────

export function LocaleToggle({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center overflow-hidden rounded-md border border-line text-xs">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          disabled={pending}
          aria-pressed={current === loc}
          className={`px-2 py-1 font-medium uppercase transition-colors ${
            current === loc
              ? "bg-accent text-white"
              : "bg-bg-card text-gray-400 hover:text-white"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
