import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// 서버 전용 Supabase 클라이언트.
// 환경변수가 없으면 null 을 반환 → 호출부에서 더미 데이터로 폴백.
// ─────────────────────────────────────────────────────────────

let cached: SupabaseClient | null | undefined;

/** 읽기용(anon) 클라이언트. 미설정 시 null */
export function getSupabaseServer(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cached = url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;
  return cached;
}

/** 쓰기용(service role) 클라이언트. 동기화 작업 전용. 미설정 시 null */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** 현재 데이터 소스가 supabase 인지 (env 우선, 키 존재 여부로 보강) */
export function useSupabase(): boolean {
  if (process.env.DATA_SOURCE === "dummy") return false;
  return getSupabaseServer() !== null;
}
