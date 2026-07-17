import type { SQLiteDatabase } from 'expo-sqlite';
import type { AttemptSummary, Category, Course, CourseOverview, DashboardStats, Definition, Option, Question, QuizMode, Subject } from '@/src/types/models';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(`
    SELECT c.id,c.name,c.description,
      (SELECT COUNT(*) FROM questions q WHERE q.category_id=c.id) question_count,
      (SELECT COUNT(DISTINCT a.subject_index) FROM attempts a WHERE a.category_id=c.id AND a.mode='subject') completed_subjects,
      (SELECT MAX(a.score) FROM attempts a WHERE a.category_id=c.id AND a.mode='subject') best_score
    FROM categories c ORDER BY c.id
  `);
}

export async function getCourse(db: SQLiteDatabase, id: number): Promise<Course | null> {
  return db.getFirstAsync<Course>('SELECT * FROM cours WHERE id=? AND is_published=1', id);
}

export async function getCourses(db: SQLiteDatabase): Promise<Course[]> {
  return db.getAllAsync<Course>('SELECT * FROM cours WHERE is_published=1 ORDER BY display_order');
}

export async function getCourseOverview(db: SQLiteDatabase): Promise<CourseOverview[]> {
  return db.getAllAsync<CourseOverview>(`
    SELECT c.*,cg.title group_title,COALESCE(cg.display_order,999) group_order,
      (SELECT COUNT(*) FROM subjects s WHERE s.course_id=c.id) subject_count,
      (SELECT COUNT(DISTINCT a.subject_id) FROM attempts a JOIN subjects s ON s.id=a.subject_id WHERE s.course_id=c.id AND a.mode='subject') completed_subjects,
      (SELECT COUNT(*) FROM attempts a JOIN subjects s ON s.id=a.subject_id WHERE s.course_id=c.id AND a.mode='subject') attempts_count,
      COALESCE(cp.is_read,0) is_read
    FROM cours c
    LEFT JOIN course_groups cg ON cg.id=c.group_id
    LEFT JOIN course_progress cp ON cp.course_id=c.id
    WHERE c.is_published=1 ORDER BY group_order,c.display_order
  `);
}

export async function markCourseOpened(db: SQLiteDatabase, courseId: number) {
  await db.runAsync(`INSERT INTO course_progress(course_id,last_opened_at) VALUES (?,?)
    ON CONFLICT(course_id) DO UPDATE SET last_opened_at=excluded.last_opened_at`, courseId, new Date().toISOString());
}

export async function markCourseRead(db: SQLiteDatabase, courseId: number) {
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO course_progress(course_id,is_read,last_opened_at,completed_at) VALUES (?,1,?,?)
    ON CONFLICT(course_id) DO UPDATE SET is_read=1,last_opened_at=excluded.last_opened_at,completed_at=COALESCE(course_progress.completed_at,excluded.completed_at)`, courseId, now, now);
}

export async function getCourseReadStatus(db: SQLiteDatabase, courseId: number) {
  const row = await db.getFirstAsync<{ is_read: number }>('SELECT is_read FROM course_progress WHERE course_id=?', courseId);
  return Boolean(row?.is_read);
}

export async function resetAllProgress(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM attempt_answers');
    await db.runAsync('DELETE FROM attempts');
    await db.runAsync('DELETE FROM question_progress');
    await db.runAsync('DELETE FROM course_progress');
  });
}

export async function getDefinitions(db: SQLiteDatabase): Promise<Definition[]> {
  return db.getAllAsync<Definition>('SELECT id,mot,sens,image_path FROM definitions ORDER BY LENGTH(mot) DESC,mot');
}

export async function getCourseSubjects(db: SQLiteDatabase, courseId: number): Promise<Subject[]> {
  return db.getAllAsync<Subject>(
    'SELECT id,course_id,number,title,description,display_order,question_count FROM subjects WHERE course_id=? ORDER BY display_order,number',
    courseId,
  );
}

async function hydrateQuestions(db: SQLiteDatabase, rows: Omit<Question, 'options'>[]): Promise<Question[]> {
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(',');
  const options = await db.getAllAsync<Option & { question_id: number }>(
    `SELECT * FROM options WHERE question_id IN (${placeholders}) ORDER BY question_id,display_order`,
    ...rows.map((row) => row.id),
  );
  const byQuestion = new Map<number, Option[]>();
  options.forEach(({ question_id, ...option }) => {
    const list = byQuestion.get(question_id) ?? [];
    list.push(option);
    byQuestion.set(question_id, list);
  });
  return rows.map((row) => ({ ...row, options: byQuestion.get(row.id) ?? [] }));
}

const QUESTION_COLUMNS = 'id,number,category_id,statement,explanation,image_path,answer_type,source_page';

export async function getSubjectQuestions(db: SQLiteDatabase, categoryId: number, subjectIndex: number) {
  const rows = await db.getAllAsync<Omit<Question, 'options'>>(
    `SELECT ${QUESTION_COLUMNS} FROM questions WHERE category_id=? ORDER BY number LIMIT 20 OFFSET ?`,
    categoryId, (subjectIndex - 1) * 20,
  );
  return hydrateQuestions(db, rows);
}

export async function getCourseSubjectQuestions(db: SQLiteDatabase, subjectId: number) {
  const rows = await db.getAllAsync<Omit<Question, 'options'>>(
    `SELECT ${QUESTION_COLUMNS} FROM questions q
     JOIN subject_questions sq ON sq.question_id=q.id
     WHERE sq.subject_id=? ORDER BY sq.display_order`,
    subjectId,
  );
  return hydrateQuestions(db, rows);
}

export async function getExamQuestions(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Omit<Question, 'options'>>(
    `SELECT ${QUESTION_COLUMNS} FROM questions ORDER BY RANDOM() LIMIT 20`,
  );
  return hydrateQuestions(db, rows);
}

export async function getReviewQuestions(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Omit<Question, 'options'>>(`
    SELECT q.id,q.number,q.category_id,q.statement,q.explanation,q.image_path,q.answer_type,q.source_page
    FROM questions q
    LEFT JOIN question_progress p ON p.question_id=q.id
    WHERE COALESCE(p.is_flagged,0)=1 OR COALESCE(p.times_seen,0)>COALESCE(p.times_correct,0)
    ORDER BY COALESCE(p.times_correct,0)*1.0/NULLIF(p.times_seen,0), RANDOM() LIMIT 20
  `);
  return hydrateQuestions(db, rows);
}

export async function saveAttempt(
  db: SQLiteDatabase,
  input: { mode: QuizMode; categoryId: number | null; subjectIndex: number | null; subjectId?: number | null; questions: Question[]; answers: Record<number, string[]>; startedAt: number },
) {
  const completedAt = Date.now();
  let score = 0;
  const evaluated = input.questions.map((question) => {
    const selected = [...(input.answers[question.id] ?? [])].sort();
    const correct = question.options.filter((option) => option.is_correct).map((option) => option.letter).sort();
    const isCorrect = selected.join(',') === correct.join(',');
    if (isCorrect) score += 1;
    return { question, selected, isCorrect };
  });
  let attemptId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO attempts(mode,category_id,subject_index,subject_id,score,total,started_at,completed_at,duration_seconds)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      input.mode, input.categoryId, input.subjectIndex, input.subjectId ?? null, score, input.questions.length,
      new Date(input.startedAt).toISOString(), new Date(completedAt).toISOString(),
      Math.max(1, Math.round((completedAt - input.startedAt) / 1000)),
    );
    attemptId = result.lastInsertRowId;
    for (const item of evaluated) {
      await db.runAsync(
        'INSERT INTO attempt_answers(attempt_id,question_id,selected_letters,is_correct) VALUES (?,?,?,?)',
        attemptId, item.question.id, item.selected.join(','), item.isCorrect ? 1 : 0,
      );
      await db.runAsync(`
        INSERT INTO question_progress(question_id,times_seen,times_correct,last_seen_at)
        VALUES (?,?,?,?)
        ON CONFLICT(question_id) DO UPDATE SET
          times_seen=times_seen+1,
          times_correct=times_correct+excluded.times_correct,
          last_seen_at=excluded.last_seen_at
      `, item.question.id, 1, item.isCorrect ? 1 : 0, new Date(completedAt).toISOString());
    }
  });
  return { attemptId, score, completedAt };
}

export async function toggleFlag(db: SQLiteDatabase, questionId: number) {
  await db.runAsync(`
    INSERT INTO question_progress(question_id,is_flagged) VALUES (?,1)
    ON CONFLICT(question_id) DO UPDATE SET is_flagged=CASE is_flagged WHEN 1 THEN 0 ELSE 1 END
  `, questionId);
}

export async function getRecentAttempts(db: SQLiteDatabase, limit = 8): Promise<AttemptSummary[]> {
  return db.getAllAsync<AttemptSummary>(`
    SELECT a.id,a.mode,c.name category_name,a.subject_index,a.score,a.total,a.completed_at,a.duration_seconds
    FROM attempts a LEFT JOIN categories c ON c.id=a.category_id
    ORDER BY a.completed_at DESC LIMIT ?
  `, limit);
}

export async function getDashboardStats(db: SQLiteDatabase): Promise<DashboardStats> {
  const totals = await db.getFirstAsync<{ attempts:number; average:number; best:number; answered:number; correct:number }>(`
    SELECT COUNT(DISTINCT a.id) attempts,
      COALESCE(ROUND(AVG(a.score*100.0/a.total)),0) average,
      COALESCE(MAX(ROUND(a.score*100.0/a.total)),0) best,
      COUNT(aa.id) answered,COALESCE(SUM(aa.is_correct),0) correct
    FROM attempts a LEFT JOIN attempt_answers aa ON aa.attempt_id=a.id
  `);
  const weak = await db.getFirstAsync<{ name: string }>(`
    SELECT c.name FROM categories c JOIN questions q ON q.category_id=c.id
    JOIN question_progress p ON p.question_id=q.id WHERE p.times_seen>0
    GROUP BY c.id ORDER BY SUM(p.times_correct)*1.0/SUM(p.times_seen) ASC LIMIT 1
  `);
  return { ...(totals ?? { attempts:0,average:0,best:0,answered:0,correct:0 }), weakCategory: weak?.name ?? null };
}
