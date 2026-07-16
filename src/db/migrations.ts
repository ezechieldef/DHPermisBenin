import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK(mode IN ('subject','exam','review')),
      category_id INTEGER REFERENCES categories(id),
      subject_index INTEGER,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS attempt_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_letters TEXT NOT NULL,
      is_correct INTEGER NOT NULL CHECK(is_correct IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS question_progress (
      question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
      times_seen INTEGER NOT NULL DEFAULT 0,
      times_correct INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT,
      is_flagged INTEGER NOT NULL DEFAULT 0 CHECK(is_flagged IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_completed_at ON attempts(completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_question_progress_flagged ON question_progress(is_flagged);
  `);
}
