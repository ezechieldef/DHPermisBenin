import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreferences } from '@/src/theme/preferences';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  cours: 'book', entrainement: 'layers', examen: 'school', progression: 'stats-chart', settings: 'options',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, textScale } = useThemePreferences();

  return <Tabs initialRouteName="cours" screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarStyle: {
      height: 74 + insets.bottom + Math.max(0, textScale - 1) * 38,
      paddingTop: 7,
      paddingBottom: Math.max(insets.bottom, 8) + Math.max(0, textScale - 1) * 8,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarLabelStyle: {
      fontSize: 11 * textScale,
      lineHeight: Math.ceil(16 * textScale),
      fontFamily: 'Poppins_700Bold',
      marginTop: 1,
    },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ href: null }} />
    <Tabs.Screen name="cours" options={{ title: 'Cours' }} />
    <Tabs.Screen name="entrainement" options={{ title: 'Sujets' }} />
    <Tabs.Screen name="examen" options={{ title: 'Examen' }} />
    <Tabs.Screen name="progression" options={{ title: 'Progrès' }} />
    <Tabs.Screen name="settings" options={{ title: 'Réglages' }} />
  </Tabs>;
}
