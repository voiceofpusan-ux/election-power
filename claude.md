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
| 현장책임자 | 담당 동 투표수 입력 | input.html |
| 본부 모니터 | 실시간 대시보드 열람 | dashboard.html |

---

## 3. 기술 스택

| 구분 | 선택 | 비고 |
|------|------|------|
| 프론트엔드 | Vanilla HTML/CSS/JS | 서버 불필요 |
| DB/백엔드 | Supabase (PostgreSQL) | 실시간 내장 무료 |
| 실시간 | Supabase Realtime | WebSocket 자동 갱신 |
| 주소 | 행안부 도로명주소 API | 동 목록 조회 무료 (선택) |
| 차트 | Chart.js 4.x CDN | 막대차트 |
| QR | qrcode.js CDN | URL QR 생성 |
| 배포 | Netlify / GitHub Pages | 무료 정적 호스팅 |

---

## 4. 디렉토리 구조

```
election-power/
├── claude.md                       ← 이 파일 (Claude가 항상 참조)
├── index.html                      ← 진입점·역할 선택 (비밀번호 모달 포함)
├── admin.html                      ← 캠프 생성·설정 (4단계 폼)
├── dashboard.html                  ← 본부 실시간 대시보드 (다크 테마)
├── input.html                      ← 현장책임자 투표수 입력
├── 투표모니터링시스템통합x.html     ← 레거시 통합 파일 (미사용)
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

> **주의**: `dashboard.html`, `input.html`의 JS 로직은 별도 `.js` 파일 없이
> 각 HTML 파일 내 `<script>` 태그에 인라인으로 작성됨.

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

// 예:
// generateSlug('dongdaemun', '국회의원', '갑', '민주당')
//   → 'dongdaemun-guhoeui-gap-minjoo'
// generateSlug('seoul', '서울시장', '', '민주당')
//   → 'seoul-sijang-minjoo'
```

---

## 6. Supabase 테이블 설계

### 6-1. camps (캠프 — 테넌트 단위)

```sql
CREATE TABLE camps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  -- 예: 'dongdaemun-guhoeui-gap-minjoo'
  election_type TEXT NOT NULL,       -- '경선' | '본선'
  party         TEXT NOT NULL CHECK (party IN ('minjoo','people')),
  party_name    TEXT NOT NULL,       -- '민주당' | '국민의힘'
  sido          TEXT NOT NULL,       -- '서울특별시'
  sigungu       TEXT NOT NULL,       -- '동대문구' (서울시장이면 '서울특별시')
  sigungu_eng   TEXT NOT NULL,       -- 'dongdaemun' (서울시장이면 'seoul')
  district      TEXT NOT NULL,       -- '동대문구 국회의원갑' | '서울시장'
  unit          TEXT NOT NULL,       -- '갑' | '' (단위 없는 직위)
  hq_password   TEXT NOT NULL,       -- 본부 비밀번호 SHA-256 해시
  target_votes  INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 6-2. submissions (투표수 제출 — 이력 누적)

```sql
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID REFERENCES camps(id) ON DELETE CASCADE,
  reporter_name   TEXT NOT NULL,
  reporter_phone  TEXT NOT NULL,     -- 010-XXXX-XXXX
  dong            TEXT NOT NULL,
  vote_count      INTEGER NOT NULL CHECK (vote_count >= 0),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  ip_address      TEXT
);

ALTER TABLE submissions REPLICA IDENTITY FULL;

CREATE INDEX idx_submissions_camp_id  ON submissions(camp_id);
CREATE INDEX idx_submissions_dong     ON submissions(camp_id, dong);
CREATE INDEX idx_submissions_phone    ON submissions(camp_id, reporter_phone);
CREATE INDEX idx_submissions_time     ON submissions(submitted_at DESC);
```

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

### 6-4. Row Level Security

```sql
ALTER TABLE camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camps_select" ON camps FOR SELECT USING (true);
CREATE POLICY "camps_insert" ON camps FOR INSERT WITH CHECK (true);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON submissions FOR INSERT WITH CHECK (true);

ALTER TABLE closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closings_all"    ON closings FOR ALL USING (true);
```

### 6-5. Realtime 활성화

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
```

---

## 7. 화면별 상세 설계

### 7-1. index.html — 진입·역할 선택

```javascript
// URL 파라미터: ?slug=dongdaemun-guhoeui-gap-minjoo
const slug = new URLSearchParams(location.search).get('slug')

// 또는 경로 방식 (보조): /dongdaemun-gap/minjoo → slug = 'dongdaemun-gap-minjoo'
const parts = location.pathname.split('/').filter(Boolean)
if (parts.length >= 2) slug = `${parts[0]}-${parts[1]}`

// Supabase 캠프 조회
const { data: camp } = await db.from('camps').select('*').eq('slug', slug).single()
```

**화면 구성**
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

### 7-2. input.html — 현장책임자 입력

**수집 정보**
```
1. 이름 (현장책임자명)
2. 전화번호 (자동 하이픈, blur시 중복 체크)
3. 담당 동 (드롭다운 — 동 이름 선택 시 단위 표시)
4. 투표자수
```

**주요 기능**
- localStorage로 이름·전화번호·동 자동 복원 (`cv_input_{slug}`)
- 동일 전화번호 다른 이름 차단 (기존 제출자 중복 방지)
- 동 선택 시 → `getUnitByDong()` 호출 → 단위 레이블 표시
- 담당자별 실적 보기 버튼 → 모달로 순위 표시 (누적합 기준)
- **개표마감** (본선 `election_type === '본선'`일 때만 표시)
  - `closings` 테이블 INSERT/UPDATE
  - 마감 후 취소 가능 (`cancelled = true` UPDATE)

---

### 7-3. dashboard.html — 본부 실시간 대시보드

**디자인**: 다크 테마 (`background: #0f172a`)

**레이아웃**
```
┌─────────────────────────────────────────────┐
│ 동대문구 국회의원갑 민주당  ● LIVE  [새로고침] │
├──────────┬──────────┬──────────┬────────────┤
│ 총 투표수 │  달성률  │ 미보고 수 │  마지막보고 │
│  1,247   │  83%     │   3      │   14:23    │
├─────────────────────────────────────────────┤
│  [동별 현황]  [담당자 통계]  ← 탭            │
├─────────────────────────────────────────────┤
│  단위별 카드 그리드 (갑/을/병 등)             │
│  각 카드: Chart.js 막대차트 + 동 테이블       │
└─────────────────────────────────────────────┘
```

**탭 구성**
- **동별 현황**: 단위 카드(그리드) 각각 Chart.js + 테이블
- **담당자 통계**: reporter_phone 기준 누적합 집계, 순위 정렬, 전화 모달

**단위 카드 그리드**
- 단위 수 1개: `cols-1`, 2개: `cols-2`, 3개 이상: `cols-3` (CSS grid)
- 각 카드: 단위명·합계·달성률 헤더 + Chart.js 막대차트 + 동 테이블
- 미보고 동: 빨간 점 + 투표수 빨간 표시

**Chart.js 색상 로직**
```javascript
backgroundColor: votes.map(v =>
  v === 0    ? '#ef4444' :            // 미보고 → 빨강
  v >= target * 0.8 ? '#10b981' :     // 목표 80% 이상 → 초록
  '#3b82f6'                           // 진행중 → 파랑
)
```

---

### 7-4. admin.html — 캠프 생성·설정

**4단계 폼 흐름**
```
STEP 1. 선거 종류 + 정당 선택
  [경 선]  [본 선]          ← 선거 종류 먼저 선택
  [민주당] [국민의힘]        ← 선거 종류 선택 후 활성화

STEP 2. 직위 + 지역 선택
  직위     [국회의원 ▼]      ← 서울시장이면 시군구 숨김
  시·도    [서울특별시 ▼]
  시·군·구 [동대문구 ▼]
  단위     [갑 ▼]            ← 직위별 단위 동적 변경

STEP 3. 기본 설정
  목표 득표수   [  1,500  ]
  본부 비밀번호 [________]
  비밀번호 확인 [________]

STEP 4. 생성 완료
  URL: {BASE_URL}/index.html?slug={slug}
  [URL 복사]  [카카오 공유]  QR코드
  현장책임자 안내 문자 + [문자 내용 복사]
```

**camps INSERT 데이터**
```javascript
{
  slug, election_type, party, party_name,
  sido, sigungu, sigungu_eng,
  district,           // 예: '동대문구 국회의원갑' | '서울시장'
  unit: unit || '',
  hq_password,        // SHA-256 해시
  target_votes
}
```

---

## 8. 환경변수 (js/config.js)

```javascript
const CONFIG = {
  SUPABASE_URL:  'https://zmdqihmmsglzegzuyisy.supabase.co',
  SUPABASE_ANON: 'eyJ...',  // anon key (service_role 절대 금지)
  JUSO_API_KEY:  '',        // 행안부 API 키 (선택 — 없으면 dongs.json 사용)
  BASE_URL:      location.origin,
  HQ_PW_SALT:    'campvote2026'
}
```

> `BASE_URL`은 `location.origin`으로 자동 설정됨 (배포 환경 자동 대응)

---

## 9. Supabase 클라이언트 (js/supabase.js)

```javascript
const { createClient } = window.supabase  // CDN UMD
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON)
// 전역 변수명: db (모든 HTML에서 db.from(...) 사용)
```

---

## 10. 공통 유틸 (js/utils.js)

```javascript
// 슬러그 생성
const UNIT_MAP     = { '갑':'gap','을':'eul','병':'byeong','정':'jeong','무':'moo','가':'ga','나':'na','다':'da','라':'ra' }
const PARTY_MAP    = { '민주당':'minjoo', '국민의힘':'people' }
const POSITION_MAP = { '서울시장':'sijang','구청장':'gucheong','시의원':'sieui','구의원':'gueui','국회의원':'guhoeui' }
const POSITION_UNITS = { '서울시장':[],'구청장':[],'시의원':['갑','을','병'],'구의원':['가','나','다','라'],'국회의원':['갑','을','병','정','무'] }

function generateSlug(sigunguEng, position, unit, party) { ... }

// 비밀번호 SHA-256 해시
async function hashPassword(password) { ... }
async function verifyPassword(input, stored) { ... }

// 전화번호
function formatPhone(value) { ... }     // 자동 하이픈
function isValidPhone(phone) { ... }    // 010-XXXX-XXXX 검증

// UI
function showToast(msg, type='success') { ... }  // 우하단 토스트

// 기타
function getParam(key) { ... }          // URL 파라미터 파싱
function formatTime(iso) { ... }        // HH:MM 포맷
function formatNumber(n) { ... }        // 숫자 콤마
async function getClientIP() { ... }    // ipify.org API
```

---

## 11. 주소 유틸 (js/address.js)

```javascript
const SIGUNGU_ENG = { '동대문구':'dongdaemun', '송파구':'songpa', ... }

// 동 목록 로드 (JUSO API → dongs.json fallback)
async function loadDongs(sigungu)
// returns: string[] — 해당 구 전체 동 목록 (flat)

// 동 → 단위 조회 (갑/을/병 등)
async function getUnitByDong(sigungu, dong)
// returns: string | null — dongs.json에 중첩 구조인 경우만 유효

// 단위별 동 구조 반환
async function getDongsByUnit(sigungu)
// returns: {갑:[...], 을:[...]} | null
```

**dongs.json 두 가지 구조**
```json
// 단순 flat 배열 (단위 구분 없음)
"동대문구": ["용신동","제기동","청량리동", ...]

// 단위별 중첩 구조 (국회의원 다선거구)
"송파구": {
  "갑": ["풍납1동","방이1동", ...],
  "을": ["잠실본동","삼전동", ...],
  "병": ["거여1동","마천1동", ...]
}
```

---

## 12. 자주 쓰는 Supabase 쿼리

```javascript
// 캠프 조회
const { data: camp } = await db.from('camps').select('*').eq('slug', slug).single()

// 투표수 제출
const { error } = await db.from('submissions').insert({
  camp_id, reporter_name, reporter_phone, dong, vote_count, ip_address
})

// 동별 최신값 (대시보드 — 이력 누적이므로 최신값만 추출)
const { data } = await db.from('submissions')
  .select('dong, reporter_name, reporter_phone, vote_count, submitted_at')
  .eq('camp_id', campId)
  .order('submitted_at', { ascending: false })
// → JS에서 동별 첫 번째(최신) row만 추출

// 내 제출 이력
const { data } = await db.from('submissions')
  .select('dong, vote_count, submitted_at')
  .eq('camp_id', campId).eq('reporter_phone', phone)
  .order('submitted_at', { ascending: false }).limit(10)

// Realtime 구독
const channel = db.channel(`camp-${campId}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'submissions',
    filter: `camp_id=eq.${campId}`
  }, handleNewRow)
  .subscribe()
window.addEventListener('beforeunload', () => db.removeChannel(channel))

// 개표마감 조회 (본선)
const { data } = await db.from('closings')
  .select('*').eq('camp_id', campId).eq('dong', dong)
  .eq('reporter_phone', phone).eq('cancelled', false)
  .order('closed_at', { ascending: false }).limit(1)

// 개표마감 취소
await db.from('closings').update({ cancelled: true }).eq('id', closingId)
```

---

## 13. 정당별 CSS 변수 (css/style.css)

```css
.party-minjoo { --party-primary: #004EA2; --party-light: #E3F0FF; }
.party-people { --party-primary: #C9151E; --party-light: #FFE8E8; }
```

> dashboard.html은 다크 테마 별도 CSS (인라인 `<style>` 블록 사용)

---

## 14. 구현 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | Supabase DB (camps, submissions, closings) | ✅ 완료 |
| Phase 2 | input.html — 투표수 입력 | ✅ 완료 |
| Phase 3 | dashboard.html — 다크 테마 실시간 대시보드 | ✅ 완료 |
| Phase 4 | index.html — 진입·역할 선택 | ✅ 완료 |
| Phase 5 | admin.html — 캠프 생성 (선거종류+직위 확장) | ✅ 완료 |
| Phase 6 | 행안부 API + 배포 | ⬜ 미완 (JUSO_API_KEY 미설정) |

---

## 15. 주요 코딩 규칙

- UI 레이블: 한국어 / 변수·함수명: 영문 camelCase / 주석: 한국어
- async/await 사용 (Promise.then 지양)
- 에러: try/catch 필수 + 사용자 친화 메시지
- 모든 버튼 최소 48px 높이 (모바일 터치)
- 숫자 입력: `type="number"` + `inputmode="numeric"`
- 전화번호: `type="tel"` + `inputmode="numeric"`
- anon key만 프론트 노출 (service_role 절대 금지)
- 모든 쿼리에 camp_id 필터 필수
- Realtime 구독: 화면 이탈 시 반드시 `db.removeChannel(channel)`
- 본부 비밀번호: SHA-256 해시 후 저장
- Supabase 클라이언트 전역 변수명: `db` (supabase 아님)

---

*CampVote CLAUDE.md v2.0 | 2026.04 — 실제 코드 기준 업데이트*
*이 파일을 VS Code Claude Extension이 자동 참조합니다*
