import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { colors } from '@/src/theme/colors';

const AUDIO_MODE_KEY = 'quiz-audio-enabled';

type Props = {
  questionId: number;
  sources: AudioSource[];
};

export function QuizAudioPlayer({ questionId, sources }: Props) {
  const player = useAudioPlayer(null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [segment, setSegment] = useState(0);
  const [round, setRound] = useState(1);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [stopped, setStopped] = useState(false);
  const segmentRef = useRef(0);
  const roundRef = useRef(1);
  const enabledRef = useRef(true);

  const loadSegment = useCallback((nextSegment: number, nextRound: number, play = true) => {
    const source = sources[nextSegment];
    if (!source) return;
    segmentRef.current = nextSegment;
    roundRef.current = nextRound;
    setSegment(nextSegment);
    setRound(nextRound);
    setStopped(false);
    player.replace(source);
    setPendingPlay(play);
  }, [player, sources]);

  useEffect(() => {
    AsyncStorage.getItem(AUDIO_MODE_KEY).then((value) => {
      const next = value !== 'false';
      enabledRef.current = next;
      setEnabled(next);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    player.pause();
    setPendingPlay(false);
    segmentRef.current = 0;
    roundRef.current = 1;
    setSegment(0);
    setRound(1);
    setStopped(false);
    if (enabledRef.current && sources.length) loadSegment(0, 1, true);
  }, [questionId, loadSegment, player, ready, sources.length]);

  useEffect(() => {
    if (!pendingPlay || !status.isLoaded || !enabled) return;
    setPendingPlay(false);
    player.play();
  }, [enabled, pendingPlay, player, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish || !enabledRef.current) return;
    const nextSegment = segmentRef.current + 1;
    if (nextSegment < sources.length) {
      loadSegment(nextSegment, roundRef.current, true);
    } else if (roundRef.current < 2) {
      loadSegment(0, roundRef.current + 1, true);
    } else {
      setPendingPlay(false);
      setStopped(true);
      segmentRef.current = 0;
      roundRef.current = 1;
      setSegment(0);
      setRound(1);
    }
  }, [loadSegment, sources.length, status.didJustFinish]);

  const setAudioMode = (next: boolean) => {
    enabledRef.current = next;
    setEnabled(next);
    void AsyncStorage.setItem(AUDIO_MODE_KEY, String(next));
    if (!next) {
      player.pause();
      setPendingPlay(false);
      setStopped(true);
      return;
    }
    if (sources.length) loadSegment(0, 1, true);
  };

  const togglePause = () => {
    if (status.playing) {
      player.pause();
      setPendingPlay(false);
    } else if (stopped) {
      loadSegment(0, 1, true);
    } else if (status.isLoaded) {
      player.play();
    } else {
      loadSegment(segmentRef.current, roundRef.current, true);
    }
  };

  const replayAll = () => loadSegment(0, 1, true);
  const available = sources.length > 0;
  const isPlaying = status.playing || pendingPlay;
  const segmentLabel = segment === 0 ? 'Question' : `Option ${segment}`;

  return <View className="mb-4 rounded-2xl border border-border bg-surface p-3">
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        <Ionicons name={enabled ? 'volume-high' : 'volume-mute'} size={20} color={enabled ? colors.primary : colors.inkMuted} />
        <View>
          <Text className="text-sm font-black text-ink">Mode audio</Text>
          <Text className="text-xs text-inkMuted">{!available ? 'Audio indisponible' : enabled ? `${segmentLabel} · lecture ${round}/2` : 'Lecture automatique désactivée'}</Text>
        </View>
      </View>
      <Pressable disabled={!available} accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={() => setAudioMode(!enabled)} className={`rounded-full px-4 py-2 ${enabled ? 'bg-primary' : 'bg-background'}`}>
        <Text className={`font-black ${enabled ? 'text-white' : 'text-inkMuted'}`}>{enabled ? 'Écouter' : 'Silence'}</Text>
      </Pressable>
    </View>
    {enabled && available ? <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
      <AudioControl icon={isPlaying ? 'pause' : 'play'} label={isPlaying ? 'Pause' : 'Lire'} onPress={togglePause} />
      <AudioControl icon="play-skip-back" label="Précédent" disabled={segment === 0} onPress={() => loadSegment(segmentRef.current - 1, roundRef.current, true)} />
      <AudioControl icon="play-skip-forward" label="Suivant" disabled={segment === sources.length - 1} onPress={() => loadSegment(segmentRef.current + 1, roundRef.current, true)} />
      <AudioControl icon="refresh" label="Recommencer" onPress={replayAll} />
    </View> : null}
  </View>;
}

function AudioControl({ icon, label, disabled=false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityLabel={label} onPress={onPress} className={`min-w-14 items-center rounded-xl px-1 py-1 active:bg-background ${disabled?'opacity-30':''}`}>
    <Ionicons name={icon} size={20} color={colors.info} />
    <Text className="mt-1 text-center text-[10px] font-bold text-inkMuted">{label}</Text>
  </Pressable>;
}
