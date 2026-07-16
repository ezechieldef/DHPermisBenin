import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, Screen } from '@/src/components/ui';
import { getCourses } from '@/src/db/queries';
import type { Course } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

export default function CoursesScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => { getCourses(db).then(setCourses); }, [db]);
  if (!courses) return <Loading />;
  return <Screen><Heading eyebrow="Comprendre avant de mémoriser" title="Les cours" subtitle="Des notions courtes, illustrées et disponibles sans connexion." />
    {courses.map((course, index) => <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}`)} className="mb-4 active:opacity-80"><Card className="p-0"><View className="h-40 justify-end overflow-hidden rounded-t-3xl bg-primarySoft p-5"><View className="absolute -right-5 -top-8 h-40 w-40 rounded-full bg-primary/10"/><Ionicons name="book" size={44} color={colors.primary} /><Text className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">Chapitre {index + 1}</Text></View><View className="flex-row items-center p-5"><View className="flex-1"><Text className="text-xl font-black text-ink">{course.title}</Text><Text className="mt-1 text-sm text-inkMuted">Illustrations • Audio • Lecture hors ligne</Text></View><Ionicons name="arrow-forward-circle" size={34} color={colors.primary} /></View></Card></Pressable>)}
  </Screen>;
}
