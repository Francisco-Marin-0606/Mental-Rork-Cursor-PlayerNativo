import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { usePlayer } from '@/providers/PlayerProvider';
import * as Haptics from 'expo-haptics';

const hapticImpact = async (style: 'light' | 'medium' | 'rigid') => {
  if (Platform.OS !== 'web') {
    try {
      if (style === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (style === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const hapticSelection = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = (() => {
  const aspectRatio = screenWidth / screenHeight;
  const minDimension = Math.min(screenWidth, screenHeight);
  return minDimension >= 600 && (aspectRatio > 0.6 && aspectRatio < 1.7);
})();

const CoverWithVinyl = React.memo<{ 
  imageSize: number; 
  spinActive?: boolean; 
  vinylUrl?: string; 
  coverUrl?: string;
  trackId?: string;
}>(function CoverWithVinyl({ imageSize, spinActive, vinylUrl, coverUrl, trackId }) {
  const vinylSize = useMemo(() => Math.floor(imageSize * 0.7), [imageSize]);
  const vinylLeft = useMemo(() => Math.floor(imageSize - vinylSize / 2), [imageSize, vinylSize]);
  const vinylTop = useMemo(() => Math.floor((imageSize - vinylSize) / 2), [imageSize, vinylSize]);

  const spin = useRef(new Animated.Value(0)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const currentRotation = useRef(0);
  const listenerIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (spinLoopRef.current) {
      spinLoopRef.current.stop();
      spinLoopRef.current = null;
    }
    
    if (listenerIdRef.current) {
      spin.removeListener(listenerIdRef.current);
      listenerIdRef.current = null;
    }
    
    if (spinActive) {
      const startValue = currentRotation.current % 1;
      spin.setValue(startValue);
      
      listenerIdRef.current = spin.addListener(({ value }) => {
        currentRotation.current = value;
      });
      
      spinLoopRef.current = Animated.loop(
        Animated.timing(spin, { 
          toValue: startValue + 1000, 
          duration: 6000000, 
          easing: Easing.linear, 
          useNativeDriver: true 
        })
      );
      spinLoopRef.current.start();
    }
    
    return () => { 
      if (listenerIdRef.current) {
        spin.removeListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
        spinLoopRef.current = null;
      }
    };
  }, [spinActive, spin]);
  
  const rotate = spin.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ['0deg', '360deg'] 
  });

  return (
    <View style={{ position: 'relative', width: imageSize, height: imageSize }}>
      <Animated.View style={{ 
        position: 'absolute', 
        width: vinylSize, 
        height: vinylSize, 
        left: vinylLeft, 
        top: vinylTop, 
        transform: [{ rotate }] 
      }}>
        <Image 
          source={{ uri: vinylUrl || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinillo/Expansio%CC%81n%20Matutina.png' }} 
          style={{ width: vinylSize, height: vinylSize }} 
          contentFit="contain" 
          cachePolicy="disk"
        />
      </Animated.View>
      <View style={{ width: imageSize, height: imageSize }}>
        <Image 
          source={{ uri: coverUrl || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers/Expansio%CC%81n%20Matutina.png' }} 
          style={{ width: '100%', height: '100%' }} 
          contentFit="cover" 
          cachePolicy="disk"
        />
      </View>
    </View>
  );
});

const ArrowIcon = ({ direction, size = 34, testID }: { direction: 'next' | 'prev'; size?: number; testID?: string }) => {
  const uri = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' as const;
  return (
    <Image 
      source={{ uri }} 
      style={{ 
        width: size, 
        height: size, 
        tintColor: '#fff', 
        transform: [{ scaleX: direction === 'prev' ? -1 : 1 }] 
      }} 
      contentFit="contain" 
      testID={testID} 
    />
  );
};

export default function GlobalPlayerOverlay() {
  const { uiOpen, setUIOpen, current, previous, changeDirection, userPaused, isPlaying, next, prev, pause, play } = usePlayer();

  const sheetHeight = Math.floor(screenHeight * 0.9);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;


  const slideProg = useRef(new Animated.Value(1)).current;
  const initialFade = useRef(new Animated.Value(0)).current;
  const slideAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const fadeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    if (!current) return;
    
    if (slideAnimRef.current) {
      slideAnimRef.current.stop();
      slideAnimRef.current = null;
    }
    if (fadeAnimRef.current) {
      fadeAnimRef.current.stop();
      fadeAnimRef.current = null;
    }
    
    if (!previous || changeDirection === 'none') {
      initialFade.setValue(0);
      fadeAnimRef.current = Animated.timing(initialFade, { 
        toValue: 1, 
        duration: 800, 
        easing: Easing.bezier(0.4, 0.0, 0.2, 1), 
        useNativeDriver: true 
      });
      fadeAnimRef.current.start();
      return;
    }
    
    slideProg.setValue(0);
    slideAnimRef.current = Animated.timing(slideProg, { 
      toValue: 1, 
      duration: 1000, 
      easing: Easing.bezier(0.4, 0.0, 0.2, 1), 
      useNativeDriver: true 
    });
    slideAnimRef.current.start();
  }, [current, previous, changeDirection, slideProg, initialFade]);

  const openAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const open = useCallback(() => {
    if (openAnimRef.current) openAnimRef.current.stop();
    if (closeAnimRef.current) closeAnimRef.current.stop();
    
    const smooth = Easing.bezier(0.22, 1, 0.36, 1);
    openAnimRef.current = Animated.parallel([
      Animated.timing(translateY, { 
        toValue: 0, 
        duration: 861, 
        easing: smooth, 
        useNativeDriver: true 
      }),
      Animated.timing(backdrop, { 
        toValue: 1, 
        duration: 720, 
        easing: smooth, 
        useNativeDriver: true 
      }),
    ]);
    openAnimRef.current.start();
  }, [translateY, backdrop]);

  const close = useCallback(() => {
    if (openAnimRef.current) openAnimRef.current.stop();
    if (closeAnimRef.current) closeAnimRef.current.stop();
    
    const smoothIn = Easing.bezier(0.4, 0, 0.2, 1);
    closeAnimRef.current = Animated.parallel([
      Animated.timing(translateY, { 
        toValue: sheetHeight, 
        duration: 720, 
        easing: smoothIn, 
        useNativeDriver: true 
      }),
      Animated.timing(backdrop, { 
        toValue: 0, 
        duration: 640, 
        easing: smoothIn, 
        useNativeDriver: true 
      }),
    ]);
    closeAnimRef.current.start(({ finished }) => {
      if (finished) setUIOpen(false);
    });
  }, [translateY, backdrop, setUIOpen, sheetHeight]);

  const isSwipingHoriz = useRef<boolean>(false);
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 6;
        return verticalIntent;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
        return verticalIntent;
      },
      onPanResponderMove: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const nextY = Math.max(0, g.dy);
        translateY.setValue(nextY);
        const prog = Math.min(1, nextY / sheetHeight);
        backdrop.setValue(1 - prog);
      },
      onPanResponderRelease: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const shouldClose = g.dy > 120 || g.vy > 0.9;
        if (shouldClose) {
          hapticSelection();
          close();
        } else {
          if (openAnimRef.current) openAnimRef.current.stop();
          if (closeAnimRef.current) closeAnimRef.current.stop();
          openAnimRef.current = Animated.parallel([
            Animated.timing(translateY, { 
              toValue: 0, 
              duration: 600, 
              easing: Easing.bezier(0.22, 1, 0.36, 1), 
              useNativeDriver: true 
            }),
            Animated.timing(backdrop, { 
              toValue: 1, 
              duration: 560, 
              easing: Easing.bezier(0.22, 1, 0.36, 1), 
              useNativeDriver: true 
            }),
          ]);
          openAnimRef.current.start();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => { 
    if (uiOpen) open(); 
  }, [uiOpen, open]);

  const hasAutoPlayedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (uiOpen && current && !isPlaying && !userPaused && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      play().catch(e => console.log('Auto-play error:', e));
    }
    
    if (!uiOpen) {
      hasAutoPlayedRef.current = false;
    }
  }, [uiOpen, current, isPlaying, userPaused, play]);

  const SWIPE_THRESHOLD = 12 as const;
  const SWIPE_VELOCITY = 0.2 as const;
  const swipeLockRef = useRef<boolean>(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { prevRef.current = prev; }, [prev]);

  const coverSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.7 && Math.abs(g.dx) > 3;
        return should;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.75 && Math.abs(g.dx) > 3;
        if (should) {
          isSwipingHoriz.current = true;
        }
        return should;
      },
      onPanResponderGrant: () => {
        isSwipingHoriz.current = true;
        hapticSelection();
      },
      onPanResponderMove: (_e, g) => {
        if (!isSwipingHoriz.current) return;
        if (swipeAnimRef.current) {
          swipeAnimRef.current.stop();
          swipeAnimRef.current = null;
        }
        const damp = 0.9;
        const val = Math.max(-screenWidth, Math.min(screenWidth, g.dx * damp));
        swipeX.setValue(val);
        if (!swipeLockRef.current) {
          const distance = Math.abs(g.dx);
          const velocity = Math.abs(g.vx);
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = g.dx < 0;
            hapticImpact('rigid');
            if (goingNext) {
              nextRef.current?.();
            } else {
              prevRef.current?.();
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
      },
      onPanResponderRelease: (_e, g) => {
        const distance = Math.abs(g.dx ?? 0);
        const velocity = Math.abs(g.vx ?? 0);
        if (!swipeLockRef.current) {
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = (g.dx ?? 0) < 0;
            hapticImpact('rigid');
            if (goingNext) {
              nextRef.current?.();
            } else {
              prevRef.current?.();
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
        isSwipingHoriz.current = false;
        if (swipeAnimRef.current) swipeAnimRef.current.stop();
        swipeAnimRef.current = Animated.spring(swipeX, { toValue: 0, useNativeDriver: true });
        swipeAnimRef.current.start();
      },
      onPanResponderTerminate: () => {
        isSwipingHoriz.current = false;
        if (swipeAnimRef.current) swipeAnimRef.current.stop();
        swipeAnimRef.current = Animated.spring(swipeX, { toValue: 0, useNativeDriver: true });
        swipeAnimRef.current.start();
      },
      onPanResponderEnd: () => {
        isSwipingHoriz.current = false;
        if (swipeAnimRef.current) swipeAnimRef.current.stop();
        swipeAnimRef.current = Animated.spring(swipeX, { toValue: 0, useNativeDriver: true });
        swipeAnimRef.current.start();
      },
    })
  ).current;

  const displayPlaying = isPlaying;
  const spinActive = displayPlaying && Boolean(current?.id);
  
  const darkenedColorCache = useRef<Map<string, string>>(new Map());
  
  const darkenColor = useCallback((hex: string, factor: number): string => {
    const cacheKey = `${hex}-${factor}`;
    if (darkenedColorCache.current.has(cacheKey)) {
      return darkenedColorCache.current.get(cacheKey)!;
    }
    
    try {
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      const result = `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
      darkenedColorCache.current.set(cacheKey, result);
      return result;
    } catch {
      darkenedColorCache.current.set(cacheKey, hex);
      return hex;
    }
  }, []);
  
  const prevBaseColor = useMemo(() => previous?.color ?? '#063536', [previous?.color]);
  const currBaseColor = useMemo(() => current?.color ?? '#EA580C', [current?.color]);
  
  const prevColor = useMemo(() => darkenColor(prevBaseColor, 0.5), [prevBaseColor, darkenColor]);
  const currColor = useMemo(() => darkenColor(currBaseColor, 0.5), [currBaseColor, darkenColor]);
  
  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSizeBase = Math.floor(imageBase * 0.72);
  const imageSize = isTablet ? Math.floor(imageSizeBase * 1.5) : imageSizeBase;
  const imageOffsetDown = isTablet ? 30 : 0;
  const textOffsetDown = isTablet ? 60 : 20;
  const dir = changeDirection;
  const outTo = dir === 'next' ? -screenWidth : screenWidth;
  const inFrom = dir === 'next' ? screenWidth : -screenWidth;
  const prevTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, outTo] });
  const currTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [inFrom, 0] });
  const shouldAnimate = !!previous && dir !== 'none';
  const leftShift = 0;

  return uiOpen ? (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999999, elevation: 9999 }]} pointerEvents="box-none" testID="global-player-overlay-root">
      <Animated.View 
        testID="global-player-backdrop" 
        style={[styles.backdrop, { opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={async () => { 
            await hapticSelection(); 
            close(); 
          }} 
          testID="global-player-backdrop-touch" 
        />
      </Animated.View>

      <Animated.View 
        {...panResponder.panHandlers} 
        style={[styles.sheetContainer, { height: sheetHeight, transform: [{ translateY }] }]} 
        testID="global-player-sheet"
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && dir !== 'none' ? slideProg.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [1, 0.8, 0.2, 0], extrapolate: 'clamp' }) : 0 }]}>
            <LinearGradient 
              colors={[prevColor, prevColor, '#000000']} 
              locations={[0, 0.02, 1]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 0, y: 1 }} 
              style={StyleSheet.absoluteFill} 
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && dir !== 'none' ? slideProg.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.2, 0.8, 1], extrapolate: 'clamp' }) : initialFade }]}>
            <LinearGradient 
              colors={[currColor, currColor, '#000000']} 
              locations={[0, 0.02, 1]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 0, y: 1 }} 
              style={StyleSheet.absoluteFill} 
            />
          </Animated.View>
        </View>
        <View style={styles.sheetGrabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.sheetContent} testID="global-player-swipe-zone">
          <View style={styles.centerZone}>
            <Animated.View 
              {...coverSwipeResponder.panHandlers} 
              style={[styles.centerBlock, { top: 140, transform: [{ translateX: leftShift }, { translateX: swipeX }] }]} 
              testID="global-player-cover-swipe-surface"
            >
              {shouldAnimate ? (
                <View>
                  <Animated.View 
                    style={[
                      styles.coverRow, 
                      { 
                        width: (imageSize + Math.floor((imageSize * 0.7) / 2)), 
                        alignSelf: 'center', 
                        alignItems: 'flex-start', 
                        transform: [{ translateY: imageOffsetDown }, { translateX: prevTranslate }], 
                        opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
                      }
                    ]} 
                    testID="global-player-cover-previous"
                  >
                    <CoverWithVinyl 
                      imageSize={imageSize} 
                      spinActive={false} 
                      vinylUrl={previous?.vinillo} 
                      coverUrl={previous?.imageUrl}
                      trackId={previous?.id} 
                    />
                    <View style={[styles.centerTextBlock, { width: '100%', marginTop: textOffsetDown }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3}>{previous?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{previous?.subtitle ?? ''}</Text>
                    </View>
                  </Animated.View>
                  <Animated.View 
                    style={[
                      styles.coverRow, 
                      StyleSheet.absoluteFillObject as any, 
                      { 
                        width: (imageSize + Math.floor((imageSize * 0.7) / 2)), 
                        alignSelf: 'center', 
                        alignItems: 'flex-start', 
                        transform: [{ translateY: imageOffsetDown }, { translateX: currTranslate }], 
                        opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) 
                      }
                    ]} 
                    testID="global-player-cover-current"
                  >
                    <CoverWithVinyl 
                      imageSize={imageSize} 
                      spinActive={spinActive} 
                      vinylUrl={current?.vinillo} 
                      coverUrl={current?.imageUrl}
                      trackId={current?.id} 
                    />
                    <View style={[styles.centerTextBlock, { width: '100%', marginTop: textOffsetDown }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3}>{current?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{current?.subtitle ?? ''}</Text>
                    </View>
                  </Animated.View>
                </View>
              ) : (
                <View>
                  <View style={{ width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignItems: 'flex-start' }}>
                    <View style={{ transform: [{ translateY: imageOffsetDown }] }}>
                      <CoverWithVinyl 
                        imageSize={imageSize} 
                        spinActive={spinActive} 
                        vinylUrl={current?.vinillo} 
                        coverUrl={current?.imageUrl}
                        trackId={current?.id} 
                      />
                    </View>
                    <View style={[styles.centerTextBlock, { width: '100%', marginTop: textOffsetDown }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3}>{current?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{current?.subtitle ?? ''}</Text>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>
            <View style={styles.controlsRow}>
              <View style={styles.controlsInner} testID="global-player-controls">
                <TouchableOpacity 
                  testID="global-btn-back" 
                  accessibilityRole="button" 
                  onPress={async () => { 
                    await hapticImpact('medium'); 
                    prev(); 
                  }}
                >
                  <ArrowIcon direction="prev" size={isTablet ? 57 : 38} testID="global-icon-prev" />
                </TouchableOpacity>
                <TouchableOpacity 
                  testID="global-btn-toggle" 
                  accessibilityRole="button" 
                  style={styles.playButton} 
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} 
                  onPress={async () => { 
                    await hapticImpact('medium'); 
                    if (displayPlaying) { 
                      await pause(); 
                    } else { 
                      await play(); 
                    } 
                  }} 
                  accessibilityLabel={displayPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {displayPlaying ? (
                    <Image 
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }} 
                      style={{ width: isTablet ? 60 : 40, height: isTablet ? 60 : 40 }} 
                      contentFit="contain" 
                      testID="global-icon-pause" 
                    />
                  ) : (
                    <Image 
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }} 
                      style={{ width: isTablet ? 60 : 40, height: isTablet ? 60 : 40 }} 
                      contentFit="contain" 
                      testID="global-icon-play" 
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  testID="global-btn-forward" 
                  accessibilityRole="button" 
                  onPress={async () => { 
                    await hapticImpact('light'); 
                    next(); 
                  }}
                >
                  <ArrowIcon direction="next" size={isTablet ? 57 : 38} testID="global-icon-next" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  backdrop: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: '#000' 
  },
  sheetContainer: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    overflow: 'hidden' 
  },
  sheetGrabberRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 10 
  },
  grabber: { 
    alignSelf: 'center', 
    width: 44, 
    height: 5, 
    borderRadius: 3, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    marginBottom: 8 
  },
  sheetContent: { 
    flex: 1, 
    paddingHorizontal: 0, 
    paddingTop: 16 
  },
  centerZone: { 
    flex: 1, 
    alignItems: 'center' 
  },
  centerBlock: { 
    position: 'absolute' as const,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  centerTextBlock: { 
    marginTop: 12, 
    alignItems: 'flex-start', 
    paddingHorizontal: 0 
  },
  centerTitle: { 
    color: '#fff', 
    fontSize: isTablet ? 42 : 28, 
    fontWeight: '700' as const, 
    textAlign: 'left' 
  },
  centerSubtitle: { 
    color: '#94a3b8', 
    fontSize: isTablet ? 24 : 16, 
    lineHeight: isTablet ? 27 : 18, 
    marginTop: 6, 
    textAlign: 'left' 
  },
  controlsRow: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: Platform.OS === 'android' ? 70 : 200, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  playButton: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'transparent' 
  },
  coverRow: { 
    paddingHorizontal: 0 
  },
  controlsInner: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '64%', 
    alignSelf: 'center' 
  },
});
