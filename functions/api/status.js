// Cloudflare Pages Function: /api/status
export async function onRequestGet(context) {
  const hasDB = !!context.env && !!context.env.DB;
  let dbWorking = false;
  let errorMsg = null;
  let tablesExist = false;
  let missingTables = [];

  if (hasDB) {
    try {
      const res = await context.env.DB.prepare("SELECT 1 as alive").first();
      dbWorking = !!res && res.alive === 1;

      // Check for required schema tables
      const { results } = await context.env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('meals', 'weekly_plans', 'user_settings', 'workout_sessions', 'workout_sets')"
      ).all();

      const existingTableNames = (results || []).map(r => r.name);
      const requiredTables = ['meals', 'weekly_plans', 'user_settings', 'workout_sessions', 'workout_sets'];
      missingTables = requiredTables.filter(t => !existingTableNames.includes(t));
      tablesExist = missingTables.length === 0;
    } catch (err) {
      errorMsg = err.message;
    }
  }

  const envKeys = Object.keys(context.env || {}).filter(k => typeof context.env[k] === 'string' || typeof context.env[k] === 'object');
  const hasGeminiKey = Boolean(context.env?.GEMINI_API_KEY);

  return new Response(JSON.stringify({
    status: 'ok',
    d1Bound: hasDB,
    d1Connected: dbWorking,
    tablesCreated: tablesExist,
    missingTables: missingTables,
    hasGeminiKey: hasGeminiKey,
    envKeysAvailable: envKeys,
    error: errorMsg,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
