
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '@/providers/PlayerProvider';

export type Mode = 'audio' | 'video';

interface PlayerModalProps {
  visible: boolean;
  onClose: () => void;
  mode: Mode;
  title?: string;
  mediaUri: string;
  backgroundVideoUri?: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.log('PlayerModal error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer} testID="player-error-boundary">
          <ErrorText />
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

function ErrorText() {
  const { t } = useTranslation();
  return <Text style={styles.errorText}>{t('playerModal.error')}</Text>;
}

const DEFAULT_BACKGROUND_URI = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Carrusel%20V2/Mental%20Login%20Background_2.mp4';

// Speed zones configuration - exactly 2 levels
const SPEED_ZONES = {
  SLOW: { multiplier: 0.2, hapticType: 'light' as const },    // Highest = slowest/most precise
  NORMAL: { multiplier: 1.0, hapticType: 'medium' as const }, // Lower = normal speed
};

const ZONE_HEIGHT = 80; // Height of each speed zone in pixels

export default function PlayerModal({ visible, onClose, mode, title, mediaUri, backgroundVideoUri }: PlayerModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [isClient, setIsClient] = useState(Platform.OS !== 'web');
  const { pauseForExternalPlayer } = usePlayer();
  const isTablet = screenWidth >= 768;

  // Initialize animated values with safe defaults for SSR
  const translateY = useRef(new Animated.Value(isClient ? screenHeight : 1000)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsClient(true);
      translateY.setValue(screenHeight);
    }
  }, [screenHeight, translateY]);

  const isDraggingRef = useRef<boolean>(false);
  const isSeekingRef = useRef<boolean>(false);

  const videoRef = useRef<Video>(null);             // principal (video o "pista de audio" oculta)
  const backgroundVideoRef = useRef<Video>(null);   // video de fondo para modo audio
  const webVideoRef = useRef<HTMLVideoElement | null>(null); // web video visible (o pista)
  const webBackgroundVideoRef = useRef<HTMLVideoElement | null>(null); // web video de fondo para audio
  const webAudioRef = useRef<HTMLAudioElement | null>(null); // web audio cuando mode === 'audio'

  // === Estado liviano ===
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intendedPlayingRef = useRef<boolean>(false); // única verdad: intención del UI
  const isClosingRef = useRef<boolean>(false); // prevenir operaciones durante cierre

  // refs para throttling/RAF
  const rafRef = useRef<number | null>(null);

  const easeInOut = Easing.out(Easing.cubic);
  const DURATION_OPEN = 600;
  const DURATION_CLOSE = 600;
  const DURATION_SNAP = 420;
  const HANDLE_CLOSE_THRESHOLD = 100;
  const VELOCITY_CLOSE_THRESHOLD = 0.5;

  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // ====== PLAY/PAUSE ======
  const applyPlayStateWeb = useCallback(async (playing: boolean) => {
    try {
      if (Platform.OS !== 'web') return;
      if (mode === 'audio') {
        const audioEl = webAudioRef.current;
        const bgVideoEl = webBackgroundVideoRef.current;
        if (audioEl) {
          if (playing) await audioEl.play(); else audioEl.pause();
        }
        if (bgVideoEl) {
          if (playing) await bgVideoEl.play(); else bgVideoEl.pause();
        }
      } else {
        const el = webVideoRef.current;
        if (!el) return;
        if (playing) await el.play(); else el.pause();
      }
    } catch (err) {
      console.log('applyPlayStateWeb error:', err);
    }
  }, [mode]);

  const togglePlayPause = useCallback(async () => {
    try {
      // Add haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      
      const next = !intendedPlayingRef.current;
      intendedPlayingRef.current = next;
      setIsPlaying(next);

      if (Platform.OS === 'web') {
        await applyPlayStateWeb(next);
      } else {
        // Control del audio/video principal
        if (videoRef.current) {
          const status = await videoRef.current.getStatusAsync();
          if ('isLoaded' in status && status.isLoaded) {
            if (next) await videoRef.current.playAsync();
            else await videoRef.current.pauseAsync();
          }
        }
        // Control del video de fondo en modo audio
        if (mode === 'audio' && backgroundVideoRef.current) {
          const bgStatus = await backgroundVideoRef.current.getStatusAsync();
          if ('isLoaded' in bgStatus && bgStatus.isLoaded) {
            if (next) await backgroundVideoRef.current.playAsync();
            else await backgroundVideoRef.current.pauseAsync();
          }
        }
      }
    } catch (err) {
      // Silently handle error in production
    }
  }, [applyPlayStateWeb, mode]);

  const seekTo = useCallback(
    async (targetMs: number) => {
      try {
        const target = Math.max(0, Math.min(duration ?? 0, targetMs));
        if (Platform.OS === 'web') {
          if (mode === 'audio') {
            const audioEl = webAudioRef.current;
            if (audioEl) audioEl.currentTime = target / 1000;
          } else {
            const el = webVideoRef.current;
            if (el) el.currentTime = target / 1000;
          }
          setPosition(target);
        } else {
          if (videoRef.current) {
            await videoRef.current.setPositionAsync(target);
          }
          setPosition(target);
        }
      } catch (err) {
        console.log('seekTo error:', err);
      }
    },
    [duration, mode]
  );

  const skipBy = useCallback(
    async (deltaMs: number) => {
      try {
        // Add haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        
        const target = Math.max(0, Math.min(duration ?? 0, (position ?? 0) + deltaMs));
        await seekTo(target);
      } catch (err) {
        // Silently handle error in production
      }
    },
    [duration, position, seekTo]
  );

  // ====== Animaciones de apertura/cierre ======
  const closeAnimated = useCallback(
    (done: () => void) => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: DURATION_CLOSE, easing: easeInOut, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: screenHeight, duration: DURATION_CLOSE, easing: easeInOut, useNativeDriver: true }),
      ]).start(() => done());
    },
    [DURATION_CLOSE, easeInOut, opacity, screenHeight, translateY]
  );

  const closeModal = useCallback(async (skipHaptic: boolean = false) => {
    if (isClosingRef.current) return; // Prevenir múltiples llamadas
    isClosingRef.current = true;
    
    // Add haptic feedback only if not auto-closing
    if (!skipHaptic && Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    
    try {
      intendedPlayingRef.current = false;
      setIsPlaying(false);
      
      // Pausar medios de forma más robusta
      if (Platform.OS === 'web') {
        if (mode === 'audio') {
          const audio = webAudioRef.current;
          const bgVideo = webBackgroundVideoRef.current;
          if (audio && !audio.paused) audio.pause();
          if (bgVideo && !bgVideo.paused) bgVideo.pause();
        } else {
          const video = webVideoRef.current;
          if (video && !video.paused) video.pause();
        }
      } else {
        // Para native, pausar de forma asíncrona sin bloquear
        Promise.all([
          videoRef.current?.pauseAsync().catch(() => {}),
          backgroundVideoRef.current?.pauseAsync().catch(() => {})
        ]).catch(() => {});
      }
    } catch (error) {
      console.log('Error pausing media:', error);
    }
    
    closeAnimated(() => {
      isClosingRef.current = false; // Reset flag después del cierre
      onClose();
    });
  }, [closeAnimated, onClose, mode]);

  // ====== Gestos ======
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dy) > Math.abs(gs.dx) && Math.abs(gs.dy) > 10,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (isClosingRef.current) return; // No permitir gestos durante cierre
          isDraggingRef.current = true;
          // Pausar animaciones suavemente
          translateY.stopAnimation();
          opacity.stopAnimation();
          // Cancelar cualquier RAF pendiente para evitar conflictos
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        },
        onPanResponderMove: (_evt, gs) => {
          if (!isDraggingRef.current || isClosingRef.current) return;
          if (gs.dy > 0) {
            translateY.setValue(gs.dy);
            const progress = Math.min(gs.dy / screenHeight, 1);
            opacity.setValue(1 - progress * 0.8); // Menos opacidad para mejor UX
          }
        },
        onPanResponderRelease: (_evt, gs) => {
          if (!isDraggingRef.current || isClosingRef.current) return;
          
          const shouldClose = gs.dy > HANDLE_CLOSE_THRESHOLD || gs.vy > VELOCITY_CLOSE_THRESHOLD;
          if (shouldClose) {
            closeModal();
          } else {
            // Snap back suave
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: 0,
                duration: DURATION_SNAP,
                easing: easeInOut,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: DURATION_SNAP,
                easing: easeInOut,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // Reset dragging flag after animation completes
              isDraggingRef.current = false;
            });
          }
        },
        onPanResponderTerminate: () => {
          // Manejar terminación inesperada
          if (isDraggingRef.current && !isClosingRef.current) {
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: 0,
                duration: DURATION_SNAP,
                easing: easeInOut,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: DURATION_SNAP,
                easing: easeInOut,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // Reset dragging flag after animation completes
              isDraggingRef.current = false;
            });
          }
        },
      }),
    [HANDLE_CLOSE_THRESHOLD, VELOCITY_CLOSE_THRESHOLD, DURATION_SNAP, easeInOut, opacity, screenHeight, translateY, closeModal]
  );

  // ====== Timeline Seek Gestures ======
  const timelineLayoutRef = useRef<{ width: number; x: number }>({ width: 350, x: 0 });
  const seekPositionRef = useRef<number>(0);
  const initialTouchRef = useRef<{ x: number; y: number; position: number }>({ x: 0, y: 0, position: 0 });
  const currentSpeedZoneRef = useRef<number>(1); // 0 = slow, 1 = normal

  
  const getSpeedZone = useCallback((deltaY: number): number => {
    // Negative deltaY means dragging upward (higher zones)
    // Only 2 zones: slow (highest), normal (lower)
    if (deltaY < -ZONE_HEIGHT) return 0; // SLOW zone (dragging high up) - most precise
    return 1;                             // NORMAL zone (center and below) - normal speed
  }, []);
  
  const triggerHapticForZone = useCallback(async (zone: number) => {
    if (Platform.OS === 'web') return;
    
    try {
      switch (zone) {
        case 0: // Slow zone
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 1: // Normal zone
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
      }
    } catch (error) {
      console.log('Haptic feedback error:', error);
    }
  }, []);
  
  const timelinePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          if (isClosingRef.current || duration <= 0) return;
          isSeekingRef.current = true;
          
          // Store initial touch position and current playback position
          const touchX = evt.nativeEvent.pageX;
          const touchY = evt.nativeEvent.pageY;
          const currentPosition = position || 0;
          
          initialTouchRef.current = {
            x: touchX,
            y: touchY,
            position: currentPosition
          };
          
          seekPositionRef.current = currentPosition;
          currentSpeedZoneRef.current = 1; // Start in normal zone
          // Don't change position on initial touch
        },
        onPanResponderMove: (evt, gs) => {
          if (!isSeekingRef.current || isClosingRef.current || duration <= 0) return;
          
          // Calculate movement relative to initial touch
          const currentTouchX = evt.nativeEvent.pageX;
          const currentTouchY = evt.nativeEvent.pageY;
          const deltaY = currentTouchY - initialTouchRef.current.y;
          
          // Determine speed zone based on vertical position (only upward zones)
          const newSpeedZone = getSpeedZone(deltaY);
          
          // When speed zone changes, trigger haptic and update reference
          if (newSpeedZone !== currentSpeedZoneRef.current) {
            currentSpeedZoneRef.current = newSpeedZone;
            triggerHapticForZone(newSpeedZone);
            
            // Update reference point to prevent jumps when changing zones
            // Keep the current seek position as the new baseline
            initialTouchRef.current = {
              x: currentTouchX,
              y: initialTouchRef.current.y, // Keep original Y to maintain zone calculation
              position: seekPositionRef.current
            };
          }
          
          // Calculate horizontal movement from the reference point
          const deltaX = currentTouchX - initialTouchRef.current.x;
          
          // Get speed multiplier for current zone
          const speedMultiplier = newSpeedZone === 0 ? SPEED_ZONES.SLOW.multiplier :
                                 SPEED_ZONES.NORMAL.multiplier;
          
          const timelineLayout = timelineLayoutRef.current;
          
          // Convert pixel movement to time delta with speed adjustment
          const timeDelta = (deltaX / timelineLayout.width) * duration * speedMultiplier;
          const targetPosition = Math.max(0, Math.min(duration, initialTouchRef.current.position + timeDelta));
          
          seekPositionRef.current = targetPosition;
          // Only update UI position during drag, don't seek yet
          setPosition(targetPosition);
        },
        onPanResponderRelease: async () => {
          if (!isSeekingRef.current || isClosingRef.current || duration <= 0) return;
          
          const targetPosition = seekPositionRef.current;
          
          // Reset speed zone
          currentSpeedZoneRef.current = 1;
          
          // Perform the actual seek
          try {
            await seekTo(targetPosition);
          } catch (error) {
            console.log('Seek error:', error);
          } finally {
            isSeekingRef.current = false;
          }
        },
        onPanResponderTerminate: () => {
          isSeekingRef.current = false;
          currentSpeedZoneRef.current = 1;
        },
      }),
    [duration, seekTo, position, getSpeedZone, triggerHapticForZone]
  );

  // ====== Apertura ======
  const openModal = useCallback(() => {
    if (isDraggingRef.current) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: DURATION_OPEN, easing: easeInOut, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: DURATION_OPEN, easing: easeInOut, useNativeDriver: true }),
    ]).start(async () => {
      if (Platform.OS === 'web') {
        await applyPlayStateWeb(intendedPlayingRef.current);
        setIsPlaying(intendedPlayingRef.current);
      } else {
        if (intendedPlayingRef.current) {
          try {
            if (videoRef.current) await videoRef.current.playAsync();
            if (mode === 'audio' && backgroundVideoRef.current) {
              await backgroundVideoRef.current.playAsync();
            }
          } catch {}
          setIsPlaying(true);
        } else {
          try {
            if (videoRef.current) await videoRef.current.pauseAsync();
            if (mode === 'audio' && backgroundVideoRef.current) {
              await backgroundVideoRef.current.pauseAsync();
            }
          } catch {}
          setIsPlaying(false);
        }
      }
    });
  }, [DURATION_OPEN, easeInOut, opacity, translateY, applyPlayStateWeb, mode]);

  useEffect(() => {
    if (visible) openModal();
  }, [visible, openModal]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
    }).catch((e) => console.log('Audio.setAudioModeAsync error', e));
  }, []);

  const hypnosisImageUrl = useRef<string>('https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20Logo%20Azul.jpg');

  useEffect(() => {
    if (!visible || Platform.OS === 'web' || mode !== 'audio') return;

    const setupNowPlaying = async () => {
      try {
        if (videoRef.current) {
          const nowPlayingInfo: any = {
            title: title || 'Hipnosis',
            artist: 'Mental',
          };

          nowPlayingInfo.artwork = hypnosisImageUrl.current;

          await videoRef.current.setNowPlayingAsync(nowPlayingInfo);
          console.log('[PlayerModal] Set now playing info for hypnosis:', nowPlayingInfo);
        }
      } catch (error) {
        console.log('[PlayerModal] Error setting now playing info:', error);
      }
    };

    const timer = setTimeout(setupNowPlaying, 1000);
    return () => clearTimeout(timer);
  }, [visible, title, mode]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
      intendedPlayingRef.current = false;
      setIsPlaying(false);
      isClosingRef.current = false; // Reset flag cuando se cierra
      isDraggingRef.current = false; // Reset drag flag
      isSeekingRef.current = false; // Reset seek flag
    } else {
      // Cuando se abre el modal, queremos que se reproduzca automáticamente
      intendedPlayingRef.current = true;
      setIsPlaying(true);
      isClosingRef.current = false; // Asegurar que no esté en estado de cierre
      
      // Pausar el reproductor de Aura cuando se abre la hipnosis
      pauseForExternalPlayer().catch(() => {});
    }
  }, [visible, screenHeight, translateY, opacity, pauseForExternalPlayer]);

  // ====== Listener de status (native) con throttle vía rAF ======
  const handlePlaybackStatus = useCallback((s: AVPlaybackStatus) => {
    if (!('isLoaded' in s) || !s.isLoaded) return;
    
    // Check if audio has finished - do this BEFORE other checks
    if (s.didJustFinish && !isClosingRef.current) {
      console.log('Audio finished, closing modal with animation');
      closeModal(true); // Skip haptic for auto-close
      return;
    }
    
    if (isSeekingRef.current) return; // Don't update position while seeking
    if (isDraggingRef.current) return; // Don't update position while dragging modal
    if (isClosingRef.current) return; // Don't update position while closing
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPosition(s.positionMillis ?? 0);
      setDuration(s.durationMillis ?? 0);
      // IMPORTANTE: NO actualizamos isPlaying desde el status para evitar loops.
    });
  }, [closeModal]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ====== Web events para progreso ======
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = mode === 'audio' ? webAudioRef.current : webVideoRef.current;
    if (!el) return;

    const onTime = () => {
      if (isSeekingRef.current) return; // Don't update position while seeking
      if (isDraggingRef.current) return; // Don't update position while dragging modal
      if (isClosingRef.current) return; // Don't update position while closing
      setPosition((el.currentTime ?? 0) * 1000);
      setDuration((el.duration ?? 0) * 1000);
    };
    
    const onEnded = () => {
      if (isClosingRef.current) return;
      console.log('Web media ended, closing modal with animation');
      closeModal(true); // Skip haptic for auto-close
    };
    // REMOVIDO: onPlay y onPause listeners que causaban conflictos
    // El estado isPlaying debe ser controlado únicamente por la lógica interna

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onTime);
    el.addEventListener('ended', onEnded);
    // REMOVIDO: event listeners de play/pause que reseteaban el estado

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onTime);
      el.removeEventListener('ended', onEnded);
      // REMOVIDO: cleanup de listeners de play/pause
    };
  }, [visible, mode, closeModal]);

  if (!visible || !isClient) return null;

  const progressPct = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <ErrorBoundary>
      <View style={styles.overlay} testID="player-overlay" pointerEvents="auto">
        <Animated.View style={[styles.backdrop, { opacity }]} testID="player-backdrop" pointerEvents="auto" />

        <Animated.View
          style={[
            styles.modalContainer, 
            { 
              height: screenHeight + (Platform.OS === 'android' ? 50 : 0), 
              transform: [{ translateY }] 
            }
          ]}
          testID="player-container"
        >
          {mode === 'video' ? (
            Platform.OS !== 'web' ? (
              <Video
                ref={videoRef}
                style={[styles.video, Platform.OS === 'android' && { height: screenHeight + 50 }]}
                source={{ uri: mediaUri }}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                isLooping={false}
                shouldPlay={false}
                onPlaybackStatusUpdate={handlePlaybackStatus}
                testID="player-video"
              />
            ) : (
              <View style={[styles.video, styles.webVideoFallback]} testID="player-web-video-fallback">
                <video ref={webVideoRef} style={styles.webVideo} autoPlay muted={false} playsInline preload="auto" />
                {/* Set src via attribute to avoid React re-mounts */}
                <script dangerouslySetInnerHTML={{__html:`
                  (function(){ try{
                    var v = document.currentScript.previousElementSibling;
                    if (v && v.tagName==='VIDEO'){ if (v.src !== ${JSON.stringify(mediaUri)}) v.src = ${JSON.stringify(mediaUri)}; }
                  }catch(e){} })();
                `}} />
              </View>
            )
          ) : (
            // ======= Modo AUDIO =======
            Platform.OS !== 'web' ? (
              <>
                {/* Fondo visual (muteado) */}
                <Video
                  ref={backgroundVideoRef}
                  style={[styles.video, Platform.OS === 'android' && { height: screenHeight + 50 }]}
                  source={{ uri: backgroundVideoUri && backgroundVideoUri.length > 0 ? backgroundVideoUri : DEFAULT_BACKGROUND_URI }}
                  useNativeControls={false}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  isMuted
                  shouldPlay={false} // se controla manualmente
                />
                {/* Pista de audio "invisible" */}
                <Video
                  ref={videoRef}
                  style={{ width: 0, height: 0 }}
                  source={{ uri: mediaUri }}
                  useNativeControls={false}
                  resizeMode={ResizeMode.COVER}
                  isLooping={false}
                  shouldPlay={false}
                  onPlaybackStatusUpdate={handlePlaybackStatus}
                  testID="player-audio-hidden"
                />
              </>
            ) : (
              <View style={[styles.video, styles.webVideoFallback]} testID="player-audio-web-bg">
                {/* Fondo visual */}
                <video ref={webBackgroundVideoRef} style={styles.webVideo} loop muted playsInline preload="auto">
                  <source src={(backgroundVideoUri && backgroundVideoUri.length > 0 ? backgroundVideoUri : DEFAULT_BACKGROUND_URI)} type="video/mp4" />
                </video>
                {/* Pista de audio real */}
                <audio ref={webAudioRef} preload="auto" />
                <script dangerouslySetInnerHTML={{__html:`
                  (function(){ try{
                    var a = document.currentScript.previousElementSibling;
                    if (a && a.tagName==='AUDIO'){ if (a.src !== ${JSON.stringify(mediaUri)}) a.src = ${JSON.stringify(mediaUri)}; }
                  }catch(e){} })();
                `}} />
              </View>
            )
          )}

          <Animated.View style={styles.controlsOverlay} testID="player-drag-area">
            <View style={styles.dragHandle} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>



            <View style={[styles.titleContainer, { paddingBottom: isTablet ? 700 : 500 }]} pointerEvents="none">
              <Text style={styles.title}>
                {title ?? (mode === 'video' ? t('playerModal.defaultTitleVideo') : t('playerModal.defaultTitleAudio'))}
              </Text>
              {mode === 'audio' ? <Text style={styles.subtitle}>{t('playerModal.subtitle')}</Text> : null}
            </View>

            <View style={styles.bottomControls} pointerEvents="box-none">
              <View 
                style={styles.timeline} 
                {...timelinePanResponder.panHandlers}
                onLayout={(event) => {
                  const { width, x } = event.nativeEvent.layout;
                  timelineLayoutRef.current = { width, x };
                }}
              >
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineProgress, { width: `${progressPct}%` }]} />
                  <View style={[styles.timelineThumb, { left: `${progressPct}%` }]} />
                </View>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>-{formatTime(Math.max(0, (duration || 0) - (position || 0)))}</Text>
              </View>

              <View style={styles.navigationControls}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => {
                    skipBy(-10000).catch(() => {});
                  }} 
                  testID="player-skip-back"
                  activeOpacity={0.7}
                >
                  <View style={styles.skipButtonContainer}>
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
                      style={{ width: 36, height: 36, resizeMode: 'contain', transform: [{ scaleX: -1 as const }] }}
                    />
                    <Text style={styles.skipLabel}>{t('playerModal.skipLabel')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.playPauseButton} 
                  onPress={() => {
                    togglePlayPause().catch(() => {});
                  }} 
                  testID="player-toggle-play"
                  activeOpacity={0.7}
                >
                  <Image
                    source={{
                      uri: isPlaying
                        ? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png'
                        : 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png',
                    }}
                    style={styles.playPauseIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => {
                    skipBy(10000).catch(() => {});
                  }} 
                  testID="player-skip-forward"
                  activeOpacity={0.7}
                >
                  <View style={styles.skipButtonContainer}>
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
                      style={{ width: 36, height: 36, resizeMode: 'contain' }}
                    />
                    <Text style={styles.skipLabel}>{t('playerModal.skipLabel')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  webVideoFallback: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    pointerEvents: 'box-none',
  },
  dragHandle: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  handle: {
    width: 60,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 0.768,
    elevation: 0.6,
  },

  titleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: '10%',
    zIndex: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 0,
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.082)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.656,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.6,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 115,
    left: '6%',
    right: '6%',
    alignItems: 'center',
    margin: 15,
    marginTop: 25,
  },
  timeline: {
    width: '100%',
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.024,
    shadowRadius: 0.444,
    elevation: 0.4,
  },
  timelineTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  timelineThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 0.768,
    elevation: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.2,
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 45,
    marginTop: 18,
    flexWrap: 'nowrap',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 0.768,
    elevation: 0.6,
    flexShrink: 1,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 0.768,
    elevation: 0.6,
    flexShrink: 0,
  },
  playPauseIcon: {
    width: 40,
    height: 40,
  },
  skipButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.2,
  },
});
