// ── 시군구 영문 슬러그 매핑 ──────────────────────────
const SIGUNGU_ENG = {
  // 서울
  '종로구':'jongno',        '중구':'junggu',
  '용산구':'yongsan',       '성동구':'seongdong',
  '광진구':'gwangjin',      '동대문구':'dongdaemun',
  '중랑구':'jungnang',      '성북구':'seongbuk',
  '강북구':'gangbuk',       '도봉구':'dobong',
  '노원구':'nowon',         '은평구':'eunpyeong',
  '서대문구':'seodaemun',   '마포구':'mapo',
  '양천구':'yangcheon',     '강서구':'gangseo',
  '구로구':'guro',          '금천구':'geumcheon',
  '영등포구':'yeongdeungpo','동작구':'dongjak',
  '관악구':'gwanak',        '서초구':'seocho',
  '강남구':'gangnam',       '송파구':'songpa',
  '강동구':'gangdong',
  // 부산
  '부산진구':'busanjin',    '동래구':'dongnae',
  '해운대구':'haeundae',    '사하구':'saha',
  '금정구':'geumjeong',     '연제구':'yeonje',
  '수영구':'suyeong',       '사상구':'sasang',
  '기장군':'gijang',        '영도구':'yeongdo',
  // 대구
  '달서구':'dalseo',        '달성군':'dalseong',
  // 인천
  '남동구':'namdong',       '부평구':'bupyeong',
  '계양구':'gyeyang',       '연수구':'yeonsu',
  '강화군':'ganghwa',
  // 경기
  '수원시':'suwon',         '성남시':'seongnam',
  '의정부시':'uijeongbu',   '안양시':'anyang',
  '부천시':'bucheon',       '광명시':'gwangmyeong',
  '평택시':'pyeongtaek',    '안산시':'ansan',
  '고양시':'goyang',        '구리시':'guri',
  '남양주시':'namyangju',   '오산시':'osan',
  '시흥시':'siheung',       '군포시':'gunpo',
  '하남시':'hanam',         '용인시':'yongin',
  '파주시':'paju',          '이천시':'icheon',
  '안성시':'anseong',       '김포시':'gimpo',
  '화성시':'hwaseong',      '광주시':'gwangju-gg',
  '양주시':'yangju',        '포천시':'pocheon',
  '여주시':'yeoju',         '과천시':'gwacheon'
}

// ── dongs.json 캐시 ───────────────────────────────────
let _dongsCache = null
async function _loadDongsJson() {
  if (_dongsCache) return _dongsCache
  const res = await fetch('./data/dongs.json')
  _dongsCache = await res.json()
  return _dongsCache
}

// ── 동 목록 로드 ─────────────────────────────────────
async function loadDongs(sigungu) {
  // 1순위: 행안부 API
  if (CONFIG.JUSO_API_KEY) {
    try {
      const res = await fetch(
        `https://business.juso.go.kr/addrlink/addrLinkApi.do` +
        `?currentPage=1&countPerPage=200` +
        `&keyword=${encodeURIComponent(sigungu)}&confmKey=${CONFIG.JUSO_API_KEY}` +
        `&resultType=json`
      )
      const json = await res.json()
      const dongs = extractDongs(json)
      if (dongs.length > 0) return dongs
    } catch {}
  }

  // 2순위: 로컬 JSON 백업
  try {
    const data  = await _loadDongsJson()
    const entry = data[sigungu]
    if (!entry) return []
    // 단위 구조 {갑:[...], 을:[...]} 이면 flat 배열로 변환 후 정렬
    if (Array.isArray(entry)) return entry
    return Object.values(entry).flat().sort((a, b) => a.localeCompare(b, 'ko'))
  } catch { return [] }
}

// ── 동 → 단위(갑/을/병) 조회 ─────────────────────────
async function getUnitByDong(sigungu, dong) {
  try {
    const data  = await _loadDongsJson()
    const entry = data[sigungu]
    if (!entry || Array.isArray(entry)) return null
    for (const [unit, dongs] of Object.entries(entry)) {
      if (dongs.includes(dong)) return unit
    }
  } catch {}
  return null
}

// ── 단위별 동 구조 반환 {갑:[...], 을:[...]} ──────────
async function getDongsByUnit(sigungu) {
  try {
    const data  = await _loadDongsJson()
    const entry = data[sigungu]
    if (!entry || Array.isArray(entry)) return null
    return entry
  } catch { return null }
}

function extractDongs(json) {
  try {
    const items = json.results?.juso || []
    const set = new Set()
    items.forEach(item => {
      const match = item.roadAddr?.match(/(\S+동)/)
      if (match) set.add(match[1])
    })
    return [...set].sort()
  } catch { return [] }
}
