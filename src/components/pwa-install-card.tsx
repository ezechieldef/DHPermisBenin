import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Card, PrimaryButton } from '@/src/components/ui';
import { activateWaitingServiceWorker, canPromptInstall, isIosBrowser, isPwaSupported, promptPwaInstall, subscribeInstallAvailability, watchForPwaUpdate } from '@/src/services/pwa';
import { colors } from '@/src/theme/colors';

export function PwaInstallCard() {
  const router = useRouter();
  const [, refresh] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => subscribeInstallAvailability(() => refresh((value) => value + 1)), []);
  useEffect(() => watchForPwaUpdate(setUpdateAvailable), []);
  if (Platform.OS !== 'web' || !isPwaSupported()) return null;

  const install = async () => {
    if (isIosBrowser()) {
      Alert.alert('Installer sur iPhone ou iPad', 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».');
      return;
    }
    if (!canPromptInstall()) {
      Alert.alert('Installation', 'Ouvrez le menu du navigateur puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».');
      return;
    }
    await promptPwaInstall();
  };

  return <Card className="mb-6 border-primary/20 bg-primarySoft">
    <View className="mb-4 flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary"><Ionicons name="cloud-download" size={23} color={colors.white} /></View>
      <View className="flex-1"><Text className="font-black text-ink">Disponible sans connexion</Text><Text className="mt-1 text-xs leading-4 text-inkMuted">Installez l’app et choisissez les audios à conserver.</Text></View>
    </View>
    <View className="gap-2">{updateAvailable ? <PrimaryButton label="Mettre à jour l’application" icon="refresh" onPress={() => void activateWaitingServiceWorker()} /> : <PrimaryButton label="Gérer le contenu hors ligne" icon="download-outline" onPress={() => router.push('/offline' as Href)} />}<PrimaryButton label={updateAvailable ? 'Gérer le contenu hors ligne' : 'Installer l’application'} icon={updateAvailable ? 'download-outline' : 'phone-portrait-outline'} variant="ghost" onPress={updateAvailable ? () => router.push('/offline' as Href) : () => void install()} /></View>
  </Card>;
}
