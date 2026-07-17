export type Category = {
  id: number;
  name: string;
  description: string | null;
  question_count: number;
  completed_subjects: number;
  best_score: number | null;
};

export type Option = {
  id: number;
  letter: string;
  text: string;
  is_correct: number;
  display_order: number;
};

export type Question = {
  id: number;
  number: number;
  category_id: number;
  statement: string;
  explanation: string | null;
  image_path: string | null;
  answer_type: 'single' | 'multiple';
  source_page: number;
  options: Option[];
};

export type Course = {
  id: number;
  title: string;
  content_markdown: string;
  display_order: number;
  is_published: number;
};

export type CourseOverview = Course & {
  group_title: string | null;
  group_order: number;
  subject_count: number;
  completed_subjects: number;
  attempts_count: number;
  is_read: number;
};

export type Definition = {
  id: number;
  mot: string;
  sens: string;
  image_path: string | null;
};

export type Subject = {
  id: number;
  course_id: number;
  number: number;
  title: string;
  description: string | null;
  display_order: number;
  question_count: number;
};

export type AttemptSummary = {
  id: number;
  mode: 'subject' | 'exam' | 'review';
  category_name: string | null;
  subject_index: number | null;
  score: number;
  total: number;
  completed_at: string;
  duration_seconds: number;
};

export type DashboardStats = {
  attempts: number;
  average: number;
  best: number;
  answered: number;
  correct: number;
  weakCategory: string | null;
};

export type QuizMode = 'subject' | 'exam' | 'review';

export type QuizSession = {
  mode: QuizMode;
  categoryId: number | null;
  categoryName: string | null;
  subjectIndex: number | null;
  subjectId?: number | null;
  questions: Question[];
  answers: Record<number, string[]>;
  startedAt: number;
};

export type QuizResult = QuizSession & {
  attemptId: number;
  score: number;
  completedAt: number;
};
