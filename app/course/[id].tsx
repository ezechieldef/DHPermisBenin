import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioButton } from '@/src/components/audio-button';
import { CourseContent } from '@/src/components/course-content';
import { CourseDrawer } from '@/src/components/course-drawer';
import { CourseImageViewer, type ViewerImage } from '@/src/components/course-image-viewer';
import { DefinitionSheet } from '@/src/components/definition-sheet';
import { Loading, PrimaryButton, ProgressBar } from '@/src/components/ui';
import { getCourse, getCourseSubjects, getDefinitions, importLegacyCourseCompletion, markCourseOpened, markCourseSectionRead, saveCourseResumeStep } from '@/src/db/queries';
import { getCourseAudioSegments } from '@/src/services/audio-assets';
import { parseCourseStructure, stepIndexForKey } from '@/src/services/course-structure';
import type { Course, Definition } from '@/src/types/models';
import { colors } from '@/src/theme/colors';
import { useThemePreferences } from '@/src/theme/preferences';

type ReadingState = { index: number; playing: boolean; startLine: number; endLine: number };

export default function CourseDetail() {
  useKeepAwake('course-reading');
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useThemePreferences();
  const scrollRef = useRef<ScrollView>(null);
  const blockPositions = useRef(new Map<number, number>());
  const [course, setCourse] = useState<Course | null | undefined>();
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [subjectCount, setSubjectCount] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [celebratedPart, setCelebratedPart] = useState<string | null>(null);
  const [selected, setSelected] = useState<Definition | null>(null);
  const [reading, setReading] = useState<ReadingState | null>(null);
  const [viewerImage, setViewerImage] = useState<ViewerImage>(null);
  const structure = useMemo(() => course ? parseCourseStructure(course.content_markdown, course.title) : null, [course]);
  const currentStep = structure?.steps[stepIndex];
  const currentPart = structure?.parts.find((part) => part.key === currentStep?.partKey);

  useEffect(() => {
    let active = true;
    setProgressLoaded(false);
    markCourseOpened(db, courseId);
    Promise.all([getCourse(db, courseId), getDefinitions(db), getCourseSubjects(db, courseId)]).then(([nextCourse, nextDefinitions, subjects]) => {
      if (!active) return;
      setCourse(nextCourse);
      setDefinitions(nextDefinitions);
      setSubjectCount(subjects.length);
    });
    return () => { active = false; };
  }, [db, courseId]);

  useEffect(() => {
    if (!structure) return;
    let active = true;
    importLegacyCourseCompletion(db, courseId, structure.sectionKeys).then((progress) => {
      if (!active) return;
      setCompleted(new Set(progress.completedSectionKeys.filter((key) => structure.sectionKeys.includes(key))));
      setStepIndex(stepIndexForKey(structure, progress.lastStepKey));
      setProgressLoaded(true);
    });
    return () => { active = false; };
  }, [courseId, db, structure]);

  useEffect(() => {
    if (!progressLoaded || !currentStep) return;
    void saveCourseResumeStep(db, courseId, currentStep.key);
    blockPositions.current.clear();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [courseId, currentStep, db, progressLoaded]);

  const goToStep = useCallback((key: string) => {
    if (!structure) return;
    setStepIndex(stepIndexForKey(structure, key));
    setDrawerOpen(false);
  }, [structure]);

  const move = useCallback((delta: number) => {
    if (!structure) return;
    setStepIndex((value) => Math.max(0, Math.min(structure.steps.length - 1, value + delta)));
  }, [structure]);

  const handleReadingChange = useCallback((state: ReadingState | null) => {
    setReading(state);
    if (!state?.playing) return;
    const position = [...blockPositions.current.entries()].filter(([line]) => line >= state.startLine && line <= state.endLine).sort(([a], [b]) => a - b)[0]?.[1];
    if (position !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, position - 110), animated: true });
  }, []);

  if (course === undefined || (course && !progressLoaded)) return <Loading />;
  if (!course || !structure || !currentStep) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-ink">Cours introuvable.</Text></View>;

  const audioSegments = getCourseAudioSegments(course.id).filter((segment) => segment.endLine >= currentStep.startLine && segment.startLine <= currentStep.endLine);
  const audioSources = audioSegments.map((segment) => segment.source);
  const speech = currentStep.markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#>*_`-]/g, ' ');
  const courseDone = structure.sectionKeys.length > 0 && structure.sectionKeys.every((key) => completed.has(key));
  const completedPercent = structure.sectionKeys.length ? completed.size / structure.sectionKeys.length * 100 : 0;

  const completeSection = async () => {
    if (!currentStep.sectionKey) return;
    const nextCompleted = new Set(completed).add(currentStep.sectionKey);
    const nowCourseDone = structure.sectionKeys.every((key) => nextCompleted.has(key));
    await markCourseSectionRead(db, course.id, currentStep.sectionKey, nowCourseDone);
    setCompleted(nextCompleted);
    const partDone = currentPart?.sectionStepKeys.every((key) => nextCompleted.has(key));
    if (partDone && currentPart && !completed.has(currentStep.sectionKey)) setCelebratedPart(currentPart.key);
    else move(1);
  };

  return <>
    <AudioButton text={speech} sources={audioSources} segments={audioSegments} label={currentStep.title} onReadingChange={handleReadingChange} showSubjects={subjectCount > 0} onSubjectsPress={() => router.push(`/course-subjects/${course.id}` as Href)} />
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-surface px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <Pressable accessibilityLabel="Ouvrir le sommaire" onPress={() => setDrawerOpen(true)} className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-primarySoft"><Ionicons name="list" size={24} color={themeColors.primary} /></Pressable>
          <View className="flex-1"><Text className="text-[11px] font-black uppercase tracking-wider text-primary">{currentStep.type === 'cover' ? `Partie ${structure.parts.findIndex((part) => part.key === currentStep.partKey) + 1}` : currentStep.partTitle}</Text><Text numberOfLines={2} className="mt-0.5 text-base font-black uppercase leading-5 text-ink">{currentStep.title}</Text></View>
          <Text className="ml-3 text-xs font-black text-inkMuted">{stepIndex + 1}/{structure.steps.length}</Text>
        </View>
        <View className="mt-3"><ProgressBar value={completedPercent} /></View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: Math.max(28, insets.bottom + 18) }}>
        {currentStep.type === 'cover' ? <PartCover partNumber={structure.parts.findIndex((part) => part.key === currentStep.partKey) + 1} title={currentStep.partTitle} sectionCount={currentPart?.sectionStepKeys.length ?? 0} completedCount={currentPart?.sectionStepKeys.filter((key) => completed.has(key)).length ?? 0} onContinue={() => move(1)} /> : <>
          <View className="mb-6">
            <View className="mb-3 flex-row items-center"><View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-primarySoft"><Ionicons name={currentStep.type === 'intro' ? 'sparkles-outline' : 'book-outline'} size={21} color={themeColors.primary} /></View><View className="flex-1"><Text className="text-xs font-black uppercase tracking-widest text-primary">{currentStep.type === 'intro' ? 'Avant de commencer' : `${currentStep.readingMinutes} min de lecture`}</Text><Text className="mt-1 text-2xl font-black uppercase leading-7 text-ink">{currentStep.title}</Text></View></View>
            {currentStep.type === 'section' && currentStep.sectionKey ? <View className={`self-start rounded-full px-3 py-1.5 ${completed.has(currentStep.sectionKey) ? 'bg-primarySoft' : 'bg-background'}`}><Text className={`text-xs font-black ${completed.has(currentStep.sectionKey) ? 'text-primary' : 'text-inkMuted'}`}>{completed.has(currentStep.sectionKey) ? '✓ SECTION LUE' : 'À LIRE'}</Text></View> : null}
          </View>
          <CourseContent markdown={currentStep.markdown} lineOffset={currentStep.startLine - 1} definitions={definitions} onDefinitionPress={setSelected} onImagePress={setViewerImage} activeRange={reading} listening={Boolean(reading?.playing)} onBlockLayout={(line, y) => blockPositions.current.set(line, y)} />
          <View className="mt-8">
            {currentStep.type === 'section' ? <PrimaryButton icon={completed.has(currentStep.sectionKey!) ? 'arrow-forward' : 'checkmark-circle'} label={completed.has(currentStep.sectionKey!) ? (stepIndex === structure.steps.length - 1 ? 'Section terminée' : 'Continuer') : 'Marquer comme lue et continuer'} onPress={completed.has(currentStep.sectionKey!) ? () => move(1) : completeSection} disabled={completed.has(currentStep.sectionKey!) && stepIndex === structure.steps.length - 1} /> : <PrimaryButton icon="arrow-forward" label="Commencer la première section" onPress={() => move(1)} />}
          </View>
        </>}
        <View className="mt-4 flex-row items-center justify-between">
          <Pressable disabled={stepIndex === 0} onPress={() => move(-1)} className={`h-12 flex-row items-center rounded-2xl px-4 ${stepIndex === 0 ? 'opacity-0' : 'bg-surface'}`}><Ionicons name="arrow-back" size={20} color={themeColors.ink} /><Text className="ml-2 font-bold text-ink">Précédent</Text></Pressable>
          <Pressable onPress={() => setDrawerOpen(true)} className="h-12 flex-row items-center rounded-2xl px-4"><Ionicons name="list-outline" size={20} color={themeColors.primary} /><Text className="ml-2 font-bold text-primary">Sommaire</Text></Pressable>
        </View>
      </ScrollView>
    </View>

    <CourseDrawer visible={drawerOpen} structure={structure} currentStepKey={currentStep.key} completed={completed} onSelect={goToStep} onClose={() => setDrawerOpen(false)} />
    <CompletionSheet visible={Boolean(celebratedPart)} title={currentPart?.title ?? ''} courseDone={courseDone} subjectCount={subjectCount} onContinue={() => { setCelebratedPart(null); move(1); }} onSubjects={() => { setCelebratedPart(null); router.push(`/course-subjects/${course.id}` as Href); }} />
    <DefinitionSheet definition={selected} onClose={() => setSelected(null)} />
    <CourseImageViewer image={viewerImage} onClose={() => setViewerImage(null)} />
  </>;
}

function PartCover({ partNumber, title, sectionCount, completedCount, onContinue }: { partNumber: number; title: string; sectionCount: number; completedCount: number; onContinue: () => void }) {
  return <View className="flex-1 justify-center py-10">
    <View className="mb-7 h-20 w-20 items-center justify-center self-center rounded-[28px] bg-primary"><Ionicons name="book" size={36} color={colors.white} /></View>
    <Text className="text-center text-xs font-black uppercase tracking-[3px] text-primary">Partie {partNumber}</Text>
    <Text className="mx-3 mt-4 text-center text-3xl font-black uppercase leading-10 text-ink">{title}</Text>
    <Text className="mt-4 text-center text-base leading-6 text-inkMuted">{sectionCount} section{sectionCount > 1 ? 's' : ''} · {completedCount} terminée{completedCount > 1 ? 's' : ''}</Text>
    <View className="mx-auto mt-10 w-full max-w-[420px]"><PrimaryButton icon="arrow-forward-circle" label={completedCount ? 'Reprendre cette partie' : 'Découvrir cette partie'} onPress={onContinue} /></View>
  </View>;
}

function CompletionSheet({ visible, title, courseDone, subjectCount, onContinue, onSubjects }: { visible: boolean; title: string; courseDone: boolean; subjectCount: number; onContinue: () => void; onSubjects: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, themeVariables } = useThemePreferences();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onContinue}>
    <View className="flex-1 justify-end" style={[themeVariables, { backgroundColor: 'rgba(0,0,0,0.55)' }]}><Pressable className="flex-1" onPress={onContinue} />
      <View className="rounded-t-[32px] bg-surface px-6 pt-8" style={{ paddingBottom: Math.max(28, insets.bottom + 18), backgroundColor: themeColors.surface }}>
        <View className="mb-5 h-20 w-20 items-center justify-center self-center rounded-full bg-secondarySoft"><Text className="text-4xl">🎉</Text></View>
        <Text className="text-center text-2xl font-black text-ink">{courseDone ? 'Cours terminé !' : 'Partie terminée !'}</Text>
        <Text className="mb-7 mt-2 text-center text-base leading-6 text-inkMuted">Vous avez terminé « {title} ». Cette progression est enregistrée sur votre appareil.</Text>
        {courseDone && subjectCount > 0 ? <View className="mb-3"><PrimaryButton icon="school" label={`Traiter les sujets (${subjectCount})`} onPress={onSubjects} /></View> : null}
        <PrimaryButton variant={courseDone && subjectCount > 0 ? 'ghost' : 'primary'} icon="arrow-forward" label={courseDone ? 'Rester dans le cours' : 'Passer à la partie suivante'} onPress={onContinue} />
      </View>
    </View>
  </Modal>;
}
