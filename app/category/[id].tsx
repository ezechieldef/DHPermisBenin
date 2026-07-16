import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Loading, Screen } from '@/src/components/ui';
import { getCategories, getSubjectQuestions } from '@/src/db/queries';
import { useQuiz } from '@/src/features/quiz-context';
import type { Category } from '@/src/types/models';
import { colors } from '@/src/theme/colors';

export default function CategoryScreen(){const{id}=useLocalSearchParams<{id:string}>();const categoryId=Number(id);const db=useSQLiteContext();const router=useRouter();const quiz=useQuiz();const[category,setCategory]=useState<Category|null|undefined>();useEffect(()=>{getCategories(db).then(list=>setCategory(list.find(x=>x.id===categoryId)??null))},[db,categoryId]);if(category===undefined)return <Loading/>;if(!category)return <Screen><Text>Catégorie introuvable.</Text></Screen>;const subjects=Math.ceil(category.question_count/20);const start=async(index:number)=>{const questions=await getSubjectQuestions(db,categoryId,index);if(!questions.length)return Alert.alert('Sujet vide');quiz.start({mode:'subject',categoryId,categoryName:category.name,subjectIndex:index,questions,answers:{},startedAt:Date.now()});router.push('/quiz')};return <Screen><Heading eyebrow={`${category.question_count} questions`} title={category.name} subtitle="Avancez sujet par sujet. Le dernier peut comporter moins de 20 questions afin de couvrir toute la catégorie sans répétition."/>
  {Array.from({length:subjects},(_,i)=>i+1).map(index=><Pressable key={index} onPress={()=>start(index)} className="mb-3 active:opacity-80"><Card className="flex-row items-center"><View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-primarySoft"><Text className="text-lg font-black text-primary">{index}</Text></View><View className="flex-1"><Text className="text-lg font-black text-ink">Sujet {index}</Text><Text className="mt-1 text-sm text-inkMuted">{Math.min(20,category.question_count-(index-1)*20)} questions</Text></View><Ionicons name="play-circle" size={34} color={colors.primary}/></Card></Pressable>)}
  </Screen>}
