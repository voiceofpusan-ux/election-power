// ── 비밀번호 SHA-256 해시 ──────────────────────────────
async function hashPassword(password) {
  const data = new TextEncoder().encode(password + CONFIG.HQ_PW_SALT)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(input, stored) {
  return (await hashPassword(input)) === stored
}

// ── 전화번호 ────────────────────────────────────────────
function formatPhone(value) {
  const num = value.replace(/\D/g, '').slice(0, 11)
  if (num.length <= 3) return num
  if (num.length <= 7) return `${num.slice(0,3)}-${num.slice(3)}`
  return `${num.slice(0,3)}-${num.slice(3,7)}-${num.slice(7)}`
}

function isValidPhone(phone) {
  return /^010-\d{4}-\d{4}$/.test(phone)
}

// ── 시간 포맷 ──────────────────────────────────────────
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit'
  })
}

// ── 숫자 콤마 ──────────────────────────────────────────
function formatNumber(n) {
  return Number(n).toLocaleString('ko-KR')
}

// ── 클라이언트 IP ─────────────────────────────────────
async function getClientIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const { ip } = await res.json()
    return ip
  } catch { return null }
}

// ── 슬러그 생성 ──────────────────────────────────────
const UNIT_MAP = {
  '갑':'gap', '을':'eul', '병':'byeong', '정':'jeong', '무':'moo',
  '가':'ga',  '나':'na',  '다':'da',     '라':'ra'
}
const PARTY_MAP = { '민주당':'minjoo', '국민의힘':'people' }
const POSITION_MAP = {
  '서울시장':'sijang', '구청장':'gucheong',
  '시의원':'sieui',   '구의원':'gueui',   '국회의원':'guhoeui'
}
// 직위별 선택 가능한 단위
const POSITION_UNITS = {
  '서울시장':  [],
  '구청장':   [],
  '시의원':   ['갑','을','병'],
  '구의원':   ['가','나','다','라'],
  '국회의원': ['갑','을','병','정','무']
}

function generateSlug(sigunguEng, position, unit, party) {
  const pos   = POSITION_MAP[position] || ''
  const u     = unit ? (UNIT_MAP[unit] || '') : ''
  const p     = PARTY_MAP[party] || party
  return [sigunguEng, pos, u, p].filter(Boolean).join('-')
}

// ── URL 파라미터 파싱 ─────────────────────────────────
function getParam(key) {
  return new URLSearchParams(location.search).get(key)
}

// ── 토스트 메시지 ─────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('show'), 10)
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, 2500)
}
