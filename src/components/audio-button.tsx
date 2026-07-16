import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { speakFrench } from '@/src/services/tts';

export function AudioButton({ text, label = 'Écouter' }: { text: string; label?: string }) {
  return <Pressable accessibilityLabel={`${label} avec la synthèse vocale`} onPress={() => speakFrench(text)} className="flex-row items-center gap-2 self-start rounded-full bg-infoSoft px-4 py-3 active:opacity-70"><Ionicons name="volume-high" size={19} color={colors.info} /><Text className="font-bold text-info">{label}</Text></Pressable>;
}
