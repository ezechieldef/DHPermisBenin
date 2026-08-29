import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, Screen } from '@/src/components/ui';
import { BrandFooter } from '@/src/components/brand-footer';
import { getExamLots, getExamQuestions } from '@/src/db/queries';
import type { ExamLot } from '@/src/types/models';
import { useQuiz } from '@/src/features/quiz-context';
import { useThemePreferences } from '@/src/theme/preferences';
import { colors } from '@/src/theme/colors';

export default function ExamScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const quiz = useQuiz(); const { selectedPermitTypes } = useThemePreferences();
  const [lots, setLots] = useState<ExamLot[] | null>(null);
  const loadLots = useCallback(() => { void getExamLots(db, selectedPermitTypes).then(setLots); }, [db, selectedPermitTypes]);
  useEffect(loadLots, [loadLots]);
  const start = async (lot: ExamLot) => { const questions = await getExamQuestions(db, lot.index, selectedPermitTypes); if (!questions.length) return Alert.alert('Sujet vide', 'Aucune question de ce lot ne correspond aux permis sélectionnés.'); quiz.start({ mode:'exam', categoryId:null, categoryName:`Examen • Lot ${lot.index}`, subjectIndex:lot.index, questions, answers:{}, startedAt:Date.now() }); router.push('/quiz'); };
  if (lots === null) return <Loading />;
  return <Screen><Heading eyebrow={`${lots.length} lots disponibles`} title="Sujets d’examen" subtitle="Chaque lot suit l’ordre officiel des questions et tient compte des catégories de permis sélectionnées." />
    <Card className="mb-6"><Rule icon="list" text="Lots ordonnés par tranches de 50 questions"/><Rule icon="funnel" text="Questions filtrées selon vos permis"/><Rule icon="save" text="Dernière note enregistrée sous chaque lot"/><Rule icon="wifi" text="Fonctionne entièrement hors ligne" last /></Card>
    <View className="gap-3">{lots.map((lot) => <Pressable key={lot.index} accessibilityRole="button" accessibilityLabel={`Commencer le lot ${lot.index}`} onPress={() => void start(lot)} className="active:opacity-80"><Card className="flex-row items-center"><View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-primarySoft"><Text className="text-xl font-black text-primary">{lot.index}</Text></View><View className="flex-1"><Text className="text-lg font-black text-ink">Lot {lot.index}</Text><Text className="mt-1 text-sm text-inkMuted">Questions N°{lot.firstQuestionNumber} à {lot.lastQuestionNumber}</Text><Text className="mt-1 text-sm font-bold text-primary">{lot.questionCount} question{lot.questionCount > 1 ? 's' : ''} pour vos permis</Text>{lot.lastScore === null || lot.lastTotal === null ? <Text className="mt-2 text-xs font-semibold text-inkMuted">Pas encore passé</Text> : <Text className="mt-2 text-xs font-bold text-ink">Dernière note : {lot.lastScore}/{lot.lastTotal} • {Math.round(lot.lastScore / lot.lastTotal * 100)}%</Text>}</View><Ionicons name="play-circle" size={36} color={colors.primary}/></Card></Pressable>)}</View>
    <Text className="mt-4 text-center text-sm leading-5 text-inkMuted">Le permis B est toujours inclus. Les lots sans question correspondante ne sont pas affichés.</Text>
    <BrandFooter />
  </Screen>;
}

function Rule({ icon, text, last=false }: { icon:keyof typeof Ionicons.glyphMap; text:string; last?:boolean }) { return <View className={`flex-row items-center py-3 ${last?'':'border-b border-border'}`}><Ionicons name={icon} size={21} color={colors.primary}/><Text className="ml-3 flex-1 font-semibold text-ink">{text}</Text></View>; }
