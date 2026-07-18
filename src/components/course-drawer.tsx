import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/src/components/app-text';
import { ProgressBar } from '@/src/components/ui';
import type { CourseStructure } from '@/src/services/course-structure';
import { colors } from '@/src/theme/colors';
import { useThemePreferences } from '@/src/theme/preferences';

export function CourseDrawer({ visible, structure, currentStepKey, completed, onSelect, onClose }: {
  visible: boolean;
  structure: CourseStructure;
  currentStepKey: string;
  completed: Set<string>;
  onSelect: (stepKey: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, themeVariables } = useThemePreferences();
  const percentage = structure.sectionKeys.length ? completed.size / structure.sectionKeys.length * 100 : 0;
  const steps = new Map(structure.steps.map((step) => [step.key, step]));

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View className="flex-1 flex-row" style={[themeVariables, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
      <View className="h-full w-[88%] max-w-[410px] bg-surface px-5" style={{ paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 18), backgroundColor: themeColors.surface }}>
        <View className="mb-5 flex-row items-start">
          <View className="flex-1 pr-3"><Text className="text-xs font-black uppercase tracking-widest text-primary">Sommaire du cours</Text><Text className="mt-2 text-xl font-black leading-6 text-ink">{structure.title}</Text></View>
          <Pressable accessibilityLabel="Fermer le sommaire" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-background"><Ionicons name="close" size={24} color={themeColors.ink} /></Pressable>
        </View>
        <View className="mb-5 rounded-2xl bg-background p-4">
          <View className="mb-2 flex-row justify-between"><Text className="text-sm font-bold text-inkMuted">Sections terminées</Text><Text className="font-black text-primary">{completed.size}/{structure.sectionKeys.length}</Text></View>
          <ProgressBar value={percentage} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {structure.parts.map((part, partIndex) => {
            const partCurrent = currentStepKey === part.coverStepKey || currentStepKey === part.introStepKey || part.sectionStepKeys.includes(currentStepKey);
            const partDone = part.sectionStepKeys.length > 0 && part.sectionStepKeys.every((key) => completed.has(key));
            return <View key={part.key} className="mb-5">
              <Pressable onPress={() => onSelect(part.coverStepKey)} className={`flex-row items-center rounded-2xl px-3 py-3 ${partCurrent ? 'bg-primarySoft' : ''}`}>
                <View className={`mr-3 h-9 w-9 items-center justify-center rounded-xl ${partDone ? 'bg-primary' : 'bg-background'}`}><Text className={`font-black ${partDone ? 'text-white' : 'text-primary'}`}>{partDone ? '✓' : partIndex + 1}</Text></View>
                <Text className={`flex-1 text-sm font-black uppercase leading-5 ${partCurrent ? 'text-primary' : 'text-ink'}`}>{part.title}</Text>
              </Pressable>
              <View className="ml-[30px] border-l border-border pl-5 pt-1">
                {part.sectionStepKeys.map((key) => {
                  const step = steps.get(key)!;
                  const active = key === currentStepKey;
                  const done = completed.has(key);
                  return <Pressable key={key} onPress={() => onSelect(key)} className="flex-row items-center py-2.5">
                    <Ionicons name={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'ellipse-outline'} size={19} color={done || active ? colors.primary : colors.inkMuted} />
                    <Text className={`ml-3 flex-1 text-sm leading-5 ${active ? 'font-black text-primary' : done ? 'font-bold text-ink' : 'text-inkMuted'}`}>{step.title}</Text>
                  </Pressable>;
                })}
              </View>
            </View>;
          })}
        </ScrollView>
      </View>
      <Pressable accessibilityLabel="Fermer le sommaire" className="flex-1" onPress={onClose} />
    </View>
  </Modal>;
}
