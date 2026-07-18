import '../global.css';
import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useFonts, Karla_400Regular, Karla_500Medium, Karla_600SemiBold, Karla_700Bold, Karla_800ExtraBold } from '@expo-google-fonts/karla';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { QuizProvider } from '@/src/features/quiz-context';
import { migrateDatabase } from '@/src/db/migrations';
import { Loading } from '@/src/components/ui';
import { HeaderBackButton } from '@/src/components/header-back-button';
import { ThemePreferencesProvider, useThemePreferences } from '@/src/theme/preferences';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Karla_400Regular, Karla_500Medium, Karla_600SemiBold, Karla_700Bold, Karla_800ExtraBold,
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return <ThemePreferencesProvider><RootNavigator /></ThemePreferencesProvider>;
}

function RootNavigator() {
  const { colors, fontChoice, scheme, themeVariables } = useThemePreferences();
  const headerFont = fontChoice === 'system' ? undefined : `${fontChoice === 'poppins' ? 'Poppins' : 'Karla'}_800ExtraBold`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}><View style={[{ flex: 1 }, themeVariables]}><SafeAreaProvider><Suspense fallback={<Loading />}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <SQLiteProvider databaseName="permis-v3.sqlite" assetSource={{ assetId: require('../assets/database/permis.sqlite') }} onInit={migrateDatabase} useSuspense>
        <QuizProvider>
          <StatusBar animated style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
          <Stack screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: headerFont },
            contentStyle: { backgroundColor: colors.background },
          }}>
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
    </Suspense></SafeAreaProvider></View></GestureHandlerRootView>
  );
}
