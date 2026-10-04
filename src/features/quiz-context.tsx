import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizResult, QuizSession } from '@/src/types/models';
import { Loading } from '@/src/components/ui';
import { EMPTY_QUIZ, persistQuiz, restoreQuiz, type QuizSnapshot } from './quiz-storage';

type QuizContextValue = {
  session: QuizSession | null;
  result: QuizResult | null;
  index: number;
  submittedQuestionIds: number[];
  setIndex: (next: number | ((current: number) => number)) => void;
  submitQuestion: (questionId: number) => void;
  start: (session: QuizSession) => void;
  answer: (questionId: number, letters: string[]) => void;
  finish: (session: QuizSession, data: { attemptId: number; score: number; completedAt: number }) => void;
  reset: () => void;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(EMPTY_QUIZ);
  const current = useRef(snapshot);
  const [ready, setReady] = useState(process.env.EXPO_OS !== 'web');
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    try { current.current = restoreQuiz(window.sessionStorage); }
    catch { current.current = EMPTY_QUIZ; }
    setSnapshot(current.current);
    setReady(true);
  }, []);

  const value = useMemo<QuizContextValue>(() => {
    const commit = (update: (previous: QuizSnapshot) => QuizSnapshot) => {
      const next = update(current.current);
      current.current = next;
      // Save during the action, before an iOS tab can be suspended or reloaded.
      if (process.env.EXPO_OS === 'web') {
        try { persistQuiz(window.sessionStorage, next); }
        catch (error) { console.warn('Sauvegarde de la session indisponible', error); }
      }
      setSnapshot(next);
    };
    return {
      ...snapshot,
      setIndex: (next) => commit((state) => ({ ...state, index: typeof next === 'function' ? next(state.index) : next })),
      submitQuestion: (id) => commit((state) => ({ ...state, submittedQuestionIds: [...new Set([...state.submittedQuestionIds, id])] })),
      start: (session) => commit(() => ({ ...EMPTY_QUIZ, session })),
      answer: (id, letters) => commit((state) => state.session ? ({ ...state, session: { ...state.session, answers: { ...state.session.answers, [id]: letters } } }) : state),
      finish: (completedSession, data) => commit((state) => ({ ...state, session: completedSession, result: { ...completedSession, ...data } })),
      reset: () => commit(() => EMPTY_QUIZ),
    };
  }, [snapshot]);
  return <QuizContext.Provider value={value}>{ready ? children : <Loading />}</QuizContext.Provider>;
}

export function useQuiz() {
  const value = useContext(QuizContext);
  if (!value) throw new Error('useQuiz doit être utilisé dans QuizProvider');
  return value;
}
