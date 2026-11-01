// Cloudflare Pages Function: /api/stories
function getUserId(request) {
  return request.headers.get('X-User-Id') || 'famille_default';
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

async function ensureTables(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS story_books (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        narrator TEXT DEFAULT 'Papa',
        cover_image TEXT DEFAULT '',
        page_count INTEGER DEFAULT 0,
        total_duration_sec REAL DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_story_books_user ON story_books(user_id, updated_at)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS story_pages (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        image_data TEXT DEFAULT '',
        audio_data TEXT DEFAULT '',
        audio_duration REAL DEFAULT 0,
        caption TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_story_pages_book ON story_pages(book_id, page_number)`),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS story_settings (
        user_id TEXT PRIMARY KEY,
        settings_json TEXT DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);
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
  const url = new URL(context.request.url);
  const bookId = url.searchParams.get('book_id');

  try {
    await ensureTables(db);

    if (bookId) {
      const book = await db
        .prepare("SELECT * FROM story_books WHERE id = ? AND user_id = ?")
        .bind(bookId, userId)
        .first();

      if (!book) {
        return jsonResponse({ error: 'Livre introuvable' }, 404);
      }

      const { results: pages } = await db
        .prepare("SELECT * FROM story_pages WHERE book_id = ? AND user_id = ? ORDER BY page_number ASC")
        .bind(bookId, userId)
        .all();

      return jsonResponse({
        book,
        pages: pages || []
      });
    }

    // List all books (metadata + cover thumbnail) and parent settings
    const { results: books } = await db
      .prepare("SELECT * FROM story_books WHERE user_id = ? ORDER BY is_favorite DESC, updated_at DESC")
      .bind(userId)
      .all();

    const settingsRow = await db
      .prepare("SELECT settings_json FROM story_settings WHERE user_id = ?")
      .bind(userId)
      .first();

    let settings = null;
    if (settingsRow && settingsRow.settings_json) {
      try {
        settings = JSON.parse(settingsRow.settings_json);
      } catch (_) {
        settings = null;
      }
    }

    return jsonResponse({
      books: books || [],
      settings
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
    await ensureTables(db);
    const body = await context.request.json();
    const action = body.action || 'save_book';

    if (action === 'save_book' && body.book) {
      const b = body.book;
      await db.prepare(`
        INSERT INTO story_books (id, user_id, title, narrator, cover_image, page_count, total_duration_sec, is_favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          narrator = excluded.narrator,
          cover_image = CASE WHEN excluded.cover_image != '' THEN excluded.cover_image ELSE story_books.cover_image END,
          page_count = excluded.page_count,
          total_duration_sec = excluded.total_duration_sec,
          is_favorite = excluded.is_favorite,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        b.id,
        userId,
        b.title || 'Mon Histoire',
        b.narrator || 'Papa',
        b.cover_image || '',
        parseInt(b.page_count, 10) || 0,
        parseFloat(b.total_duration_sec) || 0,
        b.is_favorite ? 1 : 0
      ).run();

      return jsonResponse({ success: true, bookId: b.id });
    }

    if (action === 'save_page' && body.page) {
      const p = body.page;
      await db.prepare(`
        INSERT INTO story_pages (id, book_id, user_id, page_number, image_data, audio_data, audio_duration, caption, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          page_number = excluded.page_number,
          image_data = excluded.image_data,
          audio_data = excluded.audio_data,
          audio_duration = excluded.audio_duration,
          caption = excluded.caption,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        p.id,
        p.book_id,
        userId,
        parseInt(p.page_number, 10) || 1,
        p.image_data || '',
        p.audio_data || '',
        parseFloat(p.audio_duration) || 0,
        p.caption || ''
      ).run();

      return jsonResponse({ success: true, pageId: p.id });
    }

    if (action === 'sync_pages_order' && body.book_id && Array.isArray(body.page_ids)) {
      const stmts = [
        db.prepare("DELETE FROM story_pages WHERE book_id = ? AND user_id = ? AND id NOT IN (" +
          (body.page_ids.length > 0 ? body.page_ids.map(() => '?').join(',') : "''") + ")"
        ).bind(body.book_id, userId, ...body.page_ids)
      ];

      body.page_ids.forEach((pid, idx) => {
        stmts.push(
          db.prepare("UPDATE story_pages SET page_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND book_id = ? AND user_id = ?")
            .bind(idx + 1, pid, body.book_id, userId)
        );
      });

      await db.batch(stmts);
      return jsonResponse({ success: true });
    }

    if (action === 'toggle_favorite' && body.book_id) {
      await db.prepare(`
        UPDATE story_books
        SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).bind(body.is_favorite ? 1 : 0, body.book_id, userId).run();

      return jsonResponse({ success: true });
    }

    if (action === 'save_settings' && body.settings) {
      await db.prepare(`
        INSERT INTO story_settings (user_id, settings_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          settings_json = excluded.settings_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(userId, JSON.stringify(body.settings)).run();

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
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
  const bookId = url.searchParams.get('book_id');
  const pageId = url.searchParams.get('page_id');

  try {
    await ensureTables(db);

    if (pageId && bookId) {
      await db.prepare("DELETE FROM story_pages WHERE id = ? AND book_id = ? AND user_id = ?")
        .bind(pageId, bookId, userId)
        .run();
      return jsonResponse({ success: true, deletedPageId: pageId });
    }

    if (bookId) {
      await db.batch([
        db.prepare("DELETE FROM story_pages WHERE book_id = ? AND user_id = ?").bind(bookId, userId),
        db.prepare("DELETE FROM story_books WHERE id = ? AND user_id = ?").bind(bookId, userId)
      ]);
      return jsonResponse({ success: true, deletedBookId: bookId });
    }

    return jsonResponse({ error: 'Missing book_id parameter' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
