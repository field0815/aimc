// ─────────────────────────────────────────────────────────────
// CLI 동기화 스크립트 (`npm run sync`)
// 로컬에서 .env.local 을 읽어 어댑터 → Supabase 동기화를 실행합니다.
// API 키가 없으면 dry-run 결과만 출력합니다.
// ─────────────────────────────────────────────────────────────
import { loadEnvConfig } from "@next/env";
import path from "node:path";

// next 의 env 로더로 .env.local 등을 로드
loadEnvConfig(path.resolve(process.cwd()));

async function main() {
  // 동적 import: env 로드 이후에 모듈을 평가해야 키가 반영됨
  const { runSync } = await import("../src/lib/sync");
  const summary = await runSync();
  console.log("── Sync Summary ──────────────────────────────");
  console.log(`기간      : ${summary.window.from} ~ ${summary.window.to}`);
  console.log(`모드      : ${summary.dryRun ? "DRY-RUN (Supabase 미설정)" : "WRITE"}`);
  console.log(`수집 합계 : ${summary.totalFetched}`);
  console.log(`반영(upsert): ${summary.upserted}`);
  console.table(summary.perSource);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
