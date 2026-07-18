import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

export function ResetProgressButton({ onReset }: { onReset: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    try { await onReset(); } finally { setBusy(false); }
  };

  const confirm = () => {
    const message = 'Les cours lus, les sujets traités, les notes et tout l’historique seront définitivement effacés.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Tout réinitialiser ?\n\n${message}`)) void reset();
      return;
    }
    Alert.alert('Tout réinitialiser ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => void reset() },
    ]);
  };

  return <View className="mt-7 border-t border-border pt-6">
    <Pressable accessibilityRole="button" accessibilityLabel="Réinitialiser toute la progression" disabled={busy} onPress={confirm} className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-danger bg-dangerSoft px-5 ${busy ? 'opacity-50' : 'active:opacity-75'}`}>
      <Ionicons name="trash-outline" size={20} color={colors.danger} />
      <Text className="text-base font-extrabold text-danger">{busy ? 'Réinitialisation…' : 'Tout réinitialiser'}</Text>
    </Pressable>
    <Text className="mt-2 text-center text-xs leading-4 text-inkMuted">Cette action efface uniquement votre progression locale.</Text>
  </View>;
}
