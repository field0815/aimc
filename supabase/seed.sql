-- ═══════════════════════════════════════════════════════════════
-- AI Semiconductor Market Calendar — 더미 시드 데이터
-- schema.sql 실행 후, SQL Editor 에서 실행하세요.
--
-- 날짜는 CURRENT_DATE 기준 상대 오프셋이라, 언제 실행해도
-- 오늘/이번 주/이번 달 화면에 콘텐츠가 보입니다.
-- 재실행해도 source_ref 충돌로 중복 없이 갱신(upsert)됩니다.
-- ═══════════════════════════════════════════════════════════════

-- ── 관심 종목 ──────────────────────────────────────────────────
insert into public.watchlist (ticker, company_name, sector, priority) values
  ('000660.KS','SK hynix','Memory',1),
  ('005930.KS','Samsung Electronics','Memory/Foundry',1),
  ('NVDA','NVIDIA','AI GPU',1),
  ('AVGO','Broadcom','AI ASIC/Networking',2),
  ('MU','Micron','Memory',2),
  ('TSM','TSMC','Foundry',1),
  ('META','Meta','Hyperscaler',2),
  ('MSFT','Microsoft','Hyperscaler',2),
  ('AMZN','Amazon','Hyperscaler',2),
  ('GOOGL','Alphabet','Hyperscaler',3),
  ('AMD','AMD','AI GPU',3)
on conflict (ticker) do nothing;

-- ── 이벤트 + 영향도 ────────────────────────────────────────────
-- 헬퍼: 이벤트 1건과 그 영향도들을 upsert 하는 함수
create or replace function pg_temp.seed_event(
  p_ref text, p_title text, p_category text, p_country text,
  p_date date, p_time text, p_importance int, p_status text,
  p_source text, p_url text,
  p_prev text, p_exp text, p_act text,
  p_summary text, p_bull text, p_bear text, p_note text,
  p_impacts jsonb  -- [{"t":"NVDA","c":"NVIDIA","s":5,"d":"unknown","n":"당사자"}]
) returns void language plpgsql as $$
declare v_id uuid; im jsonb;
begin
  insert into public.events
    (title,category,country,event_date,event_time,importance,status,source,source_url,source_ref,
     previous_value,expected_value,actual_value,summary,bull_case,bear_case,trading_note)
  values
    (p_title,p_category,p_country,p_date,p_time,p_importance,p_status,p_source,p_url,p_ref,
     p_prev,p_exp,p_act,p_summary,p_bull,p_bear,p_note)
  on conflict (source, source_ref) where source_ref is not null
  do update set event_date=excluded.event_date, status=excluded.status,
                actual_value=excluded.actual_value, updated_at=now()
  returning id into v_id;

  for im in select * from jsonb_array_elements(p_impacts) loop
    insert into public.event_impacts (event_id,ticker,company_name,impact_score,direction,note)
    values (v_id, im->>'t', im->>'c', (im->>'s')::int, coalesce(im->>'d','unknown'), im->>'n')
    on conflict (event_id,ticker) do update
      set impact_score=excluded.impact_score, direction=excluded.direction, note=excluded.note;
  end loop;
end; $$;

select pg_temp.seed_event(
  'seed:cpi', '미국 CPI (소비자물가지수)', 'economic', 'US',
  CURRENT_DATE - 2, '21:30 KST', 5, 'released', 'fred',
  'https://fred.stlouisfed.org/series/CPIAUCSL',
  '3.4% (YoY)', '3.4% (YoY)', '3.3% (YoY)',
  '헤드라인 CPI가 예상을 소폭 하회하며 디스인플레이션 재개 신호.',
  '물가 둔화 → 금리 인하 기대 → 고밸류 AI 반도체 멀티플 우호.',
  '근원물가 끈적임 지속 시 되돌림 가능.',
  '헤드라인보다 근원(Core) MoM 수치에 주목.',
  '[{"t":"NVDA","c":"NVIDIA","s":5,"d":"bullish"},
    {"t":"AVGO","c":"Broadcom","s":4,"d":"bullish"},
    {"t":"000660.KS","c":"SK하이닉스","s":3,"d":"bullish"},
    {"t":"005930.KS","c":"삼성전자","s":3,"d":"bullish"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:claims', '미국 주간 신규 실업수당청구건수', 'economic', 'US',
  CURRENT_DATE, '21:30 KST', 2, 'needs_check', 'fred',
  'https://fred.stlouisfed.org/series/ICSA',
  '23.8만', '24.0만', null,
  '노동시장 둔화 속도 점검용 주간 지표.', '청구 증가 → 금리 인하 기대.',
  '청구 급감 → 인하 지연 우려.', '4주 이동평균 추세가 중요.',
  '[{"t":"NVDA","c":"NVIDIA","s":2,"d":"neutral"},
    {"t":"005930.KS","c":"삼성전자","s":1,"d":"neutral"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:pce', '미국 PCE 물가지수 (연준 선호 지표)', 'economic', 'US',
  CURRENT_DATE + 1, '21:30 KST', 5, 'scheduled', 'fred',
  'https://fred.stlouisfed.org/series/PCEPI',
  '2.7% (YoY)', '2.6% (YoY)', null,
  '연준이 가장 중시하는 물가 지표.', '근원 PCE 둔화 → 인하 기대 강화.',
  'PCE 상회 → 인하 기대 후퇴.', 'FOMC 직전 주 발표라 영향 배가.',
  '[{"t":"NVDA","c":"NVIDIA","s":5,"d":"unknown"},
    {"t":"MSFT","c":"Microsoft","s":4,"d":"unknown"},
    {"t":"000660.KS","c":"SK하이닉스","s":3,"d":"unknown"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:opex', '분기 옵션 만기일 (트리플 위칭)', 'option_expiry', 'US',
  CURRENT_DATE + 4, '장 마감', 3, 'scheduled', 'manual', null,
  null, null, null,
  '주식·지수·옵션 동시 만기. 거래량 급증과 종가 왜곡 가능.',
  '감마 포지션에 따라 상방 쏠림 가능.', '대량 청산으로 변동성 급등 가능.',
  '방향성보다 변동성 자체에 주의.',
  '[{"t":"NVDA","c":"NVIDIA","s":3,"d":"neutral"},
    {"t":"AMD","c":"AMD","s":3,"d":"neutral"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:samsung', '삼성전자 2분기 잠정실적 발표', 'kr_disclosure', 'KR',
  CURRENT_DATE + 9, '오전 (장중)', 5, 'scheduled', 'opendart',
  'https://dart.fss.or.kr/',
  '영업이익 6.6조', '영업이익 8조 내외(컨센서스)', null,
  '메모리 반등과 HBM 진입 속도를 가늠하는 핵심 이벤트.',
  '메모리 흑자폭 확대·HBM3E 진척.', '파운드리 적자 지속·HBM 지연.',
  '잠정실적은 세부 부문 미공개. source=OpenDART 확정일과 대조 필요.',
  '[{"t":"005930.KS","c":"삼성전자","s":5,"d":"unknown","n":"당사자"},
    {"t":"000660.KS","c":"SK하이닉스","s":3,"d":"unknown"},
    {"t":"MU","c":"Micron","s":2,"d":"neutral"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:fomc', 'FOMC 정례회의 결과 및 기자회견', 'fomc', 'US',
  CURRENT_DATE + 12, '익일 03:00 KST', 5, 'scheduled', 'manual',
  'https://www.federalreserve.gov/',
  '5.25~5.50% 동결', '동결 예상', null,
  '기준금리 결정과 점도표 발표. 위험자산 전반의 방향을 좌우.',
  '비둘기적 점도표 → AI 반도체/빅테크 강세.',
  '매파적 톤 → 고밸류주 급락 위험.',
  '성명문→점도표→파월 회견 순으로 가격 출렁임. 발표 전 무리한 베팅 금지.',
  '[{"t":"NVDA","c":"NVIDIA","s":5,"d":"unknown"},
    {"t":"AVGO","c":"Broadcom","s":5,"d":"unknown"},
    {"t":"MSFT","c":"Microsoft","s":5,"d":"unknown"},
    {"t":"000660.KS","c":"SK하이닉스","s":4,"d":"unknown"},
    {"t":"005930.KS","c":"삼성전자","s":4,"d":"unknown"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:skhynix', 'SK하이닉스 2분기 실적 발표 (컨퍼런스콜)', 'earnings', 'KR',
  CURRENT_DATE + 18, '오전 (장중)', 5, 'scheduled', 'manual',
  'https://www.skhynix.com/ir/',
  '영업이익 2.9조', '영업이익 5조+ (컨센서스)', null,
  'HBM 리더십을 확인하는 핵심 실적. NVIDIA향 HBM3E 코멘트 주목.',
  'HBM 매출 비중·가격 상승·증설 계획.', '범용 DRAM 약세·경쟁 심화 우려.',
  '컨퍼런스콜 HBM 캐파/고객 코멘트가 핵심. 컨센은 출처별 상이 → 확인 필요.',
  '[{"t":"000660.KS","c":"SK하이닉스","s":5,"d":"unknown","n":"당사자"},
    {"t":"005930.KS","c":"삼성전자","s":4,"d":"unknown"},
    {"t":"NVDA","c":"NVIDIA","s":3,"d":"unknown"},
    {"t":"MU","c":"Micron","s":3,"d":"unknown"}]'::jsonb
);

select pg_temp.seed_event(
  'seed:nvda', 'NVIDIA 분기 실적 발표', 'earnings', 'US',
  CURRENT_DATE + 20, '익일 06:00 KST', 5, 'scheduled', 'fmp',
  'https://investor.nvidia.com/',
  'Data Center 매출 사상 최대', '매출 컨센 상회 기대', null,
  'AI 반도체 사이클의 바로미터. 데이터센터 매출·가이던스가 핵심.',
  '가이던스 상회·Blackwell 수요 강세 → AI 밸류체인 랠리.',
  '가이던스 둔화 → AI 피크아웃 논쟁, 전방위 조정.',
  'EPS보다 다음 분기 가이던스가 전부. 한국 메모리주 익일 동조 갭.',
  '[{"t":"NVDA","c":"NVIDIA","s":5,"d":"unknown","n":"당사자"},
    {"t":"AVGO","c":"Broadcom","s":4,"d":"unknown"},
    {"t":"TSM","c":"TSMC","s":4,"d":"unknown"},
    {"t":"000660.KS","c":"SK하이닉스","s":4,"d":"unknown","n":"HBM 공급사"},
    {"t":"AMD","c":"AMD","s":4,"d":"unknown"}]'::jsonb
);
