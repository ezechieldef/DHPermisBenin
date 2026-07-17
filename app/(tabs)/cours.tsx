import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, ProgressBar, Screen } from '@/src/components/ui';
import { BrandFooter } from '@/src/components/brand-footer';
import { ResetProgressButton } from '@/src/components/reset-progress-button';
import { getCourseOverview, resetAllProgress } from '@/src/db/queries';
import type { CourseOverview } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

export default function CoursesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOverview[] | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getCourseOverview(db).then((items) => { if (active) setCourses(items); });
    return () => { active = false; };
  }, [db]));

  const groups = useMemo(() => {
    const result = new Map<string, CourseOverview[]>();
    for (const course of courses ?? []) {
      const key = course.group_title || 'Autres cours';
      result.set(key, [...(result.get(key) ?? []), course]);
    }
    return [...result.entries()];
  }, [courses]);

  if (!courses) return <Loading />;

  const readCount = courses.filter((course) => Boolean(course.is_read)).length;
  const totalSubjects = courses.reduce((total, course) => total + Number(course.subject_count), 0);
  const completedSubjects = courses.reduce((total, course) => total + Number(course.completed_subjects), 0);
  const attempts = courses.reduce((total, course) => total + Number(course.attempts_count), 0);
  const readingProgress = courses.length ? Math.round((readCount / courses.length) * 100) : 0;

  return <Screen>
    <Heading eyebrow="Votre parcours" title="Cours et entraînements" subtitle="Apprenez chapitre par chapitre et suivez précisément votre avancement." />

    <Card className="mb-6 overflow-hidden" style={{ backgroundColor: colors.progressBackground, borderColor: colors.progressBorder }}>
      <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/20" />
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-widest text-primary">Progression des cours</Text>
          <Text className="mt-2 text-3xl font-black" style={{ color: colors.progressText }}>{readCount} sur {courses.length} lus</Text>
        </View>
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <Ionicons name="book" size={28} color={colors.secondary} />
        </View>
      </View>
      <View className="mt-5"><ProgressBar value={readingProgress} color={colors.secondary} /></View>
      <Text className="mt-3 text-sm font-semibold" style={{ color: colors.progressText }}>{readingProgress}% du parcours de lecture</Text>
    </Card>

    <View className="mb-7 flex-row gap-3">
      <Card className="flex-1 p-4">
        <Ionicons name="checkmark-done-circle" size={24} color={colors.primary} />
        <Text className="mt-2 text-2xl font-black text-ink">{completedSubjects}/{totalSubjects}</Text>
        <Text className="mt-1 text-xs font-semibold leading-4 text-inkMuted">Sujets effectués</Text>
      </Card>
      <Card className="flex-1 p-4">
        <Ionicons name="repeat" size={24} color={colors.secondary} />
        <Text className="mt-2 text-2xl font-black text-ink">{attempts}</Text>
        <Text className="mt-1 text-xs font-semibold leading-4 text-inkMuted">Compositions au total</Text>
      </Card>
    </View>

    {groups.map(([group, items], groupIndex) => <View key={group} className="mb-7">
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-primarySoft"><Text className="font-black text-primary">{groupIndex + 1}</Text></View>
        <Text className="flex-1 text-lg font-black text-ink">{group}</Text>
      </View>
      {items.map((course) => <CourseCard key={course.id} course={course} onPress={() => router.push(`/course/${course.id}`)} />)}
    </View>)}
    <ResetProgressButton onReset={async () => { await resetAllProgress(db); setCourses(await getCourseOverview(db)); }} />
    <BrandFooter />
  </Screen>;
}

function CourseCard({ course, onPress }: { course: CourseOverview; onPress: () => void }) {
  const done = Number(course.completed_subjects);
  const total = Number(course.subject_count);
  const progress = total ? Math.round((done / total) * 100) : 0;
  const read = Boolean(course.is_read);

  return <Pressable onPress={onPress} className="mb-3 active:opacity-80">
    <Card className="p-4">
      <View className="flex-row items-start">
        <View className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl ${read ? 'bg-primary' : 'bg-primarySoft'}`}>
          <Ionicons name={read ? 'checkmark' : 'book-outline'} size={24} color={read ? colors.white : colors.primary} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start gap-2">
            <Text className="flex-1 text-base font-black leading-5 text-ink">{course.title}</Text>
            <View className={`rounded-full px-2.5 py-1 ${read ? 'bg-primarySoft' : 'bg-background'}`}>
              <Text className={`text-[11px] font-extrabold ${read ? 'text-primary' : 'text-inkMuted'}`}>{read ? 'LU' : 'À LIRE'}</Text>
            </View>
          </View>
          <Text className="mt-2 text-xs font-semibold text-inkMuted">{done}/{total} sujets effectués · {course.attempts_count} composition{Number(course.attempts_count) > 1 ? 's' : ''}</Text>
          <View className="mt-3"><ProgressBar value={progress} /></View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} style={{ marginLeft: 8, marginTop: 16 }} />
      </View>
    </Card>
  </Pressable>;
}
