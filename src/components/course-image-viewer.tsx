import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/src/theme/colors';
import { useThemePreferences } from '@/src/theme/preferences';

type ViewerImage = { source: ImageSourcePropType; title: string; aspectRatio: number } | null;

const clamp = (value: number, minimum: number, maximum: number) => {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
};

export function CourseImageViewer({ image, onClose }: { image: ViewerImage; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors: themeColors, themeVariables } = useThemePreferences();
  const [zoomLabel, setZoomLabel] = useState(1);
  const viewportWidth = Math.max(280, width);
  const viewportHeight = Math.max(280, height - 112);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = useCallback(() => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
    setZoomLabel(1);
  }, [savedScale, savedX, savedY, scale, translateX, translateY]);

  useEffect(() => reset(), [image, reset]);

  const applyButtonZoom = (next: number) => {
    const value = Math.min(4, Math.max(1, next));
    scale.value = withTiming(value);
    savedScale.value = value;
    const maxX = viewportWidth * (value - 1) / 2;
    const maxY = viewportHeight * (value - 1) / 2;
    translateX.value = withTiming(clamp(translateX.value, -maxX, maxX));
    translateY.value = withTiming(clamp(translateY.value, -maxY, maxY));
    savedX.value = translateX.value;
    savedY.value = translateY.value;
    setZoomLabel(value);
  };

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      })
      .onUpdate((event) => {
        const nextScale = clamp(savedScale.value * event.scale, 1, 4);
        const ratio = nextScale / savedScale.value;
        const maxX = viewportWidth * (nextScale - 1) / 2;
        const maxY = viewportHeight * (nextScale - 1) / 2;
        translateX.value = clamp(savedX.value + (viewportWidth / 2 - event.focalX) * (ratio - 1), -maxX, maxX);
        translateY.value = clamp(savedY.value + (viewportHeight / 2 - event.focalY) * (ratio - 1), -maxY, maxY);
        scale.value = nextScale;
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        savedX.value = translateX.value;
        savedY.value = translateY.value;
        runOnJS(setZoomLabel)(scale.value);
      });

    const pan = Gesture.Pan()
      .minPointers(1)
      .onStart(() => {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      })
      .onUpdate((event) => {
        if (scale.value <= 1) return;
        const maxX = viewportWidth * (scale.value - 1) / 2;
        const maxY = viewportHeight * (scale.value - 1) / 2;
        translateX.value = clamp(savedX.value + event.translationX, -maxX, maxX);
        translateY.value = clamp(savedY.value + event.translationY, -maxY, maxY);
      })
      .onEnd(() => {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      });

    const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((event) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
        runOnJS(setZoomLabel)(1);
      } else {
        const nextScale = 2;
        const maxX = viewportWidth / 2;
        const maxY = viewportHeight / 2;
        translateX.value = withTiming(clamp(viewportWidth / 2 - event.x, -maxX, maxX));
        translateY.value = withTiming(clamp(viewportHeight / 2 - event.y, -maxY, maxY));
        scale.value = withTiming(nextScale);
        savedScale.value = nextScale;
        runOnJS(setZoomLabel)(nextScale);
      }
    });
    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [savedScale, savedX, savedY, scale, translateX, translateY, viewportHeight, viewportWidth]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }] }));

  return <Modal visible={Boolean(image)} transparent animationType="fade" onRequestClose={onClose}>
    <GestureHandlerRootView style={[{ flex: 1, backgroundColor: themeColors.black }, themeVariables]}>
    <View className="flex-1" style={{ backgroundColor: themeColors.black }}>
      <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-4 pb-3" style={{ paddingTop: Math.max(16, insets.top + 8) }}>
        <View className="mr-3 flex-1"><Text numberOfLines={2} className="text-base font-black text-white">{image?.title}</Text><Text className="mt-1 text-xs text-white/60">Pincez pour zoomer · faites glisser pour explorer</Text></View>
        <Pressable accessibilityLabel="Fermer l’image" onPress={onClose} className="h-12 w-12 items-center justify-center rounded-full bg-white/15"><Ionicons name="close" size={27} color="white" /></Pressable>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false} className="flex-1 items-center justify-center pt-20" style={{ overflow: 'hidden' }}>
          {image ? <Animated.View style={[{ width: viewportWidth, height: viewportHeight }, animatedStyle]}><Image source={image.source} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={120} /></Animated.View> : null}
        </Animated.View>
      </GestureDetector>

      <View className="absolute left-0 right-0 items-center" style={{ bottom: Math.max(24, insets.bottom + 12) }} pointerEvents="box-none">
        <View className="flex-row items-center gap-3 rounded-full bg-white/15 p-2">
          <ViewerControl icon="remove" label="Réduire" disabled={zoomLabel <= 1} onPress={() => applyButtonZoom(zoomLabel - 0.5)} />
          <Pressable accessibilityLabel="Réinitialiser le zoom" onPress={reset} className="min-w-20 items-center rounded-full bg-white/10 px-4 py-3"><Text className="font-black text-white">{Math.round(zoomLabel * 100)} %</Text></Pressable>
          <ViewerControl icon="add" label="Agrandir" disabled={zoomLabel >= 4} onPress={() => applyButtonZoom(zoomLabel + 0.5)} />
        </View>
      </View>
    </View>
    </GestureHandlerRootView>
  </Modal>;
}

function ViewerControl({ icon, label, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityLabel={label} onPress={onPress} className={`h-12 w-12 items-center justify-center rounded-full bg-white/10 ${disabled ? 'opacity-30' : 'active:bg-white/25'}`}><Ionicons name={icon} size={24} color={colors.white} /></Pressable>;
}

export type { ViewerImage };
