import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AudioButton } from '@/src/components/audio-button';
import { CourseContent } from '@/src/components/course-content';
import { Heading, Loading, Screen } from '@/src/components/ui';
import { getCourse } from '@/src/db/queries';
import type { Course } from '@/src/types/models';

export default function CourseDetail(){const {id}=useLocalSearchParams<{id:string}>();const db=useSQLiteContext();const[course,setCourse]=useState<Course|null|undefined>();useEffect(()=>{getCourse(db,Number(id)).then(setCourse)},[db,id]);if(course===undefined)return <Loading/>;if(!course)return <Screen><Text>Cours introuvable.</Text></Screen>;const speech=course.content_markdown.replace(/!\[[^\]]*\]\([^)]+\)/g,'').replace(/[#>*_`-]/g,' ');return <Screen><Heading eyebrow="Chapitre illustré" title={course.title} subtitle="Lisez à votre rythme ou laissez l’assistant vous accompagner."/><View className="mb-4"><AudioButton text={speech} label="Écouter le chapitre"/></View><CourseContent markdown={course.content_markdown}/></Screen>}
