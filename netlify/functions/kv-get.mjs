// 同心守望之城．讀取共享資料的 Netlify Function
// 對應網址：/api/kv/get?key=xxx
import { getStore } from '@netlify/blobs';

// 只允許讀寫這幾個固定的鍵名，避免任意人透過 API 亂塞垃圾資料進 Blobs。
// 這些鍵名對應前端 Storage 呼叫時用到的 shared=true 的 key。
// 「station:」開頭的鍵是每個禱告站點自己的留言牆，數量不固定，故用前綴比對。
const ALLOWED_EXACT_KEYS = new Set([
  'candles', 'footsteps', 'wisdomFruit', 'unityTaps', 'unityGlow', 'greetings'
]);
function isAllowedKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) return false;
  if (ALLOWED_EXACT_KEYS.has(key)) return true;
  if (key.startsWith('station:') && key.length <= 200) return true;
  return false;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() }
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: '僅支援 GET' }, 405);
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!isAllowedKey(key)) {
    return jsonResponse({ error: '不允許的 key' }, 400);
  }

  try {
    // strong consistency：確保剛寫入的資料，馬上讀就讀得到最新值
    const store = getStore({ name: 'swc-prayer-garden', consistency: 'strong' });
    const value = await store.get(key);
    if (value === null || value === undefined) {
      return jsonResponse(null, 404);
    }
    return jsonResponse({ key, value, shared: true });
  } catch (err) {
    return jsonResponse({ error: '讀取失敗：' + (err && err.message ? err.message : String(err)) }, 500);
  }
};

export const config = { path: '/api/kv/get' };
