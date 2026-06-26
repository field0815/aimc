import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { DECLINE_META, DECLINE_TYPES } from "@/lib/decline";
import { DeclineChip } from "@/components/Badges";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// 하락 유형 가이드 — "이번 하락은 어떤 하락일까?"
// 사용자가 공포에 흔들리지 않고 하락의 성격을 이해하도록 돕는 교육 페이지.
// ─────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { t } = getI18n();

  return (
    <article className="space-y-6">
      <Link href="/" className="text-sm text-gray-400 hover:text-white">
        {t.detail.back}
      </Link>

      <header className="rounded-2xl border border-line bg-gradient-to-br from-accent/10 to-bg-card p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">{t.decline.guideTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">{t.decline.guideIntro}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {DECLINE_TYPES.map((type) => {
          const copy = t.decline.types[type];
          const meta = DECLINE_META[type];
          return (
            <section key={type} className="rounded-xl border border-line bg-bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <DeclineChip type={type} label={copy.label} />
                <span className="text-xs text-gray-400">
                  {t.decline.severityLabel[String(meta.severity) as "1" | "2" | "3"]}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-200">{copy.short}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">{copy.desc}</p>
            </section>
          );
        })}
      </div>

      <p className="rounded-xl border border-line bg-bg-soft p-4 text-xs leading-relaxed text-gray-500">
        {t.decline.guideOutro}
      </p>
    </article>
  );
}
