import { NextResponse } from "next/server";
import { ADAPTERS } from "@/lib/adapters";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { addDaysISO, todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// 연동 검증(diagnostics) 엔드포인트  —  GET /api/diagnostics
//
// 각 외부 어댑터를 실제로 호출해 "키가 유효한지 / 응답이 파싱되는지"를
// 점검합니다. DB에는 절대 쓰지 않습니다(읽기 전용 검증).
//
// 키 미설정 어댑터는 configured:false 로 안전하게 skip 됩니다.
// 응답에는 환경변수의 "존재 여부(boolean)"만 노출하며 값은 노출하지 않습니다.
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SourceDiag {
  source: string;
  configured: boolean;
  ok: boolean;
  fetched: number;
  sample: { title: string; eventDate: string; status: string }[];
  error?: string;
  ms: number;
}

export async function GET() {
  const from = todayISO();
  const to = addDaysISO(14);

  const env = {
    DATA_SOURCE: process.env.DATA_SOURCE ?? "(unset → dummy)",
    FMP_API_KEY: Boolean(process.env.FMP_API_KEY),
    FRED_API_KEY: Boolean(process.env.FRED_API_KEY),
    OPENDART_API_KEY: Boolean(process.env.OPENDART_API_KEY),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  // 어댑터별 라이브 점검
  const sources: SourceDiag[] = [];
  for (const adapter of ADAPTERS) {
    const started = Date.now();
    if (!adapter.isConfigured()) {
      sources.push({
        source: adapter.source,
        configured: false,
        ok: true,
        fetched: 0,
        sample: [],
        error: "API 키 미설정 → skip",
        ms: 0,
      });
      continue;
    }
    try {
      const result = await adapter.fetchEvents({ from, to });
      sources.push({
        source: adapter.source,
        configured: true,
        ok: !result.error,
        fetched: result.fetched,
        sample: result.events.slice(0, 3).map((e) => ({
          title: e.title,
          eventDate: e.eventDate,
          status: e.status,
        })),
        error: result.error,
        ms: Date.now() - started,
      });
    } catch (e) {
      sources.push({
        source: adapter.source,
        configured: true,
        ok: false,
        fetched: 0,
        sample: [],
        error: e instanceof Error ? e.message : String(e),
        ms: Date.now() - started,
      });
    }
  }

  // Supabase 연결 점검 (읽기/쓰기 키 존재 + 간단 SELECT)
  const supabase = {
    readClient: Boolean(getSupabaseServer()),
    writeClient: Boolean(getSupabaseAdmin()),
    readOk: false as boolean,
    readError: undefined as string | undefined,
  };
  const sb = getSupabaseServer();
  if (sb) {
    const { error } = await sb.from("events").select("id").limit(1);
    supabase.readOk = !error;
    supabase.readError = error?.message;
  }

  const allConfigured = sources.filter((s) => s.configured);
  return NextResponse.json({
    window: { from, to },
    env,
    mode: env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "dummy",
    summary: {
      adaptersConfigured: allConfigured.length,
      adaptersOk: allConfigured.filter((s) => s.ok).length,
      totalFetched: sources.reduce((n, s) => n + s.fetched, 0),
    },
    sources,
    supabase,
    hint:
      allConfigured.length === 0
        ? "API 키가 없습니다. .env.local 에 FMP/FRED/OPENDART 키를 넣고 새로고침하면 여기서 실시간 검증됩니다."
        : "configured=true 인 소스의 fetched/sample 을 확인하세요. ok=false 면 error 메시지로 원인 파악.",
  });
}
