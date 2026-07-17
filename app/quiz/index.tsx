import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { QuizAudioPlayer } from '@/src/components/quiz-audio-player';
import { CourseImageViewer, type ViewerImage } from '@/src/components/course-image-viewer';
import { PrimaryButton, ProgressBar, Screen } from '@/src/components/ui';
import { saveAttempt, toggleFlag } from '@/src/db/queries';
import { useQuiz } from '@/src/features/quiz-context';
import { QUESTION_IMAGES } from '@/src/services/question-images';
import { getQuizAudio } from '@/src/services/audio-assets';
import { colors } from '@/src/theme/colors';

export default function QuizScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const quiz = useQuiz();
  const [index, setIndex] = useState(0);
  const [focusedOption, setFocusedOption] = useState(0);
  const [busy, setBusy] = useState(false);
  const [viewerImage, setViewerImage] = useState<ViewerImage>(null);
  const contentScrollRef = useRef<ScrollView>(null);
  const session = quiz.session;
  const question = session?.questions[index];
  const selected = useMemo(() => question ? session?.answers[question.id] ?? [] : [], [question, session?.answers]);

  const leaveQuiz = useCallback(() => {
    quiz.reset();
    router.replace('/(tabs)/entrainement');
  }, [quiz, router]);

  const confirmExit = useCallback(() => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Quitter ce sujet ? Votre session en cours ne sera pas enregistrée.')) leaveQuiz();
      return;
    }
    Alert.alert('Quitter ce sujet ?', 'Votre session en cours ne sera pas enregistrée.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: leaveQuiz },
    ]);
  }, [leaveQuiz]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { confirmExit(); return true; });
    return () => sub.remove();
  }, [confirmExit]);

  useEffect(() => {
    setFocusedOption(0);
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  const audioSources = useMemo(() => question ? getQuizAudio(question.id, question.options.map((option) => option.id)) : [], [question]);

  const select = useCallback((letter: string) => {
    if (!question) return;
    quiz.answer(question.id, selected.includes(letter)
      ? selected.filter((item) => item !== letter)
      : [...selected, letter]);
  }, [question, quiz, selected]);

  const finishOrAdvance = useCallback(async (answers = session?.answers) => {
    if (!session || !answers) return;
    if (index < session.questions.length - 1) { setIndex((current) => current + 1); return; }
    setBusy(true);
    try {
      const completedSession = { ...session, answers };
      const saved = await saveAttempt(db, completedSession);
      quiz.finish(completedSession, saved);
      requestAnimationFrame(() => router.replace('/result'));
    } finally { setBusy(false); }
  }, [db, index, quiz, router, session]);

  const next = useCallback(() => {
    if (!selected.length) {
      Alert.alert('Choisissez une réponse', 'Sélectionnez une proposition ou utilisez « Ignorer » pour obtenir 0 à cette question.');
      return;
    }
    void finishOrAdvance();
  }, [finishOrAdvance, selected.length]);

  const skip = useCallback(() => {
    if (!question || !session) return;
    const answers = { ...session.answers, [question.id]: [] };
    quiz.answer(question.id, []);
    void finishOrAdvance(answers);
  }, [finishOrAdvance, question, quiz, session]);

  const previous = useCallback(() => {
    if (index > 0) setIndex((current) => current - 1);
  }, [index]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !question) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setFocusedOption((current) => (current + direction + question.options.length) % question.options.length);
      } else if (event.key === ' ') {
        event.preventDefault();
        const option = question.options[focusedOption];
        if (option) select(option.letter);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedOption, next, question, select]);

  if (!session || !question) return <Screen><Text className="mt-20 text-center text-ink">Aucune session active.</Text></Screen>;

  return <><Screen scroll={false} className="pt-2">
    <View className="mb-4 flex-row items-center">
      <Pressable accessibilityLabel="Fermer le quiz" accessibilityRole="button" onPress={confirmExit} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><Ionicons name="close" size={25} color={colors.ink} /></Pressable>
      <View className="mx-4 flex-1"><View className="mb-2 flex-row justify-between"><Text className="text-xs font-bold text-inkMuted">QUESTION {index + 1}/{session.questions.length}</Text><Text className="text-xs font-bold text-primary">{Math.round((index + 1) / session.questions.length * 100)}%</Text></View><ProgressBar value={(index + 1) / session.questions.length * 100} /></View>
      <Pressable accessibilityLabel="Marquer cette question" onPress={() => toggleFlag(db, question.id)} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><Ionicons name="bookmark-outline" size={22} color={colors.ink} /></Pressable>
    </View>
    <ScrollView
      ref={contentScrollRef}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <View className="mb-3"><Text className="text-xs font-bold uppercase tracking-widest text-primary">{session.mode === 'exam' ? 'Examen blanc' : session.categoryName}</Text></View>
      <QuizAudioPlayer questionId={question.id} sources={audioSources} />
      <Text className="mb-5 text-2xl font-black leading-8 text-ink">{question.statement}</Text>
      {QUESTION_IMAGES[question.number] ? <Pressable accessibilityLabel="Ouvrir l’illustration de la question" accessibilityHint="Affiche l’image en plein écran avec zoom" onPress={() => setViewerImage({ source: QUESTION_IMAGES[question.number], title: `Illustration de la question ${question.number}`, aspectRatio: 1 })} className="mb-5 h-48 overflow-hidden rounded-3xl border border-border bg-white p-2 active:opacity-80"><Image source={QUESTION_IMAGES[question.number]} style={{ width: '100%', height: '100%' }} contentFit="contain" /><View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-black/60"><Ionicons name="expand" size={20} color="white" /></View></Pressable> : null}
      <View className="gap-3">{question.options.map((option, optionIndex) => { const active = selected.includes(option.letter); const focused = Platform.OS === 'web' && optionIndex === focusedOption; return <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onFocus={() => setFocusedOption(optionIndex)} onPress={() => select(option.letter)} className={`min-h-14 flex-row items-center rounded-2xl border p-4 ${active ? 'border-primary bg-primarySoft' : focused ? 'border-info bg-infoSoft' : 'border-border bg-surface'}`}><View className={`mr-3 h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-primary' : 'bg-background'}`}><Text className={`font-black ${active ? 'text-white' : 'text-ink'}`}>{option.letter}</Text></View><Text className="flex-1 text-base font-semibold leading-6 text-ink">{option.text}</Text>{active ? <Ionicons name="checkmark-circle" size={23} color={colors.primary} /> : null}</Pressable>; })}</View>
      {Platform.OS === 'web' ? <Text className="mt-3 text-xs text-inkMuted">↑/↓ choisir · Espace cocher · Entrée valider</Text> : null}
    </ScrollView>
    <View className="flex-row gap-3 pt-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Question précédente" disabled={busy || index === 0} onPress={previous} className={`h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface ${busy || index === 0 ? 'opacity-35' : 'active:bg-primarySoft'}`}><Ionicons name="arrow-back" size={23} color={colors.ink} /></Pressable>
      <View className="flex-1"><PrimaryButton variant="ghost" disabled={busy} label="Ignorer" icon="play-skip-forward" onPress={skip} /></View>
      <View className="flex-[2]"><PrimaryButton disabled={busy} label={index === session.questions.length - 1 ? (busy ? 'Calcul en cours…' : 'Terminer le sujet') : 'Question suivante'} icon={index === session.questions.length - 1 ? 'flag' : 'arrow-forward'} onPress={next} /></View>
    </View>
  </Screen><CourseImageViewer image={viewerImage} onClose={() => setViewerImage(null)} /></>;
}
