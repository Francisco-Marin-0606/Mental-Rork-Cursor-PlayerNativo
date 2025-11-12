import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { usePlayer } from "@/providers/PlayerProvider";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import { MovingText } from "./MovingText";
import { useOfflineBanner } from "./OfflineBanner";

const hapticSelection = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AuraStickyPlayer() {
  const { current, previous, changeDirection, userPaused, isPlaying, next, prev, uiOpen, setUIOpen, pause, play } = usePlayer();

  const segments = useSegments();
  const { isOfflineBannerVisible } = useOfflineBanner();
  
  const isInAura = useMemo(() => {
    return String(segments).includes('aura');
  }, [segments]);

  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  
  useEffect(() => {
    return () => { if (optTimer.current) clearTimeout(optTimer.current); };
  }, []);

  const opacity = useRef(new Animated.Value(1)).current;
  const [dismissed] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const shouldShow = !!current && !uiOpen && !dismissed;

    try { opacity.stopAnimation?.(); } catch { /* ignore */ }

    if (shouldShow) {
      Animated.timing(opacity, { toValue: 1, duration: 350, easing: (t)=>t, useNativeDriver: false }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, easing: (t)=>t, useNativeDriver: false }).start();
    }
  }, [current, uiOpen, dismissed, opacity]);

  useEffect(() => {
    const shouldOptimistic = previous && changeDirection !== 'none' && !userPaused && (isPlaying || optimisticPlaying);

    if (shouldOptimistic) {
      armOptimistic(750);
    }
  }, [previous, changeDirection, userPaused, isPlaying, optimisticPlaying, armOptimistic]);

  useEffect(() => {
    if (!isPlaying) {
      setOptimisticPlaying(false);
    }
  }, [isPlaying]);

  const displayPlaying = isPlaying || optimisticPlaying;

  if (!isInAura) return null;
  if (!current || dismissed || uiOpen) return null;

  const bottomBarHeight = () => {
    const footerNavHeight = 50;
    const footerPaddingTop = 10;
    const footerPaddingBottom = Math.max(insets.bottom / 2, 2.5);
    const footerMarginBottom = 22;
    const totalFooterHeight = footerNavHeight + footerPaddingTop + footerPaddingBottom + footerMarginBottom;
    const stickyPadding = 16;
    const extraOffset = 30;
    const offlineBannerOffset = isOfflineBannerVisible ? 40 : 0;
    
    return totalFooterHeight + stickyPadding - extraOffset + offlineBannerOffset;
  };
  
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 999999, elevation: 999999 }]}>
      <AnimatedPressable
        style={[
          styles.container, 
          { 
            opacity,
            bottom: bottomBarHeight()
          }
        ]}
        onPress={async () => {
          await hapticSelection();
          setUIOpen(true);
        }}
      >
        <View style={styles.leftRow}>
          <Image
            source={{ uri: current?.imageUrl }}
            style={styles.cover}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        </View>
        <View style={styles.trackTitleContainer}>
          <MovingText style={styles.trackTitle} text={current?.title || ''} animationThreshold={14} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => {
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await prev();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 28 }}
            testID="aura-sticky-prev"
          >
            <Image
              source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
              style={{ width: 21, height: 21, transform: [{ scaleX: -1 as const }] }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => {
              if (displayPlaying) {
                setOptimisticPlaying(false);
                await pause();
              } else {
                armOptimistic(800);
                await play();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="aura-sticky-toggle"
          >
            {displayPlaying ? (
              <Image
                source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }}
                style={{ width: 21, height: 21 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
                testID="aura-sticky-icon-pause"
              />
            ) : (
              <Image
                source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }}
                style={{ width: 21, height: 21 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
                testID="aura-sticky-icon-play"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => {
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await next();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginLeft: 28, marginRight: 12 }}
            testID="aura-sticky-next"
          >
            <Image
              source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
              style={{ width: 21, height: 21}}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </TouchableOpacity>
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 44,
    right: 44,
    backgroundColor: '#161616',
    borderRadius: 14,
    height: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999999,
    elevation: 999999,
    ...(Platform.OS !== 'web' ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 } : null as any),
  },
  leftRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingRight: 10 
  },
  cover: { 
    width: 41, 
    height: 41 
  },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  trackTitleContainer: {
    flex: 1,
    overflow: 'hidden',
    marginLeft: 0,
    marginRight: 10,
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
