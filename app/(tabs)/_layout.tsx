import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home', cours: 'book', entrainement: 'layers', examen: 'school', progression: 'stats-chart',
};

export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarStyle: { height: 74, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: colors.surface },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
    <Tabs.Screen name="cours" options={{ title: 'Cours' }} />
    <Tabs.Screen name="entrainement" options={{ title: 'Sujets' }} />
    <Tabs.Screen name="examen" options={{ title: 'Examen' }} />
    <Tabs.Screen name="progression" options={{ title: 'Progrès' }} />
  </Tabs>;
}
