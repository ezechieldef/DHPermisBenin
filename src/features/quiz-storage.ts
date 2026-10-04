import type { QuizResult, QuizSession } from '@/src/types/models';

export type QuizSnapshot = {
  session: QuizSession | null;
  result: QuizResult | null;
  index: number;
  submittedQuestionIds: number[];
};
export const EMPTY_QUIZ: QuizSnapshot = { session: null, result: null, index: 0, submittedQuestionIds: [] };
const KEY = 'dhp-quiz-session-v1';

// Tab-scoped storage survives reloads without mixing independent browser tabs.
export function restoreQuiz(storage: Pick<Storage, 'getItem'>): QuizSnapshot {
  try {
    const value = JSON.parse(storage.getItem(KEY) || 'null');
    const session = value?.session;
    if (!session || !Array.isArray(session.questions) || !session.questions.length || !session.answers
      || !['subject', 'exam', 'review'].includes(session.mode) || !Number.isFinite(session.startedAt)
      || !Number.isInteger(value.index) || value.index < 0 || value.index >= session.questions.length
      || !Array.isArray(value.submittedQuestionIds)) return EMPTY_QUIZ;
    return value;
  } catch { return EMPTY_QUIZ; }
}

export function persistQuiz(storage: Pick<Storage, 'setItem' | 'removeItem'>, value: QuizSnapshot) {
  if (value.session) storage.setItem(KEY, JSON.stringify(value));
  else storage.removeItem(KEY);
}
