import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { CourseGalleryImage } from '@/src/components/course-content';
import { COURSE_IMAGES } from '@/src/services/course-images';
import type { Definition } from '@/src/types/models';
import { colors } from '@/src/theme/colors';
import { useThemePreferences } from '@/src/theme/preferences';

function MarkdownText({value}:{value:string}){const pieces=value.split(/(\*\*[^*]+\*\*)/g);return <Text className="text-base leading-7 text-ink">{pieces.map((piece,index)=>piece.startsWith('**')?<Text key={index} className="font-black">{piece.slice(2,-2)}</Text>:piece)}</Text>}

export function DefinitionSheet({definition,onClose}:{definition:Definition|null;onClose:()=>void}) {
  const {width}=useWindowDimensions();
  const { colors: themeColors, themeVariables } = useThemePreferences();
  const name = definition?.image_path?.split('/').pop();
  const source = name ? COURSE_IMAGES[name] : undefined;

  return <Modal visible={Boolean(definition)} transparent animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end" style={[themeVariables, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]}>
      <Pressable accessibilityLabel="Fermer la définition" className="flex-1" onPress={onClose}/>
      <View className="max-h-[78%] rounded-t-[32px] px-5 pb-8 pt-3" style={{ backgroundColor: themeColors.surface }}>
        <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-border"/>
        <View className="mb-4 flex-row items-start">
          <View className="flex-1"><Text className="text-xs font-black uppercase tracking-widest text-primary">Définition</Text><Text className="mt-1 text-2xl font-black text-ink">{definition?.mot}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-background"><Ionicons name="close" size={24} color={colors.ink}/></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {source?<View className="mb-5"><CourseGalleryImage source={source} title={definition?.mot||'Illustration du dictionnaire'} width={Math.max(280,Math.min(width-40,760))}/></View>:null}
          {definition?<MarkdownText value={definition.sens}/>:null}
          <Text className="mt-5 text-sm leading-5 text-inkMuted">Touchez un autre mot souligné dans le cours pour consulter sa définition.</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
