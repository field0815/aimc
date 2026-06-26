import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

// ─────────────────────────────────────────────────────────────
// 동기화 엔드포인트
//   POST /api/sync          → 수동 새로고침 버튼이 호출
//   GET  /api/sync?token=X  → Vercel Cron (하루 1회) 호출용
//
// SYNC_SECRET 이 설정돼 있으면 token 검증을 수행합니다.
// (더미 모드에서는 Supabase가 없어 dry-run 결과만 반환)
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret || secret === "change-me") return true; // 미설정 시 개방 (로컬/더미)
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-sync-token");
  return token === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sync failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
