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
