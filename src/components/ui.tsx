import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

export function Screen({ children, scroll = true, className = '' }: PropsWithChildren<{ scroll?: boolean; className?: string }>) {
  const content = <View className={`flex-1 px-5 pb-8 ${className}`}>{children}</View>;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {scroll ? <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <View className={`rounded-3xl border border-border bg-surface p-5 ${className}`} style={{ shadowColor: '#10243A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>{children}</View>;
}

export function Heading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <View className="mb-6 mt-3">
    {eyebrow ? <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</Text> : null}
    <Text className="text-3xl font-black leading-tight text-ink">{title}</Text>
    {subtitle ? <Text className="mt-2 text-base leading-6 text-inkMuted">{subtitle}</Text> : null}
  </View>;
}

export function PrimaryButton({ label, onPress, icon, disabled = false, variant = 'primary' }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = variant === 'primary' ? 'bg-primary' : variant === 'secondary' ? 'bg-secondary' : 'border border-border bg-surface';
  const text = variant === 'primary' ? 'text-white' : 'text-ink';
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 ${styles} ${disabled ? 'opacity-40' : 'active:opacity-80'}`}>
    {icon ? <Ionicons name={icon} size={20} color={variant === 'primary' ? colors.white : colors.ink} /> : null}
    <Text className={`text-base font-extrabold ${text}`}>{label}</Text>
  </Pressable>;
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return <View className="h-2 overflow-hidden rounded-full bg-border"><View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} /></View>;
}

export function EmptyState({ icon = 'leaf-outline', title, message, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message: string; action?: ReactNode }) {
  return <View className="flex-1 items-center justify-center px-8 py-16"><View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primarySoft"><Ionicons name={icon} size={38} color={colors.primary} /></View><Text className="text-center text-xl font-black text-ink">{title}</Text><Text className="mb-6 mt-2 text-center text-base leading-6 text-inkMuted">{message}</Text>{action}</View>;
}

export function Loading() {
  return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color={colors.primary} /><Text className="mt-3 text-inkMuted">Préparation hors ligne…</Text></View>;
}
