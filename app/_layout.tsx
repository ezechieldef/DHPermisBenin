import '../global.css';
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Pressable, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { QuizProvider } from '@/src/features/quiz-context';
import { migrateDatabase } from '@/src/db/migrations';
import { Loading } from '@/src/components/ui';
import { AppText as Text } from '@/src/components/app-text';
import { HeaderBackButton } from '@/src/components/header-back-button';
import { ThemePreferencesProvider, useThemePreferences } from '@/src/theme/preferences';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return <ThemePreferencesProvider><RootNavigator /></ThemePreferencesProvider>;
}

function RootNavigator() {
  const { colors, scheme, themeVariables } = useThemePreferences();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}><View style={[{ flex: 1 }, themeVariables]}><SafeAreaProvider>
      <WebSQLiteTabGuard><DatabaseProvider>
        <QuizProvider>
          <StatusBar key={scheme} animated style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
          <Stack screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: 'Poppins_800ExtraBold' },
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
      </DatabaseProvider></WebSQLiteTabGuard>
    </SafeAreaProvider></View></GestureHandlerRootView>
  );
}

function DatabaseProvider({children}:PropsWithChildren) {
  const [error,setError]=useState<Error|null>(null);
  const handleError=useCallback((nextError:Error)=>queueMicrotask(()=>setError(nextError)),[]);
  if(error)return <SQLiteUnavailable error={error} onRetry={()=>setError(null)}/>;
  return <SQLiteProvider
    databaseName="permis-v3.sqlite"
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    assetSource={{assetId:require('../assets/database/permis.sqlite')}}
    onInit={migrateDatabase}
    onError={handleError}
  >{children}</SQLiteProvider>;
}

function SQLiteUnavailable({error,onRetry}:{error:Error;onRetry:()=>void}) {
  const accessHandleBusy=/createSyncAccessHandle|another open Access Handle|Writable stream/i.test(error.message);
  return <View className="flex-1 items-center justify-center bg-background px-8">
    <Text className="text-center text-xl font-black text-ink">{accessHandleBusy?'Base locale déjà utilisée':'Impossible d’ouvrir les données locales'}</Text>
    <Text className="mt-3 max-w-[520px] text-center text-base leading-6 text-inkMuted">{accessHandleBusy?'Fermez les autres onglets de l’application, puis réessayez. Si aucun autre onglet n’est ouvert, redémarrez le navigateur pour libérer l’ancien accès SQLite.':error.message}</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} className="mt-6 rounded-2xl bg-primary px-6 py-3 active:opacity-75"><Text className="font-black text-white">Réessayer</Text></Pressable>
  </View>;
}

function WebSQLiteTabGuard({ children }: PropsWithChildren) {
  const [state, setState] = useState<'waiting'|'ready'|'blocked'>(process.env.EXPO_OS === 'web' ? 'waiting' : 'ready');
  const releaseLock = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    let active = true;
    void navigator.locks.request('dh-prepa-permis-sqlite', { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!active) return;
      if (!lock) { setState('blocked'); return; }
      setState('ready');
      await new Promise<void>((resolve) => { releaseLock.current = resolve; });
    });
    return () => { active = false; releaseLock.current?.(); releaseLock.current = null; };
  }, []);

  if (state === 'waiting') return <Loading />;
  if (state === 'blocked') return <View className="flex-1 items-center justify-center bg-background px-8"><Text className="text-center text-xl font-black text-ink">Application déjà ouverte</Text><Text className="mt-3 max-w-[480px] text-center text-base leading-6 text-inkMuted">Fermez l’autre onglet DH PREPA PERMIS BJ, puis rechargez cette page. Cela protège vos données locales.</Text></View>;
  return children;
}
