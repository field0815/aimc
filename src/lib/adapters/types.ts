import type { MarketEvent } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// 외부 데이터 소스 어댑터 공통 인터페이스
//
// 모든 어댑터는 "정규화된 이벤트(NormalizedEvent)"를 반환합니다.
// id/created_at 등 DB가 생성하는 필드는 제외하고, upsert 키로
// (source, source_ref) 조합을 사용해 중복을 방지합니다.
// ─────────────────────────────────────────────────────────────

/** DB upsert 직전의 정규화 이벤트 형태 */
export type NormalizedEvent = Omit<
  MarketEvent,
  "id" | "createdAt" | "updatedAt" | "impacts"
> & {
  /** 소스 내 고유 식별자 (중복 upsert 방지용). 예: "fmp:NVDA:2026-08-27" */
  sourceRef: string;
  /** 어댑터가 추정한 영향 종목 (선택) */
  impacts?: {
    ticker: string;
    companyName: string;
    impactScore: number;
    direction: MarketEvent["impacts"][number]["direction"];
    note?: string;
  }[];
};

export interface SyncResult {
  source: string;
  configured: boolean;
  fetched: number;
  events: NormalizedEvent[];
  error?: string;
}

export interface DataAdapter {
  /** 소스 식별자 (events.source 에 저장됨) */
  readonly source: MarketEvent["source"];
  /** API 키 등 환경변수가 설정돼 호출 가능한 상태인지 */
  isConfigured(): boolean;
  /** 지정 기간의 이벤트를 정규화해 반환. 미설정 시 빈 결과. */
  fetchEvents(opts: { from: string; to: string }): Promise<SyncResult>;
}

/** fetch 결과 (검증에서 원인 파악이 가능하도록 status/error 동반) */
export interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * fetch 헬퍼: throw 하지 않고 결과를 구조화해 반환.
 * - HTTP 비정상(4xx/5xx): ok=false + 응답 본문 일부를 error 로 노출
 * - 네트워크 예외: ok=false + 예외 메시지
 * 호출부에서 무료 플랜 제한/잘못된 키/쿼터 초과 등을 식별할 수 있습니다.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    if (!res.ok) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 240);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `HTTP ${res.status}${body ? `: ${body}` : ""}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** FMP 등은 200 응답에 에러 객체를 담는 경우가 있음. 배열이 아닌 경우의 메시지 추출 */
export function extractApiError(data: unknown): string | undefined {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const msg = obj["Error Message"] ?? obj["error"] ?? obj["message"];
    if (typeof msg === "string") return msg;
  }
  return undefined;
}
