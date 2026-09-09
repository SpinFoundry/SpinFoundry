// Cloudflare Pages Function: /api/status
export async function onRequestGet(context) {
  const hasDB = !!context.env && !!context.env.DB;
  let dbWorking = false;
  let errorMsg = null;

  if (hasDB) {
    try {
      const res = await context.env.DB.prepare("SELECT 1 as alive").first();
      dbWorking = !!res && res.alive === 1;
    } catch (err) {
      errorMsg = err.message;
    }
  }

  return new Response(JSON.stringify({
    status: 'ok',
    d1Bound: hasDB,
    d1Connected: dbWorking,
    error: errorMsg,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
