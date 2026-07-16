import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import type { QuizResult, QuizSession } from '@/src/types/models';

type QuizContextValue = {
  session: QuizSession | null;
  result: QuizResult | null;
  start: (session: QuizSession) => void;
  answer: (questionId: number, letters: string[]) => void;
  finish: (data: { attemptId: number; score: number; completedAt: number }) => void;
  reset: () => void;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const value = useMemo<QuizContextValue>(() => ({
    session,
    result,
    start: (next) => { setSession(next); setResult(null); },
    answer: (questionId, letters) => setSession((current) => current ? ({ ...current, answers: { ...current.answers, [questionId]: letters } }) : current),
    finish: (data) => {
      if (session) setResult({ ...session, ...data });
    },
    reset: () => { setSession(null); setResult(null); },
  }), [session, result]);
  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const value = useContext(QuizContext);
  if (!value) throw new Error('useQuiz doit être utilisé dans QuizProvider');
  return value;
}
