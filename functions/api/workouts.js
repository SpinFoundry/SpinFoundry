// Cloudflare Pages Function: /api/workouts
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
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Gemini-Key',
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
    // 1. Fetch workout sessions
    const { results: sessions } = await db
      .prepare("SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 100")
      .bind(userId)
      .all();

    // 2. Fetch workout sets
    const { results: sets } = await db
      .prepare("SELECT * FROM workout_sets WHERE user_id = ? ORDER BY created_at ASC")
      .bind(userId)
      .all();

    // 3. Fetch custom exercises
    const { results: customExercises } = await db
      .prepare("SELECT * FROM workout_custom_exercises WHERE user_id = ? ORDER BY created_at ASC")
      .bind(userId)
      .all();

    // 4. Fetch settings
    const userSettings = await db
      .prepare("SELECT * FROM workout_user_settings WHERE user_id = ?")
      .bind(userId)
      .first();

    return jsonResponse({
      sessions: sessions || [],
      sets: sets || [],
      customExercises: customExercises || [],
      settings: userSettings || null
    });
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
    const statements = [];

    // Case 1: Save completed workout session with its sets
    if (body.session) {
      const s = body.session;
      statements.push(
        db.prepare(`
          INSERT INTO workout_sessions (id, user_id, name, started_at, ended_at, duration_seconds, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            started_at = excluded.started_at,
            ended_at = excluded.ended_at,
            duration_seconds = excluded.duration_seconds,
            notes = excluded.notes
        `).bind(
          s.id,
          userId,
          s.name || 'Séance de Musculation',
          s.started_at || new Date().toISOString(),
          s.ended_at || new Date().toISOString(),
          s.duration_seconds || 0,
          s.notes || ''
        )
      );

      // If sets are provided, delete previous sets for this session (for idempotency) and insert new ones
      if (Array.isArray(body.sets) && body.sets.length > 0) {
        statements.push(
          db.prepare("DELETE FROM workout_sets WHERE session_id = ? AND user_id = ?").bind(s.id, userId)
        );

        for (const set of body.sets) {
          statements.push(
            db.prepare(`
              INSERT INTO workout_sets (id, session_id, user_id, exercise_id, set_number, weight_kg, reps, is_failure, is_warmup, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
              set.id || ('set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
              s.id,
              userId,
              set.exercise_id,
              set.set_number || 1,
              parseFloat(set.weight_kg) || 0,
              parseInt(set.reps, 10) || 0,
              set.is_failure ? 1 : 0,
              set.is_warmup ? 1 : 0
            )
          );
        }
      }
    }

    // Case 2: Save custom exercise
    if (body.customExercise) {
      const ce = body.customExercise;
      statements.push(
        db.prepare(`
          INSERT INTO workout_custom_exercises (id, user_id, name, muscle_group, equipment, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            muscle_group = excluded.muscle_group,
            equipment = excluded.equipment
        `).bind(
          ce.id,
          userId,
          ce.name,
          ce.muscle_group || 'chest',
          ce.equipment || 'machine'
        )
      );
    }

    // Case 3: Save workout settings
    if (body.settings) {
      const st = body.settings;
      statements.push(
        db.prepare(`
          INSERT INTO workout_user_settings (user_id, default_rest_seconds, custom_gemini_key, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            default_rest_seconds = excluded.default_rest_seconds,
            custom_gemini_key = excluded.custom_gemini_key,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          userId,
          parseInt(st.default_rest_seconds, 10) || 90,
          st.custom_gemini_key || ''
        )
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return jsonResponse({ success: true, count: statements.length });
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
  const sessionId = url.searchParams.get('session_id');
  const customExerciseId = url.searchParams.get('exercise_id');
  const deleteAll = url.searchParams.get('all') === 'true';

  try {
    if (sessionId) {
      await db.batch([
        db.prepare("DELETE FROM workout_sets WHERE session_id = ? AND user_id = ?").bind(sessionId, userId),
        db.prepare("DELETE FROM workout_sessions WHERE id = ? AND user_id = ?").bind(sessionId, userId)
      ]);
      return jsonResponse({ success: true, deletedSessionId: sessionId });
    }

    if (customExerciseId) {
      await db.prepare("DELETE FROM workout_custom_exercises WHERE id = ? AND user_id = ?").bind(customExerciseId, userId).run();
      return jsonResponse({ success: true, deletedExerciseId: customExerciseId });
    }

    if (deleteAll) {
      await db.batch([
        db.prepare("DELETE FROM workout_sets WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM workout_sessions WHERE user_id = ?").bind(userId),
        db.prepare("DELETE FROM workout_custom_exercises WHERE user_id = ?").bind(userId)
      ]);
      return jsonResponse({ success: true, allReset: true });
    }

    return jsonResponse({ error: 'Missing session_id or exercise_id parameter' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
