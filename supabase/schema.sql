-- ═══════════════════════════════════════════════════════════════
-- AI Semiconductor Market Calendar — Supabase 스키마
-- Supabase Dashboard > SQL Editor 에 붙여넣어 실행하세요.
-- (더미 데이터로만 실행할 경우 이 파일은 필요 없습니다.)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── events : 캘린더 이벤트 ──────────────────────────────────────
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       text not null check (category in
                   ('economic','fomc','earnings','kr_disclosure',
                    'semi_event','rebalancing','option_expiry')),
  country        text not null default 'US',
  event_date     date not null,
  event_time     text,
  importance     int  not null default 3 check (importance between 1 and 5),
  status         text not null default 'scheduled' check (status in
                   ('scheduled','released','needs_check')),
  source         text not null default 'manual' check (source in
                   ('manual','fmp','fred','opendart')),
  source_url     text,
  -- 자동 동기화 중복 방지 키 (어댑터의 sourceRef 저장)
  source_ref     text,
  previous_value text,
  expected_value text,
  actual_value   text,
  summary        text,
  bull_case      text,
  bear_case      text,
  trading_note   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 자동 동기화 upsert 충돌 키 (manual 입력은 source_ref NULL 허용)
create unique index if not exists events_source_ref_uniq
  on public.events (source, source_ref)
  where source_ref is not null;

create index if not exists events_date_idx on public.events (event_date);
create index if not exists events_category_idx on public.events (category);

-- ── event_impacts : 종목별 영향도 ──────────────────────────────
create table if not exists public.event_impacts (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  ticker       text not null,
  company_name text not null,
  impact_score int  not null default 0 check (impact_score between 0 and 5),
  direction    text not null default 'unknown' check (direction in
                 ('bullish','bearish','neutral','unknown')),
  note         text
);

-- 동기화 시 (event, ticker) 단위 upsert
create unique index if not exists event_impacts_event_ticker_uniq
  on public.event_impacts (event_id, ticker);

-- ── watchlist : 관심 종목 ──────────────────────────────────────
create table if not exists public.watchlist (
  id           uuid primary key default gen_random_uuid(),
  ticker       text not null unique,
  company_name text not null,
  sector       text not null default '',
  priority     int  not null default 3
);

-- ── manual_events : 수동 입력 (FOMC/옵션만기/리밸런싱/실적예상일 등) ──
-- 자동 동기화 데이터(events)와 물리적으로 분리해 관리.
-- 운영 시 트리거/배치로 events 에 머지하거나, UNION 뷰로 노출할 수 있습니다.
create table if not exists public.manual_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_date  date not null,
  category    text not null,
  importance  int  not null default 3 check (importance between 1 and 5),
  note        text,
  created_at  timestamptz not null default now()
);

-- ── updated_at 자동 갱신 트리거 ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ── RLS : 읽기는 공개(anon), 쓰기는 service_role 만 ────────────
alter table public.events        enable row level security;
alter table public.event_impacts enable row level security;
alter table public.watchlist     enable row level security;
alter table public.manual_events enable row level security;

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
  for select using (true);

drop policy if exists "public read impacts" on public.event_impacts;
create policy "public read impacts" on public.event_impacts
  for select using (true);

drop policy if exists "public read watchlist" on public.watchlist;
create policy "public read watchlist" on public.watchlist
  for select using (true);

drop policy if exists "public read manual" on public.manual_events;
create policy "public read manual" on public.manual_events
  for select using (true);

-- 쓰기 정책은 두지 않습니다 → service_role 키(RLS 우회)로만 동기화 쓰기 가능.
