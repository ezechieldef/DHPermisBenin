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
    CREATE TABLE IF NOT EXISTS course_progress (
      course_id INTEGER PRIMARY KEY REFERENCES cours(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
      last_opened_at TEXT,
      completed_at TEXT,
      last_step_key TEXT
    );
    CREATE TABLE IF NOT EXISTS course_section_progress (
      course_id INTEGER NOT NULL REFERENCES cours(id) ON DELETE CASCADE,
      section_key TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY(course_id, section_key)
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_completed_at ON attempts(completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_question_progress_flagged ON question_progress(is_flagged);
    CREATE INDEX IF NOT EXISTS idx_course_section_progress_course ON course_section_progress(course_id);
  `);
  const attemptColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(attempts)');
  if (!attemptColumns.some((column) => column.name === 'subject_id')) {
    await db.execAsync('ALTER TABLE attempts ADD COLUMN subject_id INTEGER REFERENCES subjects(id)');
  }
  const courseProgressColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(course_progress)');
  if (!courseProgressColumns.some((column) => column.name === 'last_step_key')) {
    await db.execAsync('ALTER TABLE course_progress ADD COLUMN last_step_key TEXT');
  }
  const questionColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(questions)');
  if (!questionColumns.some((column) => column.name === 'permis_type')) {
    await db.execAsync('ALTER TABLE questions ADD COLUMN permis_type TEXT');
  }
  await db.execAsync(`
    UPDATE questions
    SET permis_type = CASE
      WHEN number BETWEEN 646 AND 678 THEN 'A1, A2, A3'
      WHEN number BETWEEN 679 AND 688 THEN 'B1'
      WHEN number BETWEEN 689 AND 738 THEN 'C, C1'
      WHEN number BETWEEN 739 AND 799 THEN 'D'
      ELSE 'B'
    END;
  `);
}
