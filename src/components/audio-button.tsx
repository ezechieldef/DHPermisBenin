import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/src/theme/colors';
import { useThemePreferences } from '@/src/theme/preferences';
import type { CourseAudioSegment } from '@/src/services/audio-assets';

const RING_SIZE = 44;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const BACKGROUND_AUDIO_KEY = 'dh-prepa-course-background-audio-v1';

export function AudioButton({ sources = [], segments = [], label = 'Écouter le chapitre', onReadingChange, showSubjects = false, onSubjectsPress }: { text: string; sources?: AudioSource[]; segments?: CourseAudioSegment[]; label?: string; onReadingChange?: (state: { index: number; playing: boolean; startLine: number; endLine: number } | null) => void; showSubjects?: boolean; onSubjectsPress?: () => void }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors: themeColors, themeVariables } = useThemePreferences();
  const headerFont = 'Poppins_800ExtraBold';
  const player = useAudioPlayer(null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [started, setStarted] = useState(false);
  const [rate, setRate] = useState(1);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const indexRef = useRef(0);

  const configureBackgroundPlayback = useCallback(async (enabled: boolean) => {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: enabled,
      interruptionMode: 'duckOthers',
    });
    player.setActiveForLockScreen(enabled, enabled ? {
      title: label,
      artist: 'DH Prépa Permis Bénin',
      albumTitle: 'Cours du Code de la route',
    } : undefined, { showSeekBackward: false, showSeekForward: false });
  }, [label, player]);

  useEffect(() => {
    AsyncStorage.getItem(BACKGROUND_AUDIO_KEY).then((stored) => {
      const enabled = stored === 'true';
      setBackgroundEnabled(enabled);
      void configureBackgroundPlayback(enabled);
    });
  }, [configureBackgroundPlayback]);

  const toggleBackgroundPlayback = useCallback(() => {
    const enabled = !backgroundEnabled;
    setBackgroundEnabled(enabled);
    void AsyncStorage.setItem(BACKGROUND_AUDIO_KEY, String(enabled));
    void configureBackgroundPlayback(enabled);
  }, [backgroundEnabled, configureBackgroundPlayback]);

  const load = useCallback((next: number, play = true) => {
    if (!sources[next]) return;
    indexRef.current = next;
    setIndex(next);
    setStarted(true);
    player.replace(sources[next]);
    setPendingPlay(play);
  }, [player, sources]);

  useEffect(() => {
    player.pause();
    setPendingPlay(false);
    setStarted(false);
    indexRef.current = 0;
    setIndex(0);
    if (sources[0]) player.replace(sources[0]);
  }, [player, sources]);

  useEffect(() => {
    if (!pendingPlay || !status.isLoaded) return;
    setPendingPlay(false);
    player.setPlaybackRate(rate);
    player.play();
  }, [pendingPlay, player, rate, status.isLoaded]);

  useEffect(() => {
    if (status.isLoaded) player.setPlaybackRate(rate);
  }, [player, rate, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish || !started) return;
    const next = indexRef.current + 1;
    if (next < sources.length) load(next, true);
    else {
      setStarted(false);
      indexRef.current = 0;
      setIndex(0);
    }
  }, [load, sources.length, started, status.didJustFinish]);

  const playPause = useCallback(() => {
    if (status.playing) {
      player.pause();
      setPendingPlay(false);
    } else if (started && status.isLoaded) player.play();
    else load(indexRef.current, true);
  }, [load, player, started, status.isLoaded, status.playing]);

  const available = sources.length > 0;
  const playing = status.playing || pendingPlay;
  const passageProgress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const progress = available ? Math.min(1, (index + passageProgress) / sources.length) : 0;

  useEffect(() => {
    const segment = segments[index];
    if (!started || !segment) {
      onReadingChange?.(null);
      return;
    }
    onReadingChange?.({ index, playing, startLine: segment.startLine, endLine: segment.endLine });
  }, [index, onReadingChange, playing, segments, started]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: themeColors.background },
      headerTintColor: themeColors.ink,
      headerTitleStyle: { fontFamily: headerFont },
      headerRight: () => <View className="flex-row items-center">
        {showSubjects ? <Pressable accessibilityLabel="Voir les sujets de ce cours" onPress={onSubjectsPress} className="h-12 w-12 items-center justify-center"><Ionicons name="school-outline" size={23} color={colors.ink} /></Pressable> : null}
        <AudioHeaderAction available={available} playing={playing} progress={progress} onPress={() => setSheetOpen(true)} />
      </View>,
    });
    return () => navigation.setOptions({ headerRight: undefined });
  }, [available, headerFont, navigation, onSubjectsPress, playing, progress, showSubjects, themeColors.background, themeColors.ink]);

  return <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
    <View className="flex-1 justify-end" style={[themeVariables, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]}>
      <Pressable accessibilityLabel="Fermer les commandes audio" className="flex-1" onPress={() => setSheetOpen(false)} />
      <View className="rounded-t-[32px] px-5 pt-3" style={{ backgroundColor: themeColors.surface, paddingBottom: Math.max(32, insets.bottom + 18) }}>
        <View className="mb-5 h-1.5 w-12 self-center rounded-full bg-border" />
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-black uppercase tracking-widest text-primary">Lecture audio</Text>
            <Text className="mt-1 text-2xl font-black text-ink">{label}</Text>
            <Text className="mt-1 text-sm text-inkMuted">{available ? `Passage ${index + 1} sur ${sources.length}` : 'Aucun enregistrement disponible'}</Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={() => setSheetOpen(false)} className="h-11 w-11 items-center justify-center rounded-full bg-background"><Ionicons name="close" size={24} color={colors.ink} /></Pressable>
        </View>

        <View className="mb-6">
          <View className="mb-2 flex-row justify-between"><Text className="text-sm font-bold text-inkMuted">Progression du chapitre</Text><Text className="text-sm font-black text-primary">{Math.round(progress * 100)} %</Text></View>
          <View className="h-2 overflow-hidden rounded-full bg-border"><View className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></View>
        </View>

        <View className="mb-5 flex-row items-center justify-around rounded-2xl bg-background px-2 py-3">
          <CompactControl icon="play-skip-back" label="Précédent" disabled={!available || index === 0} onPress={() => load(indexRef.current - 1, true)} />
          <CompactControl icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Lecture'} disabled={!available} primary onPress={playPause} />
          <CompactControl icon="play-skip-forward" label="Suivant" disabled={!available || index === sources.length - 1} onPress={() => load(indexRef.current + 1, true)} />
          <CompactControl icon="refresh" label="Recommencer" disabled={!available} onPress={() => load(0, true)} />
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-3">
          <View><Text className="font-black text-ink">Vitesse de lecture</Text><Text className="mt-1 text-xs text-inkMuted">De ×0,5 à ×2,5</Text></View>
          <View className="flex-row items-center gap-2">
            <RateButton icon="remove" disabled={rate <= 0.5} onPress={() => setRate((value) => Math.max(0.5, value - 0.25))} />
            <Text className="min-w-14 text-center text-lg font-black text-primary">×{Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(2).replace(/0$/, '')}</Text>
            <RateButton icon="add" disabled={rate >= 2.5} onPress={() => setRate((value) => Math.min(2.5, value + 0.25))} />
          </View>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: backgroundEnabled }}
          accessibilityLabel="Autoriser la lecture audio en arrière-plan"
          onPress={toggleBackgroundPlayback}
          className={`mt-3 flex-row items-center rounded-2xl border p-3 ${backgroundEnabled ? 'border-primary bg-primarySoft' : 'border-border bg-surface'}`}
        >
          <View className={`h-11 w-11 items-center justify-center rounded-full ${backgroundEnabled ? 'bg-primary' : 'bg-background'}`}>
            <Ionicons name="phone-portrait-outline" size={22} color={backgroundEnabled ? colors.white : colors.inkMuted} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-black text-ink">Lecture en arrière-plan</Text>
            <Text className="mt-1 text-xs leading-4 text-inkMuted">Continue lorsque l’application est réduite ou l’écran verrouillé.</Text>
          </View>
          <View className={`h-8 w-14 justify-center rounded-full px-1 ${backgroundEnabled ? 'items-end bg-primary' : 'items-start bg-border'}`}>
            <View className="h-6 w-6 rounded-full bg-white" />
          </View>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

function AudioHeaderAction({ available, playing, progress, onPress }: { available: boolean; playing: boolean; progress: number; onPress: () => void }) {
  return <Pressable disabled={!available} accessibilityLabel="Ouvrir les commandes audio" onPress={onPress} className={`h-12 w-12 items-center justify-center ${available ? '' : 'opacity-40'}`}>
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={colors.border} strokeWidth={RING_STROKE} />
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={colors.primary} strokeWidth={RING_STROKE} strokeLinecap="round" strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`} strokeDashoffset={RING_LENGTH * (1 - progress)} rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
    </Svg>
    <Ionicons name={playing ? 'pause' : 'headset'} size={21} color={colors.ink} />
  </Pressable>;
}

function CompactControl({ icon, label, disabled, primary = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled: boolean; primary?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityLabel={label} onPress={onPress} className={`min-w-16 items-center px-1 py-1 ${disabled ? 'opacity-30' : 'active:opacity-60'}`}><View className={`h-11 w-11 items-center justify-center rounded-full ${primary ? 'bg-primary' : 'bg-surface'}`}><Ionicons name={icon} size={22} color={primary ? colors.white : colors.info} /></View><Text className="mt-1 text-center text-[10px] font-bold text-inkMuted">{label}</Text></Pressable>;
}

function RateButton({ icon, disabled, onPress }: { icon: 'add' | 'remove'; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityLabel={icon === 'add' ? 'Accélérer' : 'Ralentir'} onPress={onPress} className={`h-10 w-10 items-center justify-center rounded-full bg-background ${disabled ? 'opacity-30' : 'active:bg-primarySoft'}`}><Ionicons name={icon} size={21} color={colors.ink} /></Pressable>;
}
