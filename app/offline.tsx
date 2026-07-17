import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card, EmptyState, Heading, Loading, PrimaryButton, ProgressBar, Screen } from '@/src/components/ui';
import {
  cancelOfflinePack, deleteOfflinePack, downloadOfflinePack, formatBytes, getOfflineStorageInfo,
  isPwaSupported, loadOfflineCatalog, requestOfflinePackStatus, requestPersistentStorage,
  subscribeOfflineEvents, type OfflineCatalog, type OfflineEvent, type OfflinePack,
} from '@/src/services/pwa';
import { colors } from '@/src/theme/colors';

type Progress = Record<string, { completed: number; total: number; error?: string }>;

export default function OfflineScreen() {
  const supported = Platform.OS === 'web' && isPwaSupported();
  const [catalog, setCatalog] = useState<OfflineCatalog | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress>({});
  const [storage, setStorage] = useState({ usage: 0, quota: 0, available: 0, persisted: false });
  const [error, setError] = useState('');

  const reloadStorage = useCallback(async () => setStorage(await getOfflineStorageInfo()), []);
  useFocusEffect(useCallback(() => { if (supported) void reloadStorage(); }, [reloadStorage, supported]));

  useEffect(() => {
    if (!supported) return;
    loadOfflineCatalog().then(setCatalog).catch((reason) => setError(String(reason?.message || reason)));
    const unsubscribe = subscribeOfflineEvents((event: OfflineEvent) => {
      if (event.type === 'PACK_STATUS') setInstalled(new Set(event.installed ?? []));
      if (event.type === 'PACK_PROGRESS' && event.packId) setProgress((current) => ({ ...current, [event.packId!]: { completed: event.completed ?? 0, total: event.total ?? 1 } }));
      if (event.type === 'PACK_COMPLETE' && event.packId) {
        setInstalled((current) => new Set([...current, event.packId!]));
        setProgress((current) => { const next = { ...current }; delete next[event.packId!]; return next; });
        void reloadStorage();
      }
      if (event.type === 'PACK_DELETED' && event.packId) {
        setInstalled((current) => { const next = new Set(current); next.delete(event.packId!); return next; });
        void reloadStorage();
      }
      if (event.type === 'PACK_CANCELLED' && event.packId) setProgress((current) => { const next = { ...current }; delete next[event.packId!]; return next; });
      if (event.type === 'PACK_ERROR' && event.packId) setProgress((current) => ({ ...current, [event.packId!]: { ...(current[event.packId!] ?? { completed: 0, total: 1 }), error: event.message ?? 'Échec du téléchargement' } }));
    });
    void requestOfflinePackStatus();
    return unsubscribe;
  }, [reloadStorage, supported]);

  const groups = useMemo(() => {
    const packs = catalog?.packs ?? [];
    return [
      { id: 'courses', title: 'Cours audio', subtitle: 'Écouter les chapitres sans connexion', packs: packs.filter((pack) => pack.id.startsWith('cours-')) },
      { id: 'questions', title: 'Questions audio', subtitle: 'Lecture des énoncés pendant les quiz', packs: packs.filter((pack) => pack.id.startsWith('questions-')) },
      { id: 'options', title: 'Options audio', subtitle: 'Lecture des propositions A, B, C et D', packs: packs.filter((pack) => pack.id.startsWith('options-')) },
    ];
  }, [catalog]);

  if (!supported) return <Screen><Heading title="Contenu hors ligne" /><EmptyState icon="globe-outline" title="Disponible dans la PWA" message="Cette page sert à installer les ressources de la version Web. L’application Android contient déjà ses ressources." /></Screen>;
  if (!catalog && !error) return <Loading />;
  if (error) return <Screen><Heading title="Contenu hors ligne" /><EmptyState icon="cloud-offline-outline" title="Catalogue indisponible" message={error} /></Screen>;

  const start = async (packs: OfflinePack[]) => {
    const missing = packs.filter((pack) => !installed.has(pack.id) && !progress[pack.id]);
    if (!missing.length) return Alert.alert('Déjà disponible', 'Tous les contenus de ce groupe sont déjà enregistrés.');
    const persistent = await requestPersistentStorage();
    if (persistent) setStorage((current) => ({ ...current, persisted: true }));
    for (const pack of missing) await downloadOfflinePack(pack);
  };
  const allPacks = catalog!.packs;
  const installedBytes = allPacks.filter((pack) => installed.has(pack.id)).reduce((sum, pack) => sum + pack.bytes, 0);
  const activeCount = Object.keys(progress).length;

  return <Screen>
    <Heading eyebrow="Installation à la carte" title="Contenu hors ligne" subtitle="Téléchargez seulement ce dont vous avez besoin. Une interruption peut être reprise sans recommencer les fichiers déjà reçus." />
    <Card className="mb-5 overflow-hidden" style={{ backgroundColor: colors.progressBackground, borderColor: colors.progressBorder }}>
      <View className="flex-row items-center justify-between"><View><Text className="text-xs font-bold uppercase tracking-widest text-primary">Contenu enregistré</Text><Text className="mt-2 text-3xl font-black text-ink">{formatBytes(installedBytes)}</Text></View><Ionicons name={storage.persisted ? 'shield-checkmark' : 'cloud-download'} size={36} color={colors.primary} /></View>
      <Text className="mt-3 text-sm text-inkMuted">{installed.size}/{allPacks.length} packs · espace disponible estimé : {formatBytes(storage.available)}</Text>
      <Text className="mt-2 text-xs font-bold text-primary">{storage.persisted ? 'Stockage persistant accordé' : 'La persistance sera demandée au premier téléchargement'}</Text>
    </Card>
    <View className="mb-6 gap-2"><PrimaryButton label={`Tout télécharger (${formatBytes(catalog!.totalBytes)})`} icon="download" onPress={() => void start(allPacks)} /><PrimaryButton label="Télécharger uniquement les cours" icon="book-outline" variant="ghost" onPress={() => void start(groups[0].packs)} /></View>
    {activeCount ? <Card className="mb-5 border-secondary bg-secondarySoft"><Text className="font-black text-ink">{activeCount} téléchargement{activeCount > 1 ? 's' : ''} en cours</Text><Text className="mt-1 text-sm text-inkMuted">Vous pouvez continuer à utiliser l’application.</Text></Card> : null}
    {groups.map((group) => <View key={group.id} className="mb-7">
      <View className="mb-3 flex-row items-end justify-between"><View className="flex-1"><Text className="text-xl font-black text-ink">{group.title}</Text><Text className="mt-1 text-sm text-inkMuted">{group.subtitle}</Text></View><Pressable onPress={() => void start(group.packs)} className="rounded-xl bg-primarySoft px-3 py-2 active:opacity-70"><Text className="text-xs font-black text-primary">Télécharger</Text></Pressable></View>
      {group.packs.map((pack) => <PackRow key={pack.id} pack={pack} installed={installed.has(pack.id)} progress={progress[pack.id]} onDownload={() => void start([pack])} onCancel={() => void cancelOfflinePack(pack.id)} onDelete={() => void deleteOfflinePack(pack.id)} />)}
    </View>)}
  </Screen>;
}

function PackRow({ pack, installed, progress, onDownload, onCancel, onDelete }: { pack: OfflinePack; installed: boolean; progress?: { completed: number; total: number; error?: string }; onDownload: () => void; onCancel: () => void; onDelete: () => void }) {
  const percent = progress ? progress.completed / Math.max(1, progress.total) * 100 : installed ? 100 : 0;
  return <Card className="mb-3 p-4">
    <View className="flex-row items-center gap-3"><View className={`h-10 w-10 items-center justify-center rounded-xl ${installed ? 'bg-primary' : 'bg-primarySoft'}`}><Ionicons name={installed ? 'checkmark' : progress ? 'download' : 'cloud-download-outline'} size={20} color={installed ? colors.white : colors.primary} /></View><View className="flex-1"><Text className="font-black text-ink">{pack.title}</Text><Text className="mt-1 text-xs text-inkMuted">{formatBytes(pack.bytes)} · {pack.fileCount} fichiers</Text></View><Pressable accessibilityLabel={installed ? 'Supprimer' : progress ? 'Suspendre' : 'Télécharger'} onPress={installed ? onDelete : progress ? onCancel : onDownload} className="h-10 w-10 items-center justify-center rounded-xl bg-background"><Ionicons name={installed ? 'trash-outline' : progress ? 'pause' : 'download-outline'} size={19} color={installed ? colors.danger : colors.ink} /></Pressable></View>
    {(progress || installed) ? <View className="mt-3"><ProgressBar value={percent} /><Text className={`mt-2 text-xs font-bold ${progress?.error ? 'text-danger' : 'text-primary'}`}>{progress?.error ?? (installed ? 'Disponible hors ligne' : `${progress?.completed ?? 0}/${progress?.total ?? 0}`)}</Text></View> : null}
  </Card>;
}
