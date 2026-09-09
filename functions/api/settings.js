// Cloudflare Pages Function: /api/settings
function getUserId(request) {
  return request.headers.get('X-User-Id') || 'anonymous_default';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function onRequestOptions() {
  return jsonResponse({ ok: true });
}

export async function onRequestGet(context) {
  const db = context.env?.DB;
  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment (context.env.DB is missing)' }, 503);
  }

  const userId = getUserId(context.request);
  try {
    const row = await db
      .prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first();

    if (!row) {
      return jsonResponse({ settings: null });
    }

    let dietProportions = null;
    let excludedTags = [];

    try {
      if (row.diet_proportions) dietProportions = JSON.parse(row.diet_proportions);
    } catch (e) {}

    try {
      if (row.excluded_tags) excludedTags = JSON.parse(row.excluded_tags);
    } catch (e) {}

    return jsonResponse({
      settings: {
        dietProportions: dietProportions || { veggie: 40, meat: 30, fish: 20, seafood: 10 },
        excludedTags: Array.isArray(excludedTags) ? excludedTags : []
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const db = context.env?.DB;
  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment (context.env.DB is missing)' }, 503);
  }

  const userId = getUserId(context.request);
  try {
    const body = await context.request.json();
    const dietStr = JSON.stringify(body.dietProportions || { veggie: 40, meat: 30, fish: 20, seafood: 10 });
    const tagsStr = JSON.stringify(Array.isArray(body.excludedTags) ? body.excludedTags : []);

    await db.prepare(`
      INSERT INTO user_settings (user_id, diet_proportions, excluded_tags, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        diet_proportions = excluded.diet_proportions,
        excluded_tags = excluded.excluded_tags,
        updated_at = CURRENT_TIMESTAMP
    `).bind(userId, dietStr, tagsStr).run();

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
