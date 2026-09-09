// Cloudflare Pages Function: /api/meals
function getUserId(request) {
  return request.headers.get('X-User-Id') || 'anonymous_default';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment' }, 503);
  }

  const userId = getUserId(context.request);
  try {
    const { results } = await db
      .prepare("SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC")
      .bind(userId)
      .all();
    return jsonResponse({ meals: results || [] });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const db = context.env?.DB;
  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment' }, 503);
  }

  const userId = getUserId(context.request);
  try {
    const body = await context.request.json();
    const meals = Array.isArray(body.meals) ? body.meals : (body.meal ? [body.meal] : []);

    if (meals.length === 0) {
      return jsonResponse({ error: 'No meals provided' }, 400);
    }

    const statements = meals.map(m => {
      return db.prepare(`
        INSERT INTO meals (id, user_id, name, type, season, calorie_level, prep_time, category, tags, recipe_url, photo, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          season = excluded.season,
          calorie_level = excluded.calorie_level,
          prep_time = excluded.prep_time,
          category = excluded.category,
          tags = excluded.tags,
          recipe_url = excluded.recipe_url,
          photo = excluded.photo,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        m.id,
        userId,
        m.name || 'Sans titre',
        m.type || 'veggie',
        m.season || 'all',
        m.calorieLevel || m.calorie_level || 'medium',
        m.prepTime || m.prep_time || 'medium',
        m.category || 'main',
        m.tags || '',
        m.recipeUrl || m.recipe_url || '',
        m.photo || ''
      );
    });

    await db.batch(statements);
    return jsonResponse({ success: true, count: meals.length });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const db = context.env?.DB;
  if (!db) {
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment' }, 503);
  }

  const userId = getUserId(context.request);
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return jsonResponse({ error: 'Missing meal id' }, 400);
  }

  try {
    await db.prepare("DELETE FROM meals WHERE id = ? AND user_id = ?").bind(id, userId).run();
    return jsonResponse({ success: true, deletedId: id });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
