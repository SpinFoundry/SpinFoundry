-- Cloudflare D1 SQL Schema for MonPlanningRepas
-- To execute in Cloudflare Pages: npx wrangler d1 execute <DB_NAME> --file=functions/api/schema.sql

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  season TEXT NOT NULL,
  calorie_level TEXT NOT NULL,
  prep_time TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'main',
  tags TEXT DEFAULT '',
  recipe_url TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_type ON meals(user_id, type);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  slot TEXT NOT NULL,
  meal_id TEXT,
  is_locked INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON weekly_plans(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  diet_proportions TEXT,
  calorie_prefs TEXT,
  prep_prefs TEXT,
  excluded_tags TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═════════════════════════════════════════════
-- Cloudflare D1 SQL Schema for MonCarnetMuscu
-- ═════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON workout_sessions(user_id, started_at);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  is_failure INTEGER DEFAULT 0,
  is_warmup INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_exo ON workout_sets(user_id, exercise_id, created_at);

CREATE TABLE IF NOT EXISTS workout_custom_exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_user_settings (
  user_id TEXT PRIMARY KEY,
  default_rest_seconds INTEGER DEFAULT 90,
  custom_gemini_key TEXT DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═════════════════════════════════════════════
-- Cloudflare D1 SQL Schema for PapaRaconte
-- ═════════════════════════════════════════════

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
);

CREATE INDEX IF NOT EXISTS idx_story_books_user ON story_books(user_id, updated_at);

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
);

CREATE INDEX IF NOT EXISTS idx_story_pages_book ON story_pages(book_id, page_number);

CREATE TABLE IF NOT EXISTS story_settings (
  user_id TEXT PRIMARY KEY,
  settings_json TEXT DEFAULT '{}',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
