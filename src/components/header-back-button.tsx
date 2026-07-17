import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { colors } from '@/src/theme/colors';

export function HeaderBackButton({ fallback }: { fallback: Href }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      onPress={() => router.replace(fallback)}
      className="h-12 w-12 items-center justify-center"
      hitSlop={8}
    >
      <Ionicons name="arrow-back" size={28} color={colors.ink} />
    </Pressable>
  );
}
