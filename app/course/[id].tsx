import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AudioButton } from '@/src/components/audio-button';
import { CourseContent } from '@/src/components/course-content';
import { CourseImageViewer, type ViewerImage } from '@/src/components/course-image-viewer';
import { DefinitionSheet } from '@/src/components/definition-sheet';
import { Card, Heading, Loading, PrimaryButton, Screen } from '@/src/components/ui';
import { getCourse, getCourseReadStatus, getCourseSubjects, getDefinitions, markCourseOpened, markCourseRead } from '@/src/db/queries';
import { getCourseAudio, getCourseAudioSegments } from '@/src/services/audio-assets';
import type { Course, Definition } from '@/src/types/models';

type ReadingState = { index: number; playing: boolean; startLine: number; endLine: number };

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const blockPositions = useRef(new Map<number, number>());
  const contentOffset = useRef(0);
  const [course, setCourse] = useState<Course | null | undefined>();
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [subjectCount, setSubjectCount] = useState(0);
  const [isRead, setIsRead] = useState(false);
  const [selected, setSelected] = useState<Definition | null>(null);
  const [reading, setReading] = useState<ReadingState | null>(null);
  const [viewerImage, setViewerImage] = useState<ViewerImage>(null);

  useEffect(() => {
    markCourseOpened(db, courseId);
    Promise.all([getCourse(db, courseId), getDefinitions(db), getCourseSubjects(db, courseId), getCourseReadStatus(db, courseId)]).then(([nextCourse, nextDefinitions, subjects, read]) => {
      setCourse(nextCourse);
      setDefinitions(nextDefinitions);
      setSubjectCount(subjects.length);
      setIsRead(read);
    });
  }, [db, courseId]);

  const handleReadingChange = useCallback((state: ReadingState | null) => {
    setReading(state);
    if (!state?.playing) return;
    const candidates = [...blockPositions.current.entries()]
      .filter(([line]) => line >= state.startLine && line <= state.endLine)
      .sort(([a], [b]) => a - b);
    const position = candidates[0]?.[1];
    if (position !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, contentOffset.current + position - 90), animated: true });
    }
  }, []);

  if (course === undefined) return <Loading />;
  if (!course) return <Screen><Text>Cours introuvable.</Text></Screen>;
  const speech = course.content_markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#>*_`-]/g, ' ');
  const audioSources = getCourseAudio(course.id);
  const audioSegments = getCourseAudioSegments(course.id);

  return <>
    <AudioButton
      text={speech}
      sources={audioSources}
      segments={audioSegments}
      label={course.title}
      onReadingChange={handleReadingChange}
      showSubjects={isRead && subjectCount > 0}
      onSubjectsPress={() => router.replace(`/course-subjects/${course.id}` as Href)}
    />
    <Screen scrollRef={scrollRef}>
      <Heading eyebrow="Chapitre illustré" title={course.title} subtitle="Les termes soulignés donnent accès à une définition simple, même hors ligne." />
      <View onLayout={(event) => { contentOffset.current = event.nativeEvent.layout.y; }}>
        <CourseContent
          markdown={course.content_markdown}
          definitions={definitions}
          onDefinitionPress={setSelected}
          onImagePress={setViewerImage}
          activeRange={reading}
          listening={Boolean(reading?.playing)}
          onBlockLayout={(line, y) => blockPositions.current.set(line, y)}
        />
      </View>
      <Card className="mt-8">
        <View className="mb-5 flex-row items-center gap-3">
          <View className={`h-11 w-11 items-center justify-center rounded-2xl ${isRead ? 'bg-primary' : 'bg-primarySoft'}`}>
            <Text className={`text-xl font-black ${isRead ? 'text-white' : 'text-primary'}`}>{isRead ? '✓' : '○'}</Text>
          </View>
          <View className="flex-1"><Text className="font-black text-ink">{isRead ? 'Cours terminé' : 'Lecture en cours'}</Text><Text className="mt-1 text-sm text-inkMuted">{isRead ? 'Ce chapitre est enregistré comme lu.' : 'Terminez votre lecture puis validez ce chapitre.'}</Text></View>
        </View>
        {!isRead ? <View className="mb-4"><PrimaryButton variant="ghost" icon="checkmark-circle" label="Marquer ce cours comme lu" onPress={async () => { await markCourseRead(db, course.id); setIsRead(true); }} /></View> : null}
        <Text className="text-xl font-black text-ink">Prêt à vous entraîner ?</Text>
        <Text className="mb-5 mt-2 text-base leading-6 text-inkMuted">Les sujets de ce chapitre réutilisent ses notions et celles des chapitres précédents.</Text>
        <PrimaryButton icon="play-circle" label={`Voir et traiter les sujets (${subjectCount})`} onPress={async () => { await markCourseRead(db, course.id); setIsRead(true); router.push(`/course-subjects/${course.id}` as Href); }} disabled={!subjectCount} />
      </Card>
    </Screen>
    <DefinitionSheet definition={selected} onClose={() => setSelected(null)} />
    <CourseImageViewer image={viewerImage} onClose={() => setViewerImage(null)} />
  </>;
}
