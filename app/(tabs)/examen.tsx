import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, Screen } from '@/src/components/ui';
import { BrandFooter } from '@/src/components/brand-footer';
import { getDifficultSubjectCatalog, getDifficultSubjectQuestions, getExamLots, getExamQuestions } from '@/src/db/queries';
import type { DifficultSubjectCatalog, ExamLot } from '@/src/types/models';
import { useQuiz } from '@/src/features/quiz-context';
import { useThemePreferences } from '@/src/theme/preferences';
import { colors } from '@/src/theme/colors';

export default function ExamScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const quiz = useQuiz(); const { selectedPermitTypes } = useThemePreferences();
  const [lots, setLots] = useState<ExamLot[] | null>(null);
  const [difficultCatalog, setDifficultCatalog] = useState<DifficultSubjectCatalog | null>(null);
  const loadLots = useCallback(() => { void Promise.all([getExamLots(db, selectedPermitTypes), getDifficultSubjectCatalog(db)]).then(([nextLots, catalog]) => { setLots(nextLots); setDifficultCatalog(catalog); }); }, [db, selectedPermitTypes]);
  useEffect(loadLots, [loadLots]);
  const start = async (lot: ExamLot) => { const questions = await getExamQuestions(db, lot.index, selectedPermitTypes); if (!questions.length) return Alert.alert('Sujet vide', 'Aucune question de ce lot ne correspond aux permis sélectionnés.'); quiz.start({ mode:'exam', categoryId:null, categoryName:`Examen • Lot ${lot.index}`, subjectIndex:lot.index, questions, answers:{}, startedAt:Date.now() }); router.push('/quiz'); };
  const startDifficultSubject = async (index: number) => { const questions = await getDifficultSubjectQuestions(db, index); if (questions.length < 10) return Alert.alert('Sujet incomplet', 'Il faut 10 questions distinctes ratées pour créer ce sujet.'); quiz.start({ mode:'review', categoryId:null, categoryName:`Sujet difficile ${index}`, subjectIndex:index, questions, answers:{}, startedAt:Date.now() }); router.push('/quiz'); };
  if (lots === null || difficultCatalog === null) return <Loading />;
  return <Screen><Heading eyebrow={`${lots.length} lots disponibles`} title="Sujets d’examen" subtitle="Chaque lot suit l’ordre officiel des questions et tient compte des catégories de permis sélectionnées." />
    <Card className="mb-6"><Rule icon="list" text="Lots ordonnés par tranches de 50 questions"/><Rule icon="funnel" text="Questions filtrées selon vos permis"/><Rule icon="save" text="Dernière note enregistrée sous chaque lot"/><Rule icon="wifi" text="Fonctionne entièrement hors ligne" last /></Card>
    <View className="mb-7"><Text className="text-2xl font-black text-ink">Réviser mes erreurs</Text><Text className="mb-4 mt-2 text-sm leading-5 text-inkMuted">Un sujet difficile personnel est créé pour chaque groupe de 10 questions distinctes ratées.</Text>{difficultCatalog.subjects.length ? <View className="gap-3">{difficultCatalog.subjects.map((subject) => <Pressable key={subject.index} accessibilityRole="button" accessibilityLabel={`Commencer le sujet difficile ${subject.index}`} onPress={() => void startDifficultSubject(subject.index)} className="active:opacity-80"><Card className="flex-row items-center"><View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-dangerSoft"><Ionicons name="fitness" size={27} color={colors.danger}/></View><View className="flex-1"><Text className="text-lg font-black text-ink">Sujet difficile {subject.index}</Text><Text className="mt-1 text-sm font-bold text-danger">10 questions personnelles</Text>{subject.lastScore === null || subject.lastTotal === null ? <Text className="mt-2 text-xs font-semibold text-inkMuted">Pas encore passé</Text> : <Text className="mt-2 text-xs font-bold text-ink">Dernière note : {subject.lastScore}/{subject.lastTotal} • {Math.round(subject.lastScore / subject.lastTotal * 100)}%</Text>}</View><Ionicons name="play-circle" size={36} color={colors.danger}/></Card></Pressable>)}</View> : <Card><Text className="font-black text-ink">Aucun sujet difficile pour le moment</Text><Text className="mt-2 text-sm leading-5 text-inkMuted">Vos questions ratées apparaîtront ici dès que vous en aurez accumulé 10 différentes.</Text></Card>}<Text className="mt-3 text-center text-xs font-bold text-inkMuted">{difficultCatalog.pendingErrorCount}/10 vers le prochain sujet • {difficultCatalog.distinctErrorCount} erreur{difficultCatalog.distinctErrorCount > 1 ? 's' : ''} distincte{difficultCatalog.distinctErrorCount > 1 ? 's' : ''}</Text></View>
    <Text className="mb-4 text-2xl font-black text-ink">Lots d’examen</Text>
    <View className="gap-3">{lots.map((lot) => <Pressable key={lot.index} accessibilityRole="button" accessibilityLabel={`Commencer le lot ${lot.index}`} onPress={() => void start(lot)} className="active:opacity-80"><Card className="flex-row items-center"><View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-primarySoft"><Text className="text-xl font-black text-primary">{lot.index}</Text></View><View className="flex-1"><Text className="text-lg font-black text-ink">Lot {lot.index}</Text><Text className="mt-1 text-sm text-inkMuted">Questions N°{lot.firstQuestionNumber} à {lot.lastQuestionNumber}</Text><Text className="mt-1 text-sm font-bold text-primary">{lot.questionCount} question{lot.questionCount > 1 ? 's' : ''} pour vos permis</Text>{lot.lastScore === null || lot.lastTotal === null ? <Text className="mt-2 text-xs font-semibold text-inkMuted">Pas encore passé</Text> : <Text className="mt-2 text-xs font-bold text-ink">Dernière note : {lot.lastScore}/{lot.lastTotal} • {Math.round(lot.lastScore / lot.lastTotal * 100)}%</Text>}</View><Ionicons name="play-circle" size={36} color={colors.primary}/></Card></Pressable>)}</View>
    <Text className="mt-4 text-center text-sm leading-5 text-inkMuted">Le permis B est toujours inclus. Les lots sans question correspondante ne sont pas affichés.</Text>
    <BrandFooter />
  </Screen>;
}

function Rule({ icon, text, last=false }: { icon:keyof typeof Ionicons.glyphMap; text:string; last?:boolean }) { return <View className={`flex-row items-center py-3 ${last?'':'border-b border-border'}`}><Ionicons name={icon} size={21} color={colors.primary}/><Text className="ml-3 flex-1 font-semibold text-ink">{text}</Text></View>; }
