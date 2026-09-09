// Cloudflare Pages Function: /api/planner
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
    return jsonResponse({ error: 'Cloudflare D1 is not bound to this Pages environment' }, 503);
  }

  const userId = getUserId(context.request);
  try {
    const { results } = await db
      .prepare("SELECT * FROM weekly_plans WHERE user_id = ? ORDER BY day_index ASC, slot ASC")
      .bind(userId)
      .all();
    return jsonResponse({ plans: results || [] });
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
    const plans = Array.isArray(body.plans) ? body.plans : [];

    if (plans.length === 0) {
      return jsonResponse({ error: 'No plans provided' }, 400);
    }

    const statements = plans.map(p => {
      const planId = `${userId}_${p.dayIndex ?? p.day_index}_${p.slot}`;
      return db.prepare(`
        INSERT INTO weekly_plans (id, user_id, day_index, slot, meal_id, is_locked, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          meal_id = excluded.meal_id,
          is_locked = excluded.is_locked,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        planId,
        userId,
        p.dayIndex ?? p.day_index,
        p.slot,
        p.mealId ?? p.meal_id ?? null,
        p.isLocked || p.is_locked ? 1 : 0
      );
    });

    await db.batch(statements);
    return jsonResponse({ success: true, count: plans.length });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
