import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, ProgressBar, Screen } from '@/src/components/ui';
import { getDashboardStats, getRecentAttempts } from '@/src/db/queries';
import type { AttemptSummary, DashboardStats } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

const emptyStats: DashboardStats = { attempts: 0, average: 0, best: 0, answered: 0, correct: 0, weakCategory: null };

export default function HomeScreen() {
  const db = useSQLiteContext(); const router = useRouter();
  const [stats, setStats] = useState(emptyStats); const [recent, setRecent] = useState<AttemptSummary[]>([]);
  useFocusEffect(useCallback(() => { Promise.all([getDashboardStats(db), getRecentAttempts(db, 3)]).then(([s, r]) => { setStats(s); setRecent(r); }); }, [db]));
  return <Screen>
    <Heading eyebrow="DHP Prépa Permis Bénin" title="Bonjour 👋" subtitle="Une petite séance aujourd’hui vous rapproche du permis." />
    <Card className="mb-5 overflow-hidden border-0 bg-ink">
      <View className="mb-5 flex-row items-start justify-between"><View className="flex-1"><Text className="text-sm font-bold text-primarySoft">VOTRE PROGRESSION</Text><Text className="mt-2 text-4xl font-black text-white">{stats.average}%</Text><Text className="mt-1 text-white/70">Moyenne sur {stats.attempts} session{stats.attempts > 1 ? 's' : ''}</Text></View><View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/10"><Ionicons name="trophy" size={31} color={colors.secondary} /></View></View>
      <ProgressBar value={stats.average} color={colors.secondary} />
      <Pressable onPress={() => router.push('/(tabs)/entrainement')} className="mt-5 min-h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80"><Text className="text-base font-extrabold text-white">Continuer ma révision</Text></Pressable>
    </Card>
    <View className="mb-5 flex-row gap-3"><Card className="flex-1"><Ionicons name="checkmark-circle" size={25} color={colors.primary} /><Text className="mt-3 text-2xl font-black text-ink">{stats.correct}</Text><Text className="text-sm text-inkMuted">Bonnes réponses</Text></Card><Card className="flex-1"><Ionicons name="sparkles" size={25} color={colors.secondary} /><Text className="mt-3 text-2xl font-black text-ink">{stats.best}%</Text><Text className="text-sm text-inkMuted">Meilleur score</Text></Card></View>
    {stats.weakCategory ? <Card className="mb-5 border-secondary bg-secondarySoft"><View className="flex-row gap-4"><Ionicons name="bulb" size={27} color="#9A6A00" /><View className="flex-1"><Text className="font-black text-ink">À renforcer</Text><Text className="mt-1 leading-5 text-inkMuted">{stats.weakCategory}</Text></View></View></Card> : null}
    <Text className="mb-3 text-xl font-black text-ink">Accès rapide</Text>
    <View className="mb-6 flex-row gap-3"><Quick icon="book" label="Lire le cours" onPress={() => router.push('/(tabs)/cours')} /><Quick icon="school" label="Examen blanc" onPress={() => router.push('/(tabs)/examen')} /></View>
    {recent.length ? <><Text className="mb-3 text-xl font-black text-ink">Activité récente</Text>{recent.map((item) => <View key={item.id} className="mb-3 flex-row items-center rounded-2xl bg-surface p-4"><View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-primarySoft"><Text className="font-black text-primary">{item.score}/{item.total}</Text></View><View className="flex-1"><Text className="font-bold text-ink">{item.mode === 'exam' ? 'Simulation d’examen' : item.category_name ?? 'Révision'}</Text><Text className="text-sm text-inkMuted">{new Date(item.completed_at).toLocaleDateString('fr-FR')}</Text></View></View>)}</> : null}
  </Screen>;
}

function Quick({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} className="flex-1 items-center rounded-3xl border border-border bg-surface p-5 active:bg-primarySoft"><View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-primarySoft"><Ionicons name={icon} size={24} color={colors.primary} /></View><Text className="text-center font-extrabold text-ink">{label}</Text></Pressable>;
}
