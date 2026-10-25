CREATE TABLE IF NOT EXISTS runs (
  slot TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  model TEXT,
  detail TEXT
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  slot TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  model TEXT NOT NULL,
  quality_score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  tags TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
