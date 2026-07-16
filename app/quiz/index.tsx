import { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { AudioButton } from '@/src/components/audio-button';
import { PrimaryButton, ProgressBar, Screen } from '@/src/components/ui';
import { saveAttempt, toggleFlag } from '@/src/db/queries';
import { useQuiz } from '@/src/features/quiz-context';
import { QUESTION_IMAGES } from '@/src/services/question-images';
import { colors } from '@/src/theme/colors';

export default function QuizScreen(){const db=useSQLiteContext();const router=useRouter();const quiz=useQuiz();const[index,setIndex]=useState(0);const[busy,setBusy]=useState(false);const session=quiz.session;
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{confirmExit();return true});return()=>sub.remove()},[]);
  const question=session?.questions[index];const selected=question?session?.answers[question.id]??[]:[];const speech=useMemo(()=>question?[question.statement,...question.options.map(o=>`${o.letter}. ${o.text}`)].join('. '):'',[question]);
  if(!session||!question)return <Screen><Text className="mt-20 text-center text-ink">Aucune session active.</Text></Screen>;
  const confirmExit=()=>Alert.alert('Quitter ce sujet ?','Votre session en cours ne sera pas enregistrée.',[{text:'Continuer',style:'cancel'},{text:'Quitter',style:'destructive',onPress:()=>{quiz.reset();router.replace('/(tabs)/entrainement')}}]);
  const select=(letter:string)=>{if(question.answer_type==='single')quiz.answer(question.id,[letter]);else quiz.answer(question.id,selected.includes(letter)?selected.filter(x=>x!==letter):[...selected,letter]);};
  const next=async()=>{if(!selected.length)return Alert.alert('Choisissez une réponse','Sélectionnez au moins une proposition avant de continuer.');if(index<session.questions.length-1){setIndex(index+1);return;}setBusy(true);try{const saved=await saveAttempt(db,session);quiz.finish(saved);router.replace('/result')}finally{setBusy(false)}};
  return <Screen scroll={false} className="pt-2"><View className="mb-4 flex-row items-center"><Pressable onPress={confirmExit} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><Ionicons name="close" size={25} color={colors.ink}/></Pressable><View className="mx-4 flex-1"><View className="mb-2 flex-row justify-between"><Text className="text-xs font-bold text-inkMuted">QUESTION {index+1}/{session.questions.length}</Text><Text className="text-xs font-bold text-primary">{Math.round((index+1)/session.questions.length*100)}%</Text></View><ProgressBar value={(index+1)/session.questions.length*100}/></View><Pressable onPress={()=>toggleFlag(db,question.id)} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><Ionicons name="bookmark-outline" size={22} color={colors.ink}/></Pressable></View>
    <View className="flex-1"><View className="mb-3 flex-row items-center justify-between"><Text className="text-xs font-bold uppercase tracking-widest text-primary">{session.mode==='exam'?'Examen blanc':session.categoryName}</Text><AudioButton text={speech}/></View>
      <Text className="mb-5 text-2xl font-black leading-8 text-ink">{question.statement}</Text>
      {QUESTION_IMAGES[question.number]?<View className="mb-5 h-48 overflow-hidden rounded-3xl border border-border bg-white p-2"><Image source={QUESTION_IMAGES[question.number]} style={{width:'100%',height:'100%'}} contentFit="contain"/></View>:null}
      <View className="gap-3">{question.options.map(option=>{const active=selected.includes(option.letter);return <Pressable key={option.id} onPress={()=>select(option.letter)} className={`min-h-14 flex-row items-center rounded-2xl border p-4 ${active?'border-primary bg-primarySoft':'border-border bg-surface'}`}><View className={`mr-3 h-9 w-9 items-center justify-center rounded-xl ${active?'bg-primary':'bg-background'}`}><Text className={`font-black ${active?'text-white':'text-ink'}`}>{option.letter}</Text></View><Text className="flex-1 text-base font-semibold leading-6 text-ink">{option.text}</Text>{active?<Ionicons name="checkmark-circle" size={23} color={colors.primary}/>:null}</Pressable>})}</View>
    </View><View className="pt-3"><PrimaryButton disabled={busy} label={index===session.questions.length-1?(busy?'Calcul en cours…':'Terminer le sujet'):'Question suivante'} icon={index===session.questions.length-1?'flag':'arrow-forward'} onPress={next}/></View>
  </Screen>}
