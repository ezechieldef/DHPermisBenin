import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  cours: 'book', entrainement: 'layers', examen: 'school', progression: 'stats-chart',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return <Tabs initialRouteName="cours" screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarStyle: {
      height: 65 + insets.bottom,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 9),
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ href: null }} />
    <Tabs.Screen name="cours" options={{ title: 'Cours' }} />
    <Tabs.Screen name="entrainement" options={{ title: 'Sujets' }} />
    <Tabs.Screen name="examen" options={{ title: 'Examen' }} />
    <Tabs.Screen name="progression" options={{ title: 'Progrès' }} />
  </Tabs>;
}
