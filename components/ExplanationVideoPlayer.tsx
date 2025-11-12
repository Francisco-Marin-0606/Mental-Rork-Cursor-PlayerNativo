import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Animated,
  Image,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, RotateCcw, RotateCw, SkipForward, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import CommentsModal, { Comment } from './CommentsModal';
import { useComments } from '@/lib/api-hooks';
import { usePlayer } from '@/providers/PlayerProvider';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface ExplanationVideoPlayerProps {
  visible: boolean;
  onClose: () => void;
  videoUri?: string;
  comments?: Comment[];
  onSkipToPlayer?: () => void;
  userLevel?: string | number;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    author: 'Cris',
    text: 'He llorado al final de la visualización. Me ha daudo algo de calma y a la vez me ha dado tristeza de ver qué eso no está en mi vida. Volveré a escuchar, y observaré los resultados',
    timeAgo: '14h',
  },
  {
    id: '2',
    author: 'Rebeca',
    text: 'Waw fue viajar a muchos espacios, sentir libertad, tranquilidad y después me quedé profundamente dormida, estoy como carburando que paso , quiero volver a escucharla, gracias, gracias  gracias',
    timeAgo: '2d',
  },
  {
    id: '3',
    author: 'Mari',
    text: 'Wow Julián que fuerte lo que se siente.\nEn mi caso al escuchar mi nombre o el de mi pareja se me aceleraba el corazón y Uff es como una película que va pasando por la mente, es una cosa muy loca',
    timeAgo: '2d',
  },
  {
    id: '4',
    author: 'Israel',
    text: 'Sentí mi cuerpo saldar 3 veces en medio de mi meditación, en completa relajación, se resistía, para evitar el miedo a que me fui a otro lado, o a dejar de sentir el cuerpo. Luego creé una realidad alterna, en el pensamiento, en donde soy muy libre.',
    timeAgo: '2d',
  },
  {
    id: '5',
    author: 'Érika',
    text: 'Gracias, lloré, me liberé y reconocí. Me encantó la visualización y pude ver, sentir el calor y los sentimientos. Me ayudó mucho la música para sentirme en el lugar.',
    timeAgo: '2d',
  },
];

export default function ExplanationVideoPlayer({
  visible,
  onClose,
  videoUri = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Videos%20Intro/Portal%201%20Onboarding.mp4',
  comments = MOCK_COMMENTS,
  onSkipToPlayer,
  userLevel,
}: ExplanationVideoPlayerProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);
  const playPauseIconOpacity = useRef(new Animated.Value(0)).current;
  const hideIconTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsPlayingRef = useRef<boolean>(true);
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const videoProgress = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const { pauseForExternalPlayer } = usePlayer();

  const portal = useMemo(() => {
    if (!userLevel) return undefined;
    const level = typeof userLevel === 'string' ? parseInt(userLevel, 10) : userLevel;
    return 6000 + level;
  }, [userLevel]);

  const formatTimeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 30) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }, []);

  const commentsQuery = useComments(
    portal ? {
      state: 'APPROVED',
      portal,
      page: 1,
      language: 'es',
    } : undefined
  );

  const loadedComments = useMemo(() => {
    if (commentsQuery.data?.comments && Array.isArray(commentsQuery.data.comments)) {
      return commentsQuery.data.comments.map(comment => ({
        id: comment._id,
        author: comment.author,
        text: comment.content,
        timeAgo: formatTimeAgo(comment.createdAt),
        userId: comment.userId,
      }));
    }
    return [];
  }, [commentsQuery.data, formatTimeAgo]);

  useEffect(() => {
    return () => {
      if (hideIconTimeoutRef.current) clearTimeout(hideIconTimeoutRef.current);
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      pauseForExternalPlayer();
      slideAnim.setValue(screenHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    }
  }, [visible, slideAnim, pauseForExternalPlayer]);

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', async () => {
      const v = videoRef.current;
      if (v) {
        try {
          const status = await v.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await v.pauseAsync();
          }
        } catch (error) {
          console.log('Error pausing video on keyboard show:', error);
        }
      }
    });

    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', async () => {
      const v = videoRef.current;
      if (v) {
        try {
          const status = await v.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            await v.playAsync();
          }
        } catch (error) {
          console.log('Error playing video on keyboard hide:', error);
        }
      }
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  useEffect(() => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
    }
    if (isLoading || isBuffering) {
      spinnerTimeoutRef.current = setTimeout(() => {
        setSpinnerVisible(true);
      }, 250);
    } else {
      setSpinnerVisible(false);
    }
  }, [isLoading, isBuffering]);

  const animatePlayPauseIcon = useCallback(() => {
    if (hideIconTimeoutRef.current) {
      clearTimeout(hideIconTimeoutRef.current);
    }
    
    setShowPlayPauseIcon(true);
    
    Animated.timing(playPauseIconOpacity, {
      toValue: 0.6,
      duration: 180,
      useNativeDriver: true,
    }).start();
    
    hideIconTimeoutRef.current = setTimeout(() => {
      Animated.timing(playPauseIconOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowPlayPauseIcon(false);
        }
      });
    }, 2000);
  }, [playPauseIconOpacity]);

  const toggleVideoPlayPause = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    
    const v = videoRef.current;
    if (!v) return;
    
    try {
      const status = await v.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await v.pauseAsync();
        } else {
          await v.playAsync();
        }
        animatePlayPauseIcon();
      }
    } catch (error) {
      console.log('Video play/pause error:', error);
    }
  }, [animatePlayPauseIcon]);

  const handleClose = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    if (hideIconTimeoutRef.current) {
      clearTimeout(hideIconTimeoutRef.current);
    }
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setShowPlayPauseIcon(false);
    prevIsPlayingRef.current = true;
    
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      onClose();
    });
  }, [onClose, slideAnim]);

  const handleSkip = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      onClose();
      onSkipToPlayer?.();
    });
  }, [onClose, onSkipToPlayer, slideAnim]);

  const videoHeight = useMemo(() => {
    return videoProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenHeight, screenHeight * 0.35],
      extrapolate: 'clamp',
    });
  }, [videoProgress]);

  if (!visible) return null;

  const isLoaded = videoStatus?.isLoaded ?? false;
  const positionMillis = isLoaded && videoStatus?.isLoaded ? videoStatus.positionMillis : 0;
  const durationMillis = isLoaded && videoStatus?.isLoaded ? videoStatus.durationMillis ?? 0 : 0;
  const remainingMillis = Math.max(0, durationMillis - positionMillis);
  const remainingMinutes = Math.floor(remainingMillis / 60000);
  const remainingSeconds = Math.floor((remainingMillis % 60000) / 1000);
  const formattedRemaining = `${remainingMinutes}m ${remainingSeconds}s`;
  const totalCommentsCount = commentsQuery.data?.pagination?.totalComments || 0;
  const commentsCount = totalCommentsCount > 140 ? '+140' : `+${totalCommentsCount}`;
  const isVideoPlaying = videoStatus?.isLoaded && (videoStatus as any).isPlaying;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 2000, backgroundColor: '#000', transform: [{ translateY: slideAnim }] }]}>
      <Animated.View style={[styles.videoWrapper, { height: videoHeight }]}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={showCommentsModal ? ResizeMode.CONTAIN : ResizeMode.COVER}
          shouldPlay={true}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            setVideoStatus(status);
            
            if (status.isLoaded) {
              setIsLoading(false);
              setIsBuffering(status.isBuffering ?? false);
              
              if (status.didJustFinish) {
                onSkipToPlayer?.();
                setTimeout(() => {
                  Animated.spring(slideAnim, {
                    toValue: screenHeight,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 10,
                  }).start(() => {
                    onClose();
                  });
                }, 100);
              }
              
              if (prevIsPlayingRef.current !== status.isPlaying) {
                prevIsPlayingRef.current = status.isPlaying;
                animatePlayPauseIcon();
              }
            }
          }}
        />
        
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={toggleVideoPlayPause}
          testID="video-tap-overlay"
        >
        <View style={styles.centerOverlay} pointerEvents="none">
          {spinnerVisible && (
            <ActivityIndicator testID="video-loading" color="#fbefd9" size="large" />
          )}
          {showPlayPauseIcon && !spinnerVisible && (
            <Animated.View
              style={[
                styles.playPauseIconOverlay,
                {
                  opacity: playPauseIconOpacity,
                },
              ]}
            >
              <Image
                testID={isVideoPlaying ? 'pause-icon' : 'play-icon'}
                source={{
                  uri: isVideoPlaying
                    ? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png'
                    : 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png',
                }}
                style={styles.playPauseIconImage}
                resizeMode="contain"
              />
            </Animated.View>
          )}
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {!showCommentsModal && (
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 5, zIndex: 100 }]}
          onPress={handleClose}
          testID="close-video-button"
          activeOpacity={0.7}
        >
          <X color="#ffffff" size={24} />
        </TouchableOpacity>
      )}

      <View style={[styles.videoControlsContainer, { paddingBottom: insets.bottom + 20, zIndex: 99 }]} pointerEvents="box-none">
        <View style={styles.videoControlsWrapper} pointerEvents="box-none">
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                if (videoRef.current && isLoaded && videoStatus?.isLoaded) {
                  const newPosition = Math.max(0, videoStatus.positionMillis - 15000);
                  await videoRef.current.setPositionAsync(newPosition);
                }
              }}
              activeOpacity={0.7}
            >
              <RotateCcw color="#ffffff" size={screenWidth * 0.038} strokeWidth={2} />
              <Text style={styles.videoControlText} numberOfLines={1}>15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                if (videoRef.current && isLoaded && videoStatus?.isLoaded) {
                  const newPosition = Math.min(durationMillis, videoStatus.positionMillis + 15000);
                  await videoRef.current.setPositionAsync(newPosition);
                }
              }}
              activeOpacity={0.7}
            >
              <RotateCw color="#ffffff" size={screenWidth * 0.038} strokeWidth={2} />
              <Text style={styles.videoControlText} numberOfLines={1}>15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <SkipForward color="#ffffff" size={screenWidth * 0.038} strokeWidth={2} />
              <Text style={styles.videoControlText} numberOfLines={1}>Saltar • {formattedRemaining}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={async () => {
                if (Platform.OS !== 'web') {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setShowCommentsModal(true);
                Animated.spring(videoProgress, {
                  toValue: 1,
                  useNativeDriver: false,
                  tension: 50,
                  friction: 8,
                }).start();
              }}
              activeOpacity={0.7}
            >
              <MessageCircle color="#ffffff" size={screenWidth * 0.038} strokeWidth={2} />
              <Text style={styles.videoControlText} numberOfLines={1}>{commentsCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CommentsModal
        visible={showCommentsModal}
        onClose={() => {
          setShowCommentsModal(false);
          Animated.timing(videoProgress, {
            toValue: 0,
            duration: 240,
            useNativeDriver: false,
          }).start();
        }}
        comments={loadedComments}
        videoHeight={screenHeight * 0.35}
        videoProgress={videoProgress}
        userLevel={userLevel}
        portal={portal}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#000',
    zIndex: 10,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  closeButton: {
    position: 'absolute',
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 30,
    marginTop: 15,
  },
  videoControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  videoControlsWrapper: {
    width: '90%',
    alignSelf: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 0,
    marginHorizontal: screenWidth * 0.024,
    gap: screenWidth * 0.048,
    alignSelf: 'center',
  },
  videoControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(140, 45, 20, 0.90)',
    paddingHorizontal: screenWidth * 0.019,
    paddingVertical: screenWidth * 0.019,
    borderRadius: screenWidth * 0.029,
    gap: screenWidth * 0.007,
    minWidth: 0,
  },
  videoControlText: {
    color: '#ffffff',
    fontSize: screenWidth * 0.026,
    fontWeight: '600',
    flexShrink: 1,
  },
  playPauseIconOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseIconImage: {
    width: 47.25,
    height: 47.25,
  },
});
