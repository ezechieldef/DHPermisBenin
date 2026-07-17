import '../global.css';
import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QuizProvider } from '@/src/features/quiz-context';
import { migrateDatabase } from '@/src/db/migrations';
import { Loading } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';
import { HeaderBackButton } from '@/src/components/header-back-button';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><Suspense fallback={<Loading />}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <SQLiteProvider databaseName="permis-v3.sqlite" assetSource={{ assetId: require('../assets/database/permis.sqlite') }} onInit={migrateDatabase} useSuspense>
        <QuizProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]" options={{ title: 'Cours', headerLeft: () => <HeaderBackButton fallback="/(tabs)/cours" /> }} />
            <Stack.Screen name="course-subjects/[id]" options={{ title: 'Sujets du cours', headerLeft: () => <HeaderBackButton fallback="/(tabs)/cours" /> }} />
            <Stack.Screen name="category/[id]" options={{ title: 'Sujets', headerLeft: () => <HeaderBackButton fallback="/(tabs)/entrainement" /> }} />
            <Stack.Screen name="quiz/index" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="result/index" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="offline" options={{ title: 'Contenu hors ligne', headerLeft: () => <HeaderBackButton fallback="/(tabs)/cours" /> }} />
          </Stack>
        </QuizProvider>
      </SQLiteProvider>
    </Suspense></SafeAreaProvider></GestureHandlerRootView>
  );
}
