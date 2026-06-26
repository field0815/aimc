# 🛰️ AI Semiconductor Market Calendar

AI 반도체 투자자를 위한 **증시 이벤트 캘린더** 웹앱입니다.
오늘/이번 주/이번 달의 증시 영향 이벤트를 확인하고, 각 이벤트가
**SK하이닉스·삼성전자·NVIDIA·Broadcom·Micron·TSMC·Meta·Microsoft·Amazon**에
어떤 영향을 주는지 정리해서 보여줍니다.

> ⚠️ 이 앱은 **일정·발표값·영향도·주의점을 정리하는 정보 도구**입니다.
> 매수/매도를 추천하지 않습니다. 출처가 불명확한 이벤트는 "확인필요"로 표시됩니다.

---

## ✨ 핵심 특징

- **API 키 없이도 즉시 실행** — 더미 데이터로 모든 화면이 완전히 동작합니다.
- **어댑터 구조** — FMP / FRED / OpenDART 어댑터가 분리돼 있어, `.env`에 키만
  넣으면 실데이터 동기화가 활성화됩니다.
- **다크모드 / 모바일(갤럭시) 우선 / 카드형 UI / PWA 매니페스트** 포함.

### 기술 스택
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Vercel 배포 기준

### 다국어 (i18n)
- **기본 한국어**, 헤더 우측 `KO / EN` 토글로 영어 전환 (쿠키 `NEXT_LOCALE`에 저장).
- UI 라벨/네비/필터/대시보드 문구가 번역됩니다. 사전: [`src/lib/i18n/dictionaries.ts`](src/lib/i18n/dictionaries.ts).
- 참고: 이벤트 본문(제목/해설/시나리오)은 **데이터**라 저장된 언어로 노출됩니다(현재 한국어).
  종목명은 영어 모드에서 영문 표기로 자동 매핑됩니다.

### 아이콘 교체
- `public/icon.svg`가 원본(임시 placeholder)입니다. 새 디자인으로 교체 후:
  ```bash
  npm run gen:icons   # icon.svg → icon-192.png / icon-512.png / apple-touch-icon.png 재생성
  ```

### 화면
- **대시보드** (`/`) — 이번 주 위험도, FOMC/CPI·PCE/반도체 실적 D-day, 오늘의 이벤트,
  이번 주 위험 TOP 5, 발표완료(실제치) 이벤트, 종목·AI반도체 빠른 필터
- **이벤트 목록** (`/events`) — 기간·중요도·카테고리·종목·AI반도체 필터 (URL 공유 가능)
- **이벤트 상세** (`/events/[id]`) — 발표값(이전/예상/실제), 해설, 호재/악재 시나리오,
  매매 주의점, 종목별 0~5 영향도 표

---

## 1. 설치 방법

요구사항: **Node.js 18.18+ (권장 20+)**

```bash
cd ai-semi-market-calendar
npm install
```

## 2. 환경변수 예시

`.env.example`을 복사해서 `.env.local`을 만듭니다. **아무 값도 안 채워도 더미
데이터로 동작합니다.**

```bash
cp .env.example .env.local
```

```dotenv
# 데이터 소스: dummy(기본) | supabase
DATA_SOURCE=dummy

# Supabase (선택)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 동기화(쓰기) 전용, 절대 클라이언트 노출 금지

# 외부 API (선택 — 넣으면 해당 어댑터 자동 활성화)
FMP_API_KEY=
FRED_API_KEY=
OPENDART_API_KEY=

# 동기화 보안 (Vercel Cron 보호)
SYNC_SECRET=change-me
```

| 변수 | 용도 | 발급처 |
|---|---|---|
| `FMP_API_KEY` | 실적/경제 캘린더 | https://site.financialmodelingprep.com/developer/docs |
| `FRED_API_KEY` | 경제지표 릴리스 날짜 보조 확인 | https://fred.stlouisfed.org/docs/api/api_key.html |
| `OPENDART_API_KEY` | 한국 기업 공시 | https://opendart.fss.or.kr/ |

### API 키 연동 검증 (`/api/diagnostics`)
키를 넣은 뒤 **연동이 실제로 되는지** 점검하는 읽기 전용 엔드포인트입니다(DB 미기록).

```bash
npm run dev
# 브라우저 또는 curl 로:
curl http://localhost:3000/api/diagnostics
```

- 각 어댑터를 실제 호출해 `configured / ok / fetched / sample(샘플 3건) / error`를 반환합니다.
- 키 미설정 소스는 `configured:false`로 안전하게 skip 됩니다.
- 응답에는 환경변수의 **존재 여부(true/false)만** 노출하고 키 값은 절대 노출하지 않습니다.
- `ok:false`면 `error` 메시지로 원인(키 오류/쿼터/스키마 변경)을 파악하세요.

> FRED release_id(CPI=10, 고용=50, PCE=54)와 OpenDART corp_code(삼성=00126380,
> SK하이닉스=00164779)는 공식값으로 검증되어 있습니다.

#### 실키 검증 결과 (2026-06, 무료 플랜 기준)
| 소스 | 상태 | 비고 |
|---|---|---|
| **FRED** | ✅ 정상 | CPI/고용/PCE 릴리스 일정 수집 |
| **FMP** | ✅ 실적만 | `stable/earnings-calendar` 동작(EPS 추정치 포함). 단 `economic-calendar`는 **유료 전용**이라 무료 플랜에서 자동 skip → **경제지표는 FRED가 담당** |
| **OpenDART** | ✅ 정상 | 공시는 과거 데이터라 **최근 30일 창**으로 조회, 임원·소유상황 등 루틴 공시는 자동 필터 |

> ⚠ FMP v3(`earning_calendar`)는 2025-08-31 폐기됨. 본 프로젝트는 신규 `stable/earnings-calendar`
> 엔드포인트와 신규 필드명(`epsActual`/`epsEstimated`)을 사용합니다.

## 3. Supabase 테이블 생성 방법

> 더미 데이터로만 쓸 거면 이 단계는 **건너뛰어도 됩니다.**

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. **SQL Editor**에서 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행
   → `events`, `event_impacts`, `watchlist`, `manual_events` 테이블 + RLS 정책 생성
3. (선택) [`supabase/seed.sql`](supabase/seed.sql)을 실행해 더미 이벤트를 DB에 주입
   - 날짜가 `CURRENT_DATE` 기준 상대값이라 언제 실행해도 화면에 콘텐츠가 보입니다.
4. **Settings → API**에서 아래 값을 `.env.local`에 복사
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
5. `.env.local`에 `DATA_SOURCE=supabase`로 변경

> 설계 메모: 읽기는 `anon`(RLS로 SELECT만 허용), **쓰기는 `service_role` 키로만**
> 가능합니다. 자동 동기화 데이터(`events`)와 수동 입력 데이터(`manual_events`)는
> 테이블을 분리해 관리합니다.

## 4. 로컬 실행 방법

```bash
npm run dev
# http://localhost:3000
```

기타 명령:

```bash
npm run build       # 프로덕션 빌드
npm run start       # 빌드 결과 실행
npm run typecheck   # 타입 체크
npm run sync        # (선택) CLI 동기화 — Supabase/키 미설정 시 dry-run 출력
```

## 5. Vercel 배포 방법

1. GitHub에 푸시 후 [vercel.com](https://vercel.com)에서 **New Project → Import**
2. **Environment Variables**에 `.env.local`의 값을 등록
   (더미 데모만 할 거면 `DATA_SOURCE=dummy`만 둬도 됩니다)
3. **Deploy**
4. 자동 동기화는 [`vercel.json`](vercel.json)의 Cron이 매일 새벽(UTC 20:00 = KST 05:00)
   `/api/sync`를 호출합니다. 보호하려면 `SYNC_SECRET`을 설정하고, Cron 호출에
   `?token=<SYNC_SECRET>`을 붙이거나 헤더 `x-sync-token`을 사용하세요.

## 6. API 키 없이 더미 데이터로 실행하는 방법

가장 간단한 경로입니다:

```bash
npm install
npm run dev      # .env.local 없이 그대로 실행해도 됩니다
```

- `DATA_SOURCE`가 `dummy`이거나 Supabase 키가 없으면 [`src/lib/data/dummy.ts`](src/lib/data/dummy.ts)의
  데이터를 사용합니다.
- 더미 이벤트의 날짜는 **오늘 기준 상대값**으로 생성되어, 대시보드의 오늘/이번 주
  화면에 항상 콘텐츠가 채워집니다.
- 상단의 **새로고침** 버튼은 `/api/sync`를 호출하지만, Supabase가 없으면 안전하게
  **dry-run**(수집만, 저장 안 함) 결과를 보여줍니다.

---

## 🧱 프로젝트 구조

```
ai-semi-market-calendar/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # 대시보드
│  │  ├─ events/page.tsx          # 이벤트 목록 + 필터
│  │  ├─ events/[id]/page.tsx     # 이벤트 상세 + 영향도 표
│  │  ├─ api/sync/route.ts        # 동기화 엔드포인트 (POST 수동 / GET cron)
│  │  └─ layout.tsx, globals.css
│  ├─ components/                 # EventCard, Filters, Badges, RefreshButton …
│  └─ lib/
│     ├─ types.ts, constants.ts
│     ├─ utils/date.ts
│     ├─ data/
│     │  ├─ repository.ts         # 단일 데이터 접근점 (DB↔더미 자동 전환 + 필터/대시보드)
│     │  ├─ dummy.ts              # 더미 시드
│     │  └─ mappers.ts            # DB row ↔ 도메인 모델
│     ├─ supabase/server.ts       # Supabase 클라이언트 (미설정 시 null → 더미 폴백)
│     ├─ adapters/                # 외부 API 어댑터 (FMP/FRED/OpenDART)
│     │  ├─ types.ts              # DataAdapter 인터페이스, NormalizedEvent
│     │  ├─ fmp.ts, fred.ts, opendart.ts, index.ts
│     └─ sync.ts                  # 어댑터 오케스트레이션 + upsert + 상태 규칙
├─ supabase/schema.sql, seed.sql
├─ scripts/sync.ts                # CLI 동기화
└─ vercel.json                    # Cron 설정
```

### 새 데이터 소스 추가하기
1. `src/lib/adapters/`에 `DataAdapter` 인터페이스를 구현한 파일 추가
2. `fetchEvents()`에서 외부 응답을 `NormalizedEvent[]`로 정규화 (`sourceRef`로 중복 방지)
3. [`src/lib/adapters/index.ts`](src/lib/adapters/index.ts)의 `ADAPTERS` 배열에 등록

### 상태(status) 규칙 (`src/lib/sync.ts`)
- 실제치 존재 → **발표완료(released)**
- 발표 당일/지났는데 실제치 없음 → **확인필요(needs_check)**
- 그 외 미래 → **예정(scheduled)**

---

## 📌 설계 원칙
- 매수/매도 추천 앱이 아니라, **일정·발표값·영향도·주의점 정리** 도구.
- 출처 불명확 이벤트는 **확인필요** 상태로 유지.
- 실적일은 API마다 다를 수 있어 **`source` 필드를 반드시 기록**.
- 자동 동기화(`events`)와 수동 입력(`manual_events`) 데이터를 **분리**.
