"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// ─────────────────────────────────────────────────────────────
// 장중 수동 새로고침 버튼.
// /api/sync 를 호출해 동기화를 시도하고, 결과 요약을 보여줍니다.
// Supabase 미설정(더미 모드)에서는 dry-run 결과를 안내합니다.
// ─────────────────────────────────────────────────────────────

export function RefreshButton({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (json.dryRun) {
        setMsg(t.refresh.dummyMode.replace("{n}", String(json.totalFetched ?? 0)));
      } else if (json.ran) {
        setMsg(t.refresh.done.replace("{n}", String(json.upserted ?? 0)));
      } else {
        setMsg(json.error ?? t.refresh.check);
      }
      startTransition(() => router.refresh());
    } catch {
      setMsg(t.refresh.fail);
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || pending;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-card px-3 py-1.5 text-sm text-gray-200 hover:border-accent disabled:opacity-50"
      >
        <span className={busy ? "animate-spin" : ""}>↻</span>
        {busy ? t.common.syncing : t.common.refresh}
      </button>
      {msg && <span className="text-xs text-gray-400">{msg}</span>}
    </div>
  );
}
