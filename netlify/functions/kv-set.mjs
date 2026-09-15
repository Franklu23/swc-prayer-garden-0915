// 同心守望之城．寫入共享資料的 Netlify Function
// 對應網址：/api/kv/set（POST，body 是 { key, value }）
import { getStore } from '@netlify/blobs';

const ALLOWED_EXACT_KEYS = new Set([
  'candles', 'footsteps', 'wisdomFruit', 'unityTaps', 'unityGlow', 'greetings'
]);
function isAllowedKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) return false;
  if (ALLOWED_EXACT_KEYS.has(key)) return true;
  if (key.startsWith('station:') && key.length <= 200) return true;
  return false;
}

const MAX_VALUE_BYTES = 5 * 1024 * 1024; // 5MB，比照一般鍵值儲存的合理上限

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
  if (req.method !== 'POST') {
    return jsonResponse({ error: '僅支援 POST' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return jsonResponse({ error: '請求內容不是合法的 JSON' }, 400);
  }

  const { key, value } = body || {};
  if (!isAllowedKey(key)) {
    return jsonResponse({ error: '不允許的 key' }, 400);
  }
  if (typeof value !== 'string') {
    return jsonResponse({ error: 'value 必須是字串（前端請先 JSON.stringify）' }, 400);
  }
  if (new TextEncoder().encode(value).length > MAX_VALUE_BYTES) {
    return jsonResponse({ error: 'value 超過 5MB 上限' }, 413);
  }

  try {
    const store = getStore({ name: 'swc-prayer-garden', consistency: 'strong' });
    await store.set(key, value);
    return jsonResponse({ key, value, shared: true });
  } catch (err) {
    return jsonResponse({ error: '寫入失敗：' + (err && err.message ? err.message : String(err)) }, 500);
  }
};

export const config = { path: '/api/kv/set' };
