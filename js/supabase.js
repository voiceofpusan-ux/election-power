// Supabase 클라이언트 초기화 (CDN UMD 방식)
const { createClient } = window.supabase
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON)
