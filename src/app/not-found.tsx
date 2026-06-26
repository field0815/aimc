import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = getI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-4xl">🛰️</p>
      <h1 className="text-xl font-bold text-white">{t.detail.notFoundTitle}</h1>
      <p className="text-sm text-gray-400">{t.detail.notFoundDesc}</p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t.detail.notFoundCta}
      </Link>
    </div>
  );
}
