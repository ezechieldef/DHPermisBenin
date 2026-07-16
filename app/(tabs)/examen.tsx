import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, PrimaryButton, Screen } from '@/src/components/ui';
import { getExamQuestions } from '@/src/db/queries';
import { useQuiz } from '@/src/features/quiz-context';
import { colors } from '@/src/theme/colors';

export default function ExamScreen() {
  const db = useSQLiteContext(); const router = useRouter(); const quiz = useQuiz();
  const start = async () => { const questions = await getExamQuestions(db); if (questions.length < 20) return Alert.alert('Questions insuffisantes'); quiz.start({ mode:'exam', categoryId:null, categoryName:'Simulation d’examen', subjectIndex:null, questions, answers:{}, startedAt:Date.now() }); router.push('/quiz'); };
  return <Screen><Heading eyebrow="Mise en situation" title="Simulation d’examen" subtitle="20 questions équilibrées pour mesurer votre niveau dans les conditions d’un test." />
    <View className="mb-6 items-center rounded-4xl bg-ink px-6 py-10"><View className="h-24 w-24 items-center justify-center rounded-full bg-white/10"><Ionicons name="school" size={48} color={colors.secondary} /></View><Text className="mt-6 text-center text-3xl font-black text-white">20 questions</Text><Text className="mt-2 text-center text-base leading-6 text-white/70">La correction et la note apparaissent uniquement à la fin.</Text></View>
    <Card className="mb-6"><Rule icon="shuffle" text="Questions tirées aléatoirement"/><Rule icon="eye-off" text="Pas d’indication pendant l’épreuve"/><Rule icon="save" text="Résultat enregistré automatiquement"/><Rule icon="wifi" text="Fonctionne entièrement hors ligne" last /></Card>
    <PrimaryButton label="Commencer l’examen" icon="play" onPress={start} />
    <Text className="mt-4 text-center text-sm leading-5 text-inkMuted">Prenez votre temps. L’objectif est de comprendre vos erreurs et de progresser.</Text>
  </Screen>;
}

function Rule({ icon, text, last=false }: { icon:keyof typeof Ionicons.glyphMap; text:string; last?:boolean }) { return <View className={`flex-row items-center py-3 ${last?'':'border-b border-border'}`}><Ionicons name={icon} size={21} color={colors.primary}/><Text className="ml-3 flex-1 font-semibold text-ink">{text}</Text></View>; }
