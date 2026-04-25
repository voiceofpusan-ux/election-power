# CampVote — 실시간 경선/본선 투표 집계 시스템
## VS Code Claude Extension 코딩용 프로젝트 문서

---

## 1. 프로젝트 개요

전국 캠프가 공통으로 사용하는 실시간 투표 현황 집계 웹앱.
현장책임자가 스마트폰으로 담당 동의 투표수를 입력하면
캠프 본부 대시보드에 즉시 반영되는 멀티테넌트 SaaS 구조.

### 핵심 가치
- 선관위 공식 발표 전 투표 진행 현황을 실시간으로 파악
- 저조 지역 즉시 파악 → 당일 독려 가능
- 경선/본선 모두 지원 (본선은 개표마감 기능 추가)
- 캠프별 고유 URL 하나로 전체 운영

---

## 2. 사용자 역할

| 역할 | 설명 | 사용 화면 |
|------|------|-----------|
| 캠프 관리자 | 캠프 생성·설정·URL 발급 | admin.html |
| 본부입력담당자 | 담당 동 투표수 입력 (현장 보고자로부터 수신 후 입력) | input.html |
| 본부 모니터 | 실시간 대시보드 열람 | dashboard.html |
| 정당 어드민 | 담당 정당 전체 캠프 현황 열람 + 비밀번호 변경 | party-admin.html |
| 슈퍼어드민 | 정당 어드민 비밀번호 설정·재설정 | super-admin.html |

---

## 3. 기술 스택

| 구분 | 선택 | 비고 |
|------|------|------|
| 프론트엔드 | Vanilla HTML/CSS/JS | 서버 불필요 |
| DB/백엔드 | Supabase (PostgreSQL) | 실시간 내장 무료 |
| 실시간 | Supabase Realtime | WebSocket 자동 갱신 |
| 주소 | 행안부 도로명주소 API | 동 목록 조회 무료 (선택) |
| 차트 | Chart.js 4.x CDN | 막대차트·혼합차트 |
| 엑셀 내보내기 | SheetJS 0.20.3 CDN | 대시보드 → xlsx |
| QR | qrcode.js CDN | URL QR 생성 |
| 배포 | Vercel | GitHub 연동 자동 배포 |

**배포 URL**: https://election-power.vercel.app

---

## 4. 디렉토리 구조

```
election-power/
├── CLAUDE.md                       ← 이 파일 (Claude가 항상 참조)
├── index.html                      ← 진입점·역할 선택 (비밀번호 모달 포함)
├── admin.html                      ← 캠프 생성·설정 (4단계 폼)
├── dashboard.html                  ← 본부 실시간 대시보드 (다크 테마)
├── input.html                      ← 본부입력담당자 투표수 입력
├── party-admin.html                ← 정당 어드민 전체 캠프 현황 대시보드
├── super-admin.html                ← 슈퍼어드민 (정당 어드민 비밀번호 관리)
├── make_songpa_excel.py            ← 송파구 오프라인 집계 엑셀 생성 스크립트 (Python)
├── 송파구_투표집계.xlsx             ← make_songpa_excel.py 출력물
├── js/
│   ├── config.js      ← Supabase 키·환경변수 (CONFIG 객체)
│   ├── supabase.js    ← Supabase 클라이언트 초기화 → 전역 변수 `db`
│   ├── address.js     ← 시군구 영문 슬러그·동 목록·단위 조회
│   └── utils.js       ← 공통 유틸 (해시·슬러그·폰포맷·토스트 등)
├── css/
│   └── style.css      ← 공통 스타일 (모바일 우선, 정당별 CSS 변수)
└── data/
    └── dongs.json     ← 선거구별 동 목록 (flat 배열 또는 단위별 중첩 구조)
```

> **주의**: `dashboard.html`, `input.html`, `party-admin.html`, `super-admin.html`의
> JS 로직은 별도 `.js` 파일 없이 각 HTML 파일 내 `<script>` 태그에 인라인으로 작성됨.

---

## 5. 캠프 고유 URL 구조

```
패턴: index.html?slug={slug}

예시:
?slug=dongdaemun-guhoeui-gap-minjoo   → 동대문구 국회의원 갑 / 민주당
?slug=songpa-guhoeui-eul-people       → 송파구 국회의원 을 / 국민의힘
?slug=seoul-sijang-minjoo             → 서울시장 / 민주당
?slug=songpa-gucheong-minjoo          → 송파구청장 / 민주당
?slug=gangnam-sieui-gap-people        → 강남구 시의원 갑 / 국민의힘
?slug=songpa-gueui-ga-minjoo          → 송파구 구의원 가 / 민주당
```

### 정당 코드 (PARTY_MAP)
```
민주당    → minjoo
국민의힘  → people
```

### 직위 코드 (POSITION_MAP)
```
서울시장 → sijang
구청장   → gucheong
시의원   → sieui
구의원   → gueui
국회의원 → guhoeui
```

### 단위 코드 (UNIT_MAP)
```
국회의원/시의원: 갑→gap, 을→eul, 병→byeong, 정→jeong, 무→moo
구의원:         가→ga,  나→na,  다→da,     라→ra
서울시장/구청장: 단위 없음
```

### 직위별 단위 목록 (POSITION_UNITS)
```javascript
const POSITION_UNITS = {
  '서울시장':  [],
  '구청장':   [],
  '시의원':   ['갑','을','병'],
  '구의원':   ['가','나','다','라'],
  '국회의원': ['갑','을','병','정','무']
}
```

### 슬러그 생성 규칙 (utils.js)
```javascript
function generateSlug(sigunguEng, position, unit, party) {
  const pos = POSITION_MAP[position] || ''
  const u   = unit ? (UNIT_MAP[unit] || '') : ''
  const p   = PARTY_MAP[party] || party
  return [sigunguEng, pos, u, p].filter(Boolean).join('-')
}
```

---

## 6. Supabase 테이블 설계

### 6-1. camps (캠프 — 테넌트 단위)

```sql
CREATE TABLE camps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  election_type TEXT NOT NULL,       -- '경선' | '본선'
  party         TEXT NOT NULL CHECK (party IN ('minjoo','people')),
  party_name    TEXT NOT NULL,
  sido          TEXT NOT NULL,
  sigungu       TEXT NOT NULL,
  sigungu_eng   TEXT NOT NULL,
  district      TEXT NOT NULL,
  unit          TEXT NOT NULL,
  hq_password   TEXT NOT NULL,       -- SHA-256 해시
  target_votes  INTEGER DEFAULT 0,
  reporter_limit INTEGER DEFAULT 0,  -- 현장 순위 표시 인원수 (0=전체)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 6-2. submissions (투표수 제출 — 이력 누적)

```sql
CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id           UUID REFERENCES camps(id) ON DELETE CASCADE,
  reporter_name     TEXT NOT NULL,       -- 본부입력담당자 이름
  reporter_phone    TEXT NOT NULL,       -- 010-XXXX-XXXX
  dong              TEXT NOT NULL,
  vote_count        INTEGER NOT NULL,    -- 음수 허용 (취소 보정용)
  vote_type         TEXT DEFAULT '당원' CHECK (vote_type IN ('당원','안심번호')),
  field_worker_name TEXT DEFAULT '',     -- 투표현황보고자 이름
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  ip_address        TEXT
);

ALTER TABLE submissions REPLICA IDENTITY FULL;

CREATE INDEX idx_submissions_camp_id  ON submissions(camp_id);
CREATE INDEX idx_submissions_dong     ON submissions(camp_id, dong);
CREATE INDEX idx_submissions_phone    ON submissions(camp_id, reporter_phone);
CREATE INDEX idx_submissions_time     ON submissions(submitted_at DESC);
```

> **주의**: `vote_count`는 음수 허용 — 오입력 취소 시 음수 보정값을 제출하여 누적합에서 차감

### 6-3. closings (개표마감 — 본선 전용)

```sql
CREATE TABLE closings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID REFERENCES camps(id) ON DELETE CASCADE,
  dong            TEXT NOT NULL,
  reporter_name   TEXT NOT NULL,
  reporter_phone  TEXT NOT NULL,
  closed_at       TIMESTAMPTZ DEFAULT NOW(),
  cancelled       BOOLEAN DEFAULT false
);
```

### 6-4. party_settings (정당 어드민 비밀번호)

```sql
CREATE TABLE party_settings (
  party         TEXT PRIMARY KEY,   -- 'minjoo' | 'people'
  password_hash TEXT NOT NULL       -- SHA-256(비밀번호 + HQ_PW_SALT)
);

ALTER TABLE party_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_select" ON party_settings FOR SELECT USING (true);
CREATE POLICY "ps_insert" ON party_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "ps_update" ON party_settings FOR UPDATE USING (true);

-- 초기 비밀번호 12345678 (해시값 = SHA-256('12345678' + 'campvote2026'))
INSERT INTO party_settings (party, password_hash) VALUES
  ('minjoo', '4ff6d2dac5386a6592d04d5ed6945c7b97f913b8b3ef45ad1d3e4c0611549c2f'),
  ('people', '4ff6d2dac5386a6592d04d5ed6945c7b97f913b8b3ef45ad1d3e4c0611549c2f')
ON CONFLICT (party) DO UPDATE SET password_hash = EXCLUDED.password_hash;
```

### 6-5. Row Level Security

```sql
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camps_select" ON camps FOR SELECT USING (true);
CREATE POLICY "camps_insert" ON camps FOR INSERT WITH CHECK (true);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON submissions FOR INSERT WITH CHECK (true);

ALTER TABLE closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closings_all" ON closings FOR ALL USING (true);
```

### 6-6. Realtime 활성화

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
```

### 6-7. 방송사 API용 공개 뷰 (전화번호 제외)

```sql
-- 방송사에 anon key + camp_id 제공 시 이 뷰 URL을 안내
-- GET /rest/v1/submissions_public?camp_id=eq.{camp_id}
CREATE OR REPLACE VIEW submissions_public AS
SELECT
  id, camp_id, reporter_name,
  dong, vote_count, vote_type,
  field_worker_name, submitted_at
FROM submissions;
-- reporter_phone 제외
```

---

## 7. 화면별 상세 설계

### 7-1. index.html — 진입·역할 선택

```javascript
const slug = new URLSearchParams(location.search).get('slug')
const { data: camp } = await db.from('camps').select('*').eq('slug', slug).single()
```

```
┌──────────────────────────────┐
│  서울특별시 동대문구 국회의원갑│
│  민주당 경선                  │
│                              │
│  [  본 부  ]  [ 현장책임자 ] │
└──────────────────────────────┘

본부 → 비밀번호 입력 모달 → dashboard.html?slug={slug}
현장 → input.html?slug={slug}
```

---

### 7-2. input.html — 본부입력담당자 투표수 입력

**수집 정보**
```
1. 본부입력담당자 이름 (datalist — DB+localStorage 자동완성)
2. 전화번호 (선택 시 010-****-XXXX 마스킹, 수정 버튼으로 해제)
3. 투표 동 (드롭다운 — 선택 시 단위 레이블 표시)
4. 투표현황보고자 이름 (datalist — localStorage 자동완성)
5. 투표 유형 토글: [당원투표] [일반(안심번호)]
6. 투표자수
```

**입력 유효성 검사**
- 투표자수 0 입력 금지
- `submitVotes()`에서만 양수 강제 — `doInsert()`는 음수 허용 (취소 보정용)
- 동일 전화번호·다른 이름 차단 (`checkDuplicatePhone`)
- 기존 등록자 선택 시 중복 체크 생략 (`selectedPhone` 세팅됨)

**주요 변수**
```javascript
let voteType      = '당원'       // '당원' | '안심번호'
let reporterMap   = {}           // name → fullPhone (DB + localStorage 병합)
let selectedPhone = null         // 목록 선택 시 실제 전화번호 (마스킹 해제용)
```

**localStorage 키**
```
cv_input_{slug}      → { name, phone, dong }  입력값 복원
cv_reporters_{slug}  → [{ name, phone }, ...]  본부입력담당자 목록
cv_fw_names_{slug}   → ['이름', ...]           투표현황보고자 이름 목록
```

**주요 기능**
- 본부입력담당자 선택 시 전화번호 자동 세팅 + 마스킹 (010-****-XXXX)
- 동 선택 시 단위 레이블 표시 (`getUnitByDong()`)
- 실적 버튼 2개: [📊 본부입력담당자 실적] [📊 투표현황보고자 실적]
  - `openRanking('reporter')` / `openRanking('fieldworker')`
- 제출 이력 카드: 각 항목에 **취소** 버튼 → `cancelSubmission()` → `-vote_count` 보정 제출
- 개표마감 (본선 `election_type === '본선'`일 때만 표시)

**Supabase INSERT**
```javascript
await db.from('submissions').insert({
  camp_id, reporter_name, reporter_phone,
  dong, vote_count,
  vote_type,           // '당원' | '안심번호'
  field_worker_name,   // 투표현황보고자 이름
  ip_address
})
```

---

### 7-3. dashboard.html — 본부 실시간 대시보드

**디자인**: 다크 테마 (`background: #0f172a`)

**헤더 우측 컨트롤**
```
[자동갱신 꺼짐/15초/30초/60초 ▼]  [📥 엑셀]  [🔄 새로고침]
```
- 기본값 30초, `setRefreshInterval(seconds)`로 변경
- 탭 전환 시 활성 탭 데이터 자동 갱신

**탭 구성 (5개)**

| 탭 | 내용 |
|----|------|
| 실시간 현황 | 단위 카드 그리드 (차트 + 동 테이블) |
| 담당자별 통계 | reporter_phone 기준 누적합, 순위 정렬, 전화 모달 |
| 투표현황보고자 통계 | field_worker_name 기준 누적합, 순위 정렬 |
| 시간별 추세 | 시간별 bar(당원·안심번호) + 누적 line 혼합 차트 |
| 저조 동 독려 | 투표수 낮은 순 정렬, 최근 담당자 + 전화 버튼 |

**동별 테이블 컬럼**
```
동명 | 당원(노랑) | 안심번호(초록) | 합계 | 입력담당자 | 현황보고자 | 시각
```
- 미보고 동: 빨간 점 + 빨간 글씨
- 보고된 동: 투표수 내림차순 정렬, 미보고는 하단

**단위 차트 (Chart.js 그룹 막대)**
```javascript
datasets: [
  { label: '당원',    data: dangVotes,   backgroundColor: dangColors },  // 빨강/초록/파랑
  { label: '안심번호', data: anshimVotes, backgroundColor: '#f97316' },  // 주황 고정
  { label: '합계',    data: totalVotes,  backgroundColor: '#64748b' }    // 회색 고정
]
// 범례: 당원 파랑(#3b82f6) 고정 (generateLabels로 오버라이드)
// 당원 bar 색상: 0표=#ef4444, 목표80%이상=#10b981, 진행중=#3b82f6
```

**데이터 집계 방식 (누적 합산)**
```javascript
const latest = {}
data.forEach(row => {
  if (!latest[row.dong]) {
    latest[row.dong] = { ...row, vote_count: 0, dang_count: 0, anshim_count: 0 }
  }
  latest[row.dong].vote_count += row.vote_count
  if (row.vote_type === '안심번호') latest[row.dong].anshim_count += row.vote_count
  else                              latest[row.dong].dang_count   += row.vote_count
  if (row.submitted_at > (latest[row.dong]._latestTime || '')) {
    latest[row.dong].submitted_at      = row.submitted_at
    latest[row.dong].reporter_name     = row.reporter_name
    latest[row.dong].reporter_phone    = row.reporter_phone
    latest[row.dong].field_worker_name = row.field_worker_name
    latest[row.dong]._latestTime       = row.submitted_at
  }
})
latestDongData = latest  // 저조 동 독려 탭에서 재사용
```

**엑셀 내보내기 (SheetJS 0.20.3)**
- 시트 3개: 동별현황 / 담당자별통계 / 투표현황보고자
- 모든 시트: 1행 고정 (`!freeze`) + 자동필터 (`!autofilter`)
- 파일명: `{district}_{party}_{YYYYMMDD_HHMM}.xlsx`

---

### 7-4. admin.html — 캠프 생성·설정

**4단계 폼 흐름**
```
STEP 1. 선거 종류 + 정당 선택
STEP 2. 직위 + 지역 + 단위 선택
STEP 3. 목표 득표수 + 본부 비밀번호
STEP 4. 생성 완료 (URL 복사·카카오 공유·QR·안내 문자)
```

---

### 7-5. party-admin.html — 정당 어드민 대시보드

**접근 URL**: `party-admin.html?party=minjoo` 또는 `?party=people`

**화면 구성**
- 요약 카드: 총 캠프수 / 총 누적투표수 / 평균달성률 / 위험캠프
- 캠프 카드: 빨강(달성률<60%) / 노랑(60~80%) / 초록(≥80%)
- 탭: 캠프 현황 / 시간별 추세 차트
- 비밀번호 변경 버튼

---

### 7-6. super-admin.html — 슈퍼어드민

- `CONFIG.SUPER_ADMIN_PW_HASH`와 SHA-256 비교 (비어있으면 무비밀번호 초기 진입)
- 정당 어드민 비밀번호 설정·재설정 → `party_settings` upsert
- 슈퍼어드민 비밀번호 해시 생성 도구

---

### 7-7. make_songpa_excel.py — 오프라인 집계 도구

송파구 갑/을/병 오프라인 투표 집계용 Excel 파일 생성 (Python + openpyxl)
- 시트 1: 갑/을/병 단위별 동 목록, 당원/일반 입력 셀, 자동합계 수식
- 시트 2: 입력값 기반 막대 그래프 (단위별 비교, 동별 세부)
- 실행: `python make_songpa_excel.py` → `송파구_투표집계.xlsx` 생성

---

## 8. 환경변수 (js/config.js)

```javascript
const CONFIG = {
  SUPABASE_URL:        'https://zmdqihmmsglzegzuyisy.supabase.co',
  SUPABASE_ANON:       'eyJ...',  // anon key (service_role 절대 금지)
  JUSO_API_KEY:        '',        // 행안부 API 키 (선택 — 없으면 dongs.json 사용)
  BASE_URL:            location.origin,
  HQ_PW_SALT:          'campvote2026',
  SUPER_ADMIN_PW_HASH: ''         // 슈퍼어드민 비밀번호 해시 (설정 후 배포)
}
```

---

## 9. 인증 흐름 요약

| 역할 | 비밀번호 저장 위치 | 검증 방법 | 세션 유지 |
|------|-------------------|----------|----------|
| 본부 모니터 | `camps.hq_password` (Supabase) | SHA-256(입력 + salt) 비교 | sessionStorage |
| 정당 어드민 | `party_settings.password_hash` (Supabase) | SHA-256(입력 + salt) 비교 | sessionStorage |
| 슈퍼어드민 | `CONFIG.SUPER_ADMIN_PW_HASH` (config.js) | SHA-256(입력) 비교 | sessionStorage |

- 해시 salt: `HQ_PW_SALT = 'campvote2026'`
- 슈퍼어드민은 salt 없이 SHA-256 직접 비교

---

## 10. Supabase 클라이언트 (js/supabase.js)

```javascript
const { createClient } = window.supabase  // CDN UMD
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON)
// 전역 변수명: db (모든 HTML에서 db.from(...) 사용)
```

---

## 11. 공통 유틸 (js/utils.js)

```javascript
const UNIT_MAP     = { '갑':'gap','을':'eul','병':'byeong','정':'jeong','무':'moo','가':'ga','나':'na','다':'da','라':'ra' }
const PARTY_MAP    = { '민주당':'minjoo', '국민의힘':'people' }
const POSITION_MAP = { '서울시장':'sijang','구청장':'gucheong','시의원':'sieui','구의원':'gueui','국회의원':'guhoeui' }
const POSITION_UNITS = { '서울시장':[],'구청장':[],'시의원':['갑','을','병'],'구의원':['가','나','다','라'],'국회의원':['갑','을','병','정','무'] }

function generateSlug(sigunguEng, position, unit, party) { ... }
async function hashPassword(password) { ... }
async function verifyPassword(input, stored) { ... }
function formatPhone(value) { ... }
function isValidPhone(phone) { ... }
function showToast(msg, type='success') { ... }
function getParam(key) { ... }
function formatTime(iso) { ... }
function formatNumber(n) { ... }
async function getClientIP() { ... }
```

---

## 12. 주소 유틸 (js/address.js)

```javascript
const SIGUNGU_ENG = { '동대문구':'dongdaemun', '송파구':'songpa', ... }

async function loadDongs(sigungu)       // string[] — 전체 동 목록 (flat)
async function getUnitByDong(sigungu, dong)  // string | null — 동 → 단위
async function getDongsByUnit(sigungu)  // {갑:[...], 을:[...]} | null
```

**dongs.json 두 가지 구조**
```json
"동대문구": ["용신동","제기동", ...]

"송파구": {
  "갑": ["풍납1동","방이1동", ...],
  "을": ["잠실본동","삼전동", ...],
  "병": ["거여1동","마천1동", ...]
}
```

---

## 13. 자주 쓰는 Supabase 쿼리

```javascript
// 캠프 조회
const { data: camp } = await db.from('camps').select('*').eq('slug', slug).single()

// 투표수 제출
const { error } = await db.from('submissions').insert({
  camp_id, reporter_name, reporter_phone, dong,
  vote_count,          // 양수 (정상) 또는 음수 (취소 보정)
  vote_type,           // '당원' | '안심번호'
  field_worker_name,
  ip_address
})

// 대시보드 — 동별 누적합용 (vote_type, field_worker_name 포함)
const { data } = await db.from('submissions')
  .select('dong, reporter_name, reporter_phone, vote_count, vote_type, field_worker_name, submitted_at')
  .eq('camp_id', campId)
  .order('submitted_at', { ascending: false })

// 내 제출 이력
const { data } = await db.from('submissions')
  .select('dong, vote_count, vote_type, field_worker_name, submitted_at')
  .eq('camp_id', campId).eq('reporter_phone', phone)
  .order('submitted_at', { ascending: false }).limit(10)

// 방송사 API용 (전화번호 제외 뷰)
const { data } = await db.from('submissions_public')
  .select('dong, vote_count, vote_type, submitted_at')
  .eq('camp_id', campId)
  .order('submitted_at', { ascending: false })

// 정당 비밀번호 조회
const { data } = await db.from('party_settings')
  .select('password_hash').eq('party', party).maybeSingle()

// Realtime 구독
const channel = db.channel(`camp-${campId}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'submissions',
    filter: `camp_id=eq.${campId}`
  }, handleNewRow)
  .subscribe()
window.addEventListener('beforeunload', () => db.removeChannel(channel))
```

---

## 14. 정당별 CSS 변수 (css/style.css)

```css
.party-minjoo { --party-primary: #004EA2; --party-light: #E3F0FF; }
.party-people { --party-primary: #C9151E; --party-light: #FFE8E8; }
```

> dashboard.html, party-admin.html, super-admin.html은 다크 테마 별도 CSS (인라인 `<style>` 블록 사용)

---

## 15. 구현 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | Supabase DB (camps, submissions, closings) | ✅ 완료 |
| Phase 2 | input.html — 투표수 입력 | ✅ 완료 |
| Phase 3 | dashboard.html — 다크 테마 실시간 대시보드 | ✅ 완료 |
| Phase 4 | index.html — 진입·역할 선택 | ✅ 완료 |
| Phase 5 | admin.html — 캠프 생성 | ✅ 완료 |
| Phase 6 | party-admin.html — 정당 어드민 대시보드 + 시간별 추세 탭 | ✅ 완료 |
| Phase 7 | super-admin.html — 슈퍼어드민 | ✅ 완료 |
| Phase 8 | Vercel 배포 (GitHub 자동 배포) | ✅ 완료 |
| Phase 9 | 당원/안심번호 구분 입력·집계·차트 | ✅ 완료 |
| Phase 10 | 투표현황보고자 입력 필드 + 통계 탭 | ✅ 완료 |
| Phase 11 | 본부입력담당자 다중 사용자 지원 (DB목록·마스킹) | ✅ 완료 |
| Phase 12 | 대시보드 엑셀 내보내기 (SheetJS 3시트) | ✅ 완료 |
| Phase 13 | 대시보드 자동갱신 주기 선택 (15s/30s/60s) | ✅ 완료 |
| Phase 14 | 시간별 추세 탭 (캠프 대시보드) | ✅ 완료 |
| Phase 15 | 저조 동 독려 탭 | ✅ 완료 |
| Phase 16 | 입력값 취소 기능 (음수 보정 제출) | ✅ 완료 |
| Phase 17 | 방송사 API용 submissions_public 뷰 | ⬜ SQL 준비됨 (필요 시 적용) |
| Phase 18 | 행안부 API + JUSO_API_KEY 설정 | ⬜ 미완 (선택사항) |

---

## 16. 주요 코딩 규칙

- UI 레이블: 한국어 / 변수·함수명: 영문 camelCase / 주석: 한국어
- async/await 사용 (Promise.then 지양)
- 에러: try/catch 필수 + 사용자 친화 메시지
- 모든 버튼 최소 48px 높이 (모바일 터치)
- 숫자 입력: `type="number"` + `inputmode="numeric"`
- 전화번호: `type="tel"` + `inputmode="numeric"`
- anon key만 프론트 노출 (service_role 절대 금지)
- 모든 쿼리에 camp_id 필터 필수
- Realtime 구독: 화면 이탈 시 반드시 `db.removeChannel(channel)`
- 비밀번호: SHA-256 해시 후 저장 (salt: `campvote2026`)
- Supabase 클라이언트 전역 변수명: `db` (supabase 아님)
- 투표수: `submitVotes()`에서 0·음수 차단 / `doInsert()`는 음수 허용 (취소 보정용)
- 대시보드 집계: 최신값이 아닌 **전체 누적합** 사용 (vote_type별 분리 포함)
- 자동갱신 타이머: `clearInterval(autoRefreshTimer)` 반드시 beforeunload에서 정리

---

*CampVote CLAUDE.md v4.0 | 2026.04 — 당원/안심번호 구분, 투표현황보고자, 엑셀출력, 자동갱신, 추세차트, 저조동독려, 입력취소, 방송사API 반영*
*이 파일을 VS Code Claude Extension이 자동 참조합니다*
