import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { ResetProgressButton } from '@/src/components/reset-progress-button';
import { BrandFooter } from '@/src/components/brand-footer';
import { Card, EmptyState, Heading, ProgressBar, Screen } from '@/src/components/ui';
import { getDashboardStats, getRecentAttempts, resetAllProgress } from '@/src/db/queries';
import type { AttemptSummary, DashboardStats } from '@/src/types/models';
import { colors } from '@/src/theme/colors';
import { PwaInstallCard } from '@/src/components/pwa-install-card';

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<AttemptSummary[]>([]);

  const reload = useCallback(async () => {
    const [nextStats, nextHistory] = await Promise.all([getDashboardStats(db), getRecentAttempts(db, 30)]);
    setStats(nextStats);
    setHistory(nextHistory);
  }, [db]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const reset = async () => {
    await resetAllProgress(db);
    await reload();
  };

  if (stats && !stats.attempts) return <Screen>
    <Heading title="Votre progression" subtitle="Vos résultats apparaîtront ici après votre premier sujet." />
    <EmptyState icon="stats-chart" title="Votre parcours commence ici" message="Terminez un sujet ou une simulation pour obtenir vos premières statistiques." />
    <ResetProgressButton onReset={reset} />
    <PwaInstallCard />
    <BrandFooter />
  </Screen>;

  return <Screen>
    <Heading eyebrow="Historique local" title="Votre progression" subtitle="Suivez vos résultats et concentrez-vous sur les notions qui demandent encore de l’attention." />
    <View className="mb-5 flex-row gap-3"><Stat label="Moyenne" value={`${stats?.average ?? 0}%`} icon="analytics" /><Stat label="Meilleur" value={`${stats?.best ?? 0}%`} icon="trophy" /></View>
    <Card className="mb-6"><View className="mb-3 flex-row justify-between"><Text className="font-black text-ink">Précision globale</Text><Text className="font-black text-primary">{stats?.answered ? Math.round(stats.correct / stats.answered * 100) : 0}%</Text></View><ProgressBar value={stats?.answered ? stats.correct / stats.answered * 100 : 0} /><Text className="mt-3 text-sm text-inkMuted">{stats?.correct ?? 0} bonnes réponses sur {stats?.answered ?? 0}</Text></Card>
    {stats?.weakCategory ? <Card className="mb-6 border-secondary bg-secondarySoft"><Text className="text-xs font-bold uppercase tracking-widest text-inkMuted">Priorité de révision</Text><Text className="mt-2 text-lg font-black text-ink">{stats.weakCategory}</Text></Card> : null}
    <Text className="mb-3 text-xl font-black text-ink">Historique</Text>
    {history.map((item) => <View key={item.id} className="mb-3 flex-row items-center rounded-2xl border border-border bg-surface p-4"><View className={`mr-3 h-12 w-12 items-center justify-center rounded-xl ${item.score / item.total >= .75 ? 'bg-primarySoft' : 'bg-dangerSoft'}`}><Text className={`font-black ${item.score / item.total >= .75 ? 'text-primary' : 'text-danger'}`}>{item.score}/{item.total}</Text></View><View className="flex-1"><Text className="font-bold text-ink">{item.mode === 'exam' ? 'Simulation d’examen' : item.category_name ?? 'Révision ciblée'}</Text><Text className="mt-1 text-xs text-inkMuted">{new Date(item.completed_at).toLocaleDateString('fr-FR')} • {Math.floor(item.duration_seconds / 60)} min</Text></View><Text className="font-black text-ink">{Math.round(item.score / item.total * 100)}%</Text></View>)}
    <ResetProgressButton onReset={reset} />
    <BrandFooter />
  </Screen>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <Card className="flex-1"><Ionicons name={icon} size={25} color={colors.primary} /><Text className="mt-3 text-3xl font-black text-ink">{value}</Text><Text className="text-sm text-inkMuted">{label}</Text></Card>;
}
