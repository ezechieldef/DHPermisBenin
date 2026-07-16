import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, ProgressBar, Screen } from '@/src/components/ui';
import { getCategories } from '@/src/db/queries';
import type { Category } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

export default function TrainingScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const [categories, setCategories] = useState<Category[] | null>(null);
  useFocusEffect(useCallback(() => { getCategories(db).then(setCategories); }, [db]));
  if (!categories) return <Loading />;
  return <Screen><Heading eyebrow="Entraînement par thème" title="Choisissez une catégorie" subtitle="Chaque sujet contient jusqu’à 20 questions. Votre historique reste sur cet appareil." />
    {categories.map((category, index) => { const subjects = Math.ceil(category.question_count / 20); const progress = subjects ? Math.min(100, category.completed_subjects / subjects * 100) : 0; return <Pressable key={category.id} onPress={() => router.push(`/category/${category.id}`)} className="mb-4 active:opacity-80"><Card><View className="flex-row items-start"><View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-primarySoft"><Text className="text-lg font-black text-primary">{index + 1}</Text></View><View className="flex-1"><Text className="text-lg font-black leading-6 text-ink">{category.name}</Text><Text className="mt-1 text-sm text-inkMuted">{category.question_count} questions • {subjects} sujet{subjects > 1 ? 's' : ''}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.inkMuted} /></View><View className="mt-4"><View className="mb-2 flex-row justify-between"><Text className="text-xs font-bold text-inkMuted">{category.completed_subjects}/{subjects} terminés</Text><Text className="text-xs font-bold text-primary">{Math.round(progress)}%</Text></View><ProgressBar value={progress} /></View></Card></Pressable>; })}
  </Screen>;
}
