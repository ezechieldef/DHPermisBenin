import { Linking, Pressable, Text, View } from 'react-native';

const WEBSITE = 'https://d-harvest.com';

export function BrandFooter() {
  return <View className="items-center pb-2 pt-8">
    <Pressable accessibilityRole="link" accessibilityLabel="Visiter le site D-HARVEST" onPress={() => void Linking.openURL(WEBSITE)} className="px-4 py-2 active:opacity-60">
      <Text className="text-[11px] font-semibold tracking-wider text-inkMuted/60">made by <Text className="font-black">D-HARVEST</Text></Text>
    </Pressable>
  </View>;
}
