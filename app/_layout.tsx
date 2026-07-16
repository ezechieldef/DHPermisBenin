import '../global.css';
import { Suspense, useEffect } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { QuizProvider } from '@/src/features/quiz-context';
import { migrateDatabase } from '@/src/db/migrations';
import { Loading } from '@/src/components/ui';
import { prepareFrenchVoice } from '@/src/services/tts';
import { colors } from '@/src/theme/colors';

export default function RootLayout() {
  useEffect(() => { prepareFrenchVoice(); }, []);
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName="permis.sqlite" assetSource={{ assetId: require('../assets/database/permis.sqlite') }} onInit={migrateDatabase} useSuspense>
        <QuizProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]" options={{ title: 'Cours' }} />
            <Stack.Screen name="category/[id]" options={{ title: 'Sujets' }} />
            <Stack.Screen name="quiz/index" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="result/index" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
        </QuizProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
