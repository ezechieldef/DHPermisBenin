import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/app-text';
import { Card, Heading, Screen } from '@/src/components/ui';
import { type FontChoice, type TextScale, type ThemeMode, useThemePreferences } from '@/src/theme/preferences';
import { BrandFooter } from '@/src/components/brand-footer';

const themeChoices: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
];

const scaleChoices: { value: TextScale; label: string }[] = [
  { value: 0.85, label: 'Petit' }, { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grand' }, { value: 1.3, label: 'Très grand' },
];

const fontChoices: { value: FontChoice; label: string; sample: string }[] = [
  { value: 'poppins', label: 'Poppins', sample: 'Moderne et arrondie' },
  { value: 'karla', label: 'Karla', sample: 'Claire et compacte' },
  { value: 'system', label: 'Système', sample: 'Police de votre appareil' },
];

export default function SettingsScreen() {
  const { colors, fontChoice, mode, setFontChoice, setMode, textScale, setTextScale } = useThemePreferences();

  return <Screen>
    <Heading eyebrow="Confort de lecture" title="Réglages" subtitle="Adaptez l’apparence de l’application. Vos choix restent enregistrés sur cet appareil." />
    <Card className="mb-5">
      <Text className="mb-4 text-lg font-black text-ink">Thème</Text>
      <View className="flex-row gap-2">
        {themeChoices.map((choice) => {
          const selected = mode === choice.value;
          return <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setMode(choice.value)} className={`min-h-20 flex-1 items-center justify-center rounded-2xl border px-2 ${selected ? 'border-primary bg-primarySoft' : 'border-border bg-background'}`}>
            <Ionicons name={choice.icon} size={24} color={selected ? colors.primary : colors.inkMuted} />
            <Text className={`mt-2 text-sm font-bold ${selected ? 'text-primary' : 'text-ink'}`}>{choice.label}</Text>
          </Pressable>;
        })}
      </View>
    </Card>
    <Card className="mb-5">
      <Text className="text-lg font-black text-ink">Police</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-inkMuted">Choisissez la typographie utilisée dans toute l’application.</Text>
      <View className="gap-2">
        {fontChoices.map((choice) => {
          const selected = fontChoice === choice.value;
          return <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setFontChoice(choice.value)} className={`min-h-16 flex-row items-center rounded-2xl border px-4 py-3 ${selected ? 'border-primary bg-primarySoft' : 'border-border bg-background'}`}>
            <View className="flex-1">
              <Text className={`text-base font-bold ${selected ? 'text-primary' : 'text-ink'}`}>{choice.label}</Text>
              <Text className="mt-1 text-xs text-inkMuted">{choice.sample}</Text>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>;
        })}
      </View>
    </Card>
    <Card>
      <Text className="text-lg font-black text-ink">Taille du texte</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-inkMuted">Ce réglage s’applique aux cours, questions, boutons et menus.</Text>
      <View className="gap-2">
        {scaleChoices.map((choice) => {
          const selected = textScale === choice.value;
          return <Pressable key={choice.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setTextScale(choice.value)} className={`min-h-14 flex-row items-center rounded-2xl border px-4 ${selected ? 'border-primary bg-primarySoft' : 'border-border bg-background'}`}>
            <Text className={`flex-1 font-bold ${selected ? 'text-primary' : 'text-ink'}`}>{choice.label}</Text>
            <Text className="text-sm text-inkMuted">{Math.round(choice.value * 100)} %</Text>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={{ marginLeft: 10 }} /> : null}
          </Pressable>;
        })}
      </View>
      <View className="mt-5 rounded-2xl bg-background p-4">
        <Text className="text-base leading-6 text-ink">Aperçu : apprenez à reconnaître les panneaux et les règles de circulation.</Text>
      </View>
    </Card>
    <BrandFooter />
  </Screen>;
}
