// functions/api/sync.js
// Cloudflare Pages Function + D1 云同步接口
// 绑定名称必须是 DB

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

async function hashSpace(space) {
  const enc = new TextEncoder().encode('qm-sync-v1:' + space.trim());
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // ---------- GET：拉取数据 ----------
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const space = url.searchParams.get('space');
      if (!space || space.length < 4) {
        return new Response(JSON.stringify({ error: '请提供同步口令' }), {
          status: 400, headers: CORS_HEADERS
        });
      }

      const spaceId = await hashSpace(space);
      const row = await env.DB.prepare(
        'SELECT data, updated_at, order_count FROM qm_sync WHERE space_id = ?'
      ).bind(spaceId).first();

      if (!row) {
        return new Response(JSON.stringify({ error: '云端暂无数据', empty: true }), {
          status: 404, headers: CORS_HEADERS
        });
      }

      const payload = JSON.parse(row.data);
      return new Response(JSON.stringify({
        ...payload,
        updatedAt: row.updated_at,
        orderCount: row.order_count
      }), { headers: CORS_HEADERS });
    }

    // ---------- POST：上传 / 覆盖数据 ----------
    if (request.method === 'POST') {
      const body = await request.json();
      const { space, data } = body;

      if (!space || space.length < 4) {
        return new Response(JSON.stringify({ error: '同步口令至少 4 位' }), {
          status: 400, headers: CORS_HEADERS
        });
      }
      if (!data || !Array.isArray(data.orders)) {
        return new Response(JSON.stringify({ error: '数据格式错误' }), {
          status: 400, headers: CORS_HEADERS
        });
      }

      const spaceId = await hashSpace(space);
      const now = new Date().toISOString();
      const payload = {
        orders: data.orders,
        rates: data.rates || {},
        updatedAt: now,
        orderCount: data.orders.length,
        version: 2
      };

      await env.DB.prepare(`
        INSERT INTO qm_sync (space_id, data, updated_at, order_count)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(space_id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at,
          order_count = excluded.order_count
      `).bind(
        spaceId,
        JSON.stringify(payload),
        now,
        data.orders.length
      ).run();

      return new Response(JSON.stringify({
        success: true,
        orderCount: data.orders.length,
        updatedAt: now
      }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: CORS_HEADERS
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || '服务器错误' }), {
      status: 500, headers: CORS_HEADERS
    });
  }
}
