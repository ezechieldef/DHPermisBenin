import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, Screen } from '@/src/components/ui';
import { getCategories, getCategorySubjectLastResults, getFilteredCategoryQuestionCount, getSubjectQuestions } from '@/src/db/queries';
import { useQuiz } from '@/src/features/quiz-context';
import { useThemePreferences } from '@/src/theme/preferences';
import type { Category, SubjectLastResult } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const quiz = useQuiz();
  const { selectedPermitTypes } = useThemePreferences();
  const [category, setCategory] = useState<Category | null | undefined>();
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<SubjectLastResult[] | null>(null);

  useEffect(() => {
    Promise.all([getCategories(db), getFilteredCategoryQuestionCount(db, categoryId, selectedPermitTypes), getCategorySubjectLastResults(db, categoryId)])
      .then(([list, count, results]) => {
        setCategory(list.find((item) => item.id === categoryId) ?? null);
        setQuestionCount(count);
        setLastResults(results);
      });
  }, [categoryId, db, selectedPermitTypes]);

  if (category === undefined || questionCount === null || lastResults === null) return <Loading />;
  if (!category) return <Screen><Text>Catégorie introuvable.</Text></Screen>;
  const subjects = Math.ceil(questionCount / 20);

  const start = async (index: number) => {
    const questions = await getSubjectQuestions(db, categoryId, index, selectedPermitTypes);
    if (!questions.length) return Alert.alert('Sujet vide', 'Aucune question ne correspond aux types de permis sélectionnés.');
    quiz.start({ mode: 'subject', categoryId, categoryName: category.name, subjectIndex: index, questions, answers: {}, startedAt: Date.now() });
    router.push('/quiz');
  };

  return <Screen>
    <Heading eyebrow={`${questionCount} questions`} title={category.name} subtitle="Les sujets utilisent uniquement les types de permis sélectionnés dans vos réglages." />
    {Array.from({ length: subjects }, (_, index) => index + 1).map((index) => { const lastResult = lastResults.find((result) => result.subjectIndex === index); const passed = lastResult ? lastResult.score / lastResult.total >= .75 : false; return <Pressable key={index} onPress={() => start(index)} className="mb-3 active:opacity-80">
      <Card className="flex-row items-center">
        <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-primarySoft"><Text className="text-lg font-black text-primary">{index}</Text></View>
        <View className="flex-1"><Text className="text-lg font-black text-ink">Sujet {index}</Text><Text className="mt-1 text-sm text-inkMuted">{Math.min(20, questionCount - (index - 1) * 20)} questions</Text>{lastResult ? <Text className={`mt-2 text-xs font-black ${passed ? 'text-primary' : 'text-danger'}`}>Dernière note : {lastResult.score}/{lastResult.total} • {Math.round(lastResult.score / lastResult.total * 100)}%</Text> : <Text className="mt-2 text-xs font-semibold text-inkMuted">Pas encore traité</Text>}</View>
        <Ionicons name="play-circle" size={34} color={colors.primary} />
      </Card>
    </Pressable>; })}
  </Screen>;
}
