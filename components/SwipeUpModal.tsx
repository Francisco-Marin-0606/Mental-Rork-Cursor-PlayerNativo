import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Download, Check } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import PlayerModal from './PlayerModal';
import ExplanationVideoPlayer from './ExplanationVideoPlayer';
import PendingPaymentModal from './PendingPaymentModal';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { useUserSession } from '@/providers/UserSession';
import { useAppSettings, useHypnosisImage } from '@/lib/api-hooks';


type DownloadState = 'idle' | 'downloading' | 'completed';
interface ModalDownloadInfo { progress: number; state: DownloadState }

interface SwipeUpModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri?: string;
  title?: string;
  messageForYou?: string;
  qaQuestions?: string[];
  qaAnswers?: string[];
  downloadInfo?: ModalDownloadInfo;
  onRequestDownload?: () => void;
  onRequestDelete?: () => void;
  isOnline?: boolean;
  mediaUri?: string;
  backgroundVideoUri?: string;
  durationFormatted?: string;
  requestId?: string;
  isAvailable?: boolean;
  onMarkedNotAvailable?: (id: string) => void;
  userLevel?: string | number;
}

export default function SwipeUpModal({ visible, onClose, imageUri, title, messageForYou, qaQuestions = [], qaAnswers = [], downloadInfo, onRequestDownload, onRequestDelete, isOnline = true, mediaUri, backgroundVideoUri, durationFormatted, requestId, isAvailable, onMarkedNotAvailable, userLevel }: SwipeUpModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isTablet = Math.min(screenWidth, screenHeight) >= 600;
  const [isClient, setIsClient] = useState(Platform.OS !== 'web');
  const { session } = useUserSession();
  const { data: appSettingsData } = useAppSettings();
  const appSettings = useMemo(() => appSettingsData?.[0], [appSettingsData]);
  const stripeRedirectEnabled = useMemo(() => appSettings?.redirectStripe?.enabledStripe === true, [appSettings]);
  const stripeRedirectLink = useMemo(() => appSettings?.redirectStripe?.linkStripe, [appSettings]);
  
  const userLevelString = useMemo(() => {
    if (!userLevel) return '';
    return typeof userLevel === 'string' ? userLevel : String(userLevel);
  }, [userLevel]);
  
  const { data: hypnosisImageData } = useHypnosisImage(userLevelString);
  
  const onboardingVideoUri = useMemo(() => {
    console.log('[SwipeUpModal] 🎬 Determining onboarding video URI');
    console.log('[SwipeUpModal] userLevel:', userLevel);
    console.log('[SwipeUpModal] hypnosisImageData:', hypnosisImageData);
    console.log('[SwipeUpModal] onboardingVideo:', hypnosisImageData?.onboardingVideo);
    
    if (hypnosisImageData?.onboardingVideo && hypnosisImageData.onboardingVideo.trim().length > 0) {
      console.log('[SwipeUpModal] ✅ Using onboardingVideo from API:', hypnosisImageData.onboardingVideo);
      return hypnosisImageData.onboardingVideo;
    }
    
    console.log('[SwipeUpModal] ⚠️ No onboardingVideo available or empty string');
    return '';
  }, [userLevel, hypnosisImageData]);
  
  const hasOnboardingVideo = useMemo(() => {
    const hasVideo = onboardingVideoUri.trim().length > 0;
    console.log('[SwipeUpModal] hasOnboardingVideo:', hasVideo);
    return hasVideo;
  }, [onboardingVideoUri]);
  
  // Initialize animated values with safe defaults for SSR
  const translateY = useRef(new Animated.Value(isClient ? screenHeight : 1000)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsClient(true);
      translateY.setValue(screenHeight);
    }
  }, [screenHeight, translateY]);

  const [activeTab, setActiveTab] = useState<'mensaje' | 'respuestas'>(() => 'mensaje');

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const [tabWidths, setTabWidths] = useState<{ mensaje: number; respuestas: number }>({ mensaje: 0, respuestas: 0 });
  const [tabPositions, setTabPositions] = useState<{ mensaje: number; respuestas: number }>({ mensaje: 0, respuestas: 0 });
  const tabWidthsRef = useRef(tabWidths);
  const tabPositionsRef = useRef(tabPositions);
  useEffect(() => { tabWidthsRef.current = tabWidths; }, [tabWidths]);
  useEffect(() => { tabPositionsRef.current = tabPositions; }, [tabPositions]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const backgroundTranslateY = useRef(new Animated.Value(0)).current;

  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const [indicatorInitialized, setIndicatorInitialized] = useState<boolean>(false);
  
  // Text animation values
  const textTranslateX = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  const [audioPlayerVisible, setAudioPlayerVisible] = useState<boolean>(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState<boolean>(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<boolean>(false);
  const [pendingPaymentModalVisible, setPendingPaymentModalVisible] = useState<boolean>(false);
  const deleteAlertScale = useRef(new Animated.Value(0.85)).current;
  const deleteAlertOpacity = useRef(new Animated.Value(0)).current;
  const deleteCancelButtonScale = useRef(new Animated.Value(1)).current;
  const deleteCancelButtonOpacity = useRef(new Animated.Value(1)).current;
  const deleteConfirmButtonScale = useRef(new Animated.Value(1)).current;
  const deleteConfirmButtonOpacity = useRef(new Animated.Value(1)).current;
  const downloadProgressAnim = useRef(new Animated.Value(0)).current;

  const easeInOut = Easing.out(Easing.cubic);
  const DURATION_OPEN = 600;
  const DURATION_CLOSE = 600;
  const isAnimatingRef = useRef<boolean>(false);
  const shiftY = useMemo(() => Platform.OS === 'ios' ? screenHeight * 0.03 : 0, [screenHeight]);

  const tabIndicatorAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const animateTabIndicator = useCallback((toTab: 'mensaje' | 'respuestas') => {
    if (tabIndicatorAnimRef.current) {
      try {
        tabIndicatorAnimRef.current.stop();
      } catch {}
    }
    
    const targetX = tabPositionsRef.current[toTab] ?? 0;
    tabIndicatorAnimRef.current = Animated.timing(tabIndicatorPosition, {
      toValue: targetX,
      duration: 350,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    });
    tabIndicatorAnimRef.current.start(() => {
      tabIndicatorAnimRef.current = null;
    });
  }, [tabIndicatorPosition]);

  const textTransitionAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const animateTextTransition = useCallback((direction: 'left' | 'right') => {
    if (textTransitionAnimRef.current) {
      try {
        textTransitionAnimRef.current.stop();
      } catch {}
    }
    
    const slideDistance = screenWidth * 0.25;
    const initialTranslateX = direction === 'left' ? slideDistance : -slideDistance;
    
    try {
      textTranslateX.stopAnimation();
      textOpacity.stopAnimation();
      textTranslateX.setValue(initialTranslateX);
      textOpacity.setValue(0);
    } catch {}
    
    textTransitionAnimRef.current = Animated.parallel([
      Animated.timing(textTranslateX, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
    ]);
    textTransitionAnimRef.current.start(() => {
      textTransitionAnimRef.current = null;
    });
  }, [textTranslateX, textOpacity, screenWidth]);

  const switchToTabSafe = useCallback(async (toTab: 'mensaje' | 'respuestas', direction?: 'left' | 'right') => {
    // Add haptic feedback for tab switches
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    
    // Determine direction if not provided
    const currentTab = activeTabRef.current;
    const autoDirection = (currentTab === 'mensaje' && toTab === 'respuestas') ? 'left' : 'right';
    const slideDirection = direction || autoDirection;
    
    setActiveTab(toTab);
    animateTabIndicator(toTab);
    animateTextTransition(slideDirection);
  }, [animateTabIndicator, animateTextTransition]);

  const switchToTab = useCallback((toTab: 'mensaje' | 'respuestas') => {
    switchToTabSafe(toTab);
  }, [switchToTabSafe]);

  const isDownloading = downloadInfo?.state === 'downloading';
  const isDownloaded = downloadInfo?.state === 'completed';
  const downloadProgress = Math.max(0, Math.min(100, Math.round(downloadInfo?.progress ?? 0)));

  useEffect(() => {
    Animated.timing(downloadProgressAnim, {
      toValue: downloadProgress,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [downloadProgress, downloadProgressAnim]);



  const startDownload = useCallback(async () => {
    if (isDownloading) return;
    
    if (isDownloaded) {
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
          console.log('Haptic feedback error:', error);
        }
      }
      
      setDeleteConfirmVisible(true);
      deleteAlertScale.setValue(0.85);
      deleteAlertOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(deleteAlertScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 14,
        }),
        Animated.timing(deleteAlertOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (error) { console.log('Haptic feedback error:', error); }
    }
    onRequestDownload?.();
  }, [isDownloading, isDownloaded, onRequestDownload, deleteAlertScale, deleteAlertOpacity]);

  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const closeModal = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }

    if (closeAnimRef.current) {
      try {
        closeAnimRef.current.stop();
      } catch {}
    }
    
    try {
      opacity.stopAnimation();
      translateY.stopAnimation();
    } catch {}
    
    closeAnimRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]);
    closeAnimRef.current.start(() => {
      isAnimatingRef.current = false;
      closeAnimRef.current = null;
      onClose();
    });
  }, [opacity, translateY, screenHeight, onClose, easeInOut]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          const hasIntent = Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.vx) > 0.05;
          return isHorizontal && hasIntent;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          textTranslateX.stopAnimation();
          textOpacity.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          const dragResistance = 0.6;
          const maxDrag = screenWidth * 0.4;
          let dragOffset = gestureState.dx * dragResistance;
          dragOffset = Math.max(-maxDrag, Math.min(maxDrag, dragOffset));
          textTranslateX.setValue(dragOffset);
          const fadeAmount = Math.abs(dragOffset) / maxDrag;
          const nextOpacity = 1 - fadeAmount * 0.3;
          textOpacity.setValue(Math.max(0.7, nextOpacity));
        },
        onPanResponderRelease: (_, gestureState) => {
          const distanceThreshold = Math.max(24, screenWidth * 0.15);
          const velocityThreshold = 0.05;
          const isLeftSwipe = gestureState.dx <= -distanceThreshold || gestureState.vx <= -velocityThreshold;
          const isRightSwipe = gestureState.dx >= distanceThreshold || gestureState.vx >= velocityThreshold;
          const currentTab = activeTabRef.current;

          if (isLeftSwipe && currentTab === 'mensaje') {
            switchToTabSafe('respuestas', 'left');
            return;
          }
          if (isRightSwipe && currentTab === 'respuestas') {
            switchToTabSafe('mensaje', 'right');
            return;
          }

          Animated.parallel([
            Animated.spring(textTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 7,
              velocity: Math.abs(gestureState.vx) * 100,
            }),
            Animated.spring(textOpacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 80,
              friction: 7,
            }),
          ]).start();
        },
      }),
    [switchToTabSafe, textTranslateX, textOpacity, screenWidth]
  );

  const openAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const openModal = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    if (openAnimRef.current) {
      try {
        openAnimRef.current.stop();
      } catch {}
    }
    
    try {
      opacity.stopAnimation();
      translateY.stopAnimation();
    } catch {}

    openAnimRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]);
    openAnimRef.current.start(() => {
      isAnimatingRef.current = false;
      openAnimRef.current = null;
    });
  }, [opacity, translateY, easeInOut]);

  useEffect(() => {
    if (visible) {
      openModal();
    }
  }, [visible, openModal]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
    }
  }, [visible, translateY, opacity, screenHeight]);

  const playIconUri = useMemo(() => 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Netflix/Reproducir.png', []);
  const explainIconUri = useMemo(() => 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Netflix/Explicacion.png', []);

  const formattedMessageForYou = useMemo(() => {
    const raw = (messageForYou ?? '').trim();
    if (raw.length === 0) return t('swipeUpModal.messageFallback', { defaultValue: 'Mensaje para ti no disponible.' }) as string;
    
    const sentences = raw.split(/\.(?!\.)/);
    const formatted = sentences
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join('.\n\n')
      .trim();
    
    return formatted + (raw.endsWith('.') ? '.' : '');
  }, [messageForYou, t]);

  if (!visible || !isClient) return null;

  return (
    <View style={styles.overlay} testID="swipeup-overlay" pointerEvents={audioPlayerVisible ? 'box-none' : 'auto'}>
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" testID="modal-backdrop" />
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }],
          },
        ]}
        testID="swipeup-container"
      >
        <Animated.View
          style={[
            styles.modalGradientBg,
            {
              transform: [{ translateY: backgroundTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          {imageUri ? (
            <Animated.Image
              source={{ uri: imageUri }}
              style={styles.modalBgImage}
              resizeMode="cover"
            />
          ) : null}
          <Svg width={screenWidth} height={screenHeight * 15}>
            <Defs>
              <SvgLinearGradient id="modalBg" x1="0%" y1="0%" x2="86.6%" y2="50%">
                <Stop offset="0%" stopColor="#a2380e" stopOpacity={1} />
                <Stop offset="100%" stopColor="#7c2709" stopOpacity={1} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width={screenWidth} height={screenHeight * 15} fill="url(#modalBg)" />
          </Svg>
        </Animated.View>
        <View style={[styles.innerShift, Platform.OS === 'ios' && { marginTop: shiftY }]} testID="modal-inner">
          {Platform.OS !== 'android' && (
            <View style={styles.dragArea} testID="drag-area">
              <View style={styles.handle} />
            </View>
          )}

          <Animated.ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            testID="modal-scrollview"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              {
                useNativeDriver: false,
                listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const offsetY = event.nativeEvent.contentOffset.y;
                  const parallaxOffset = offsetY * 0.5;
                  backgroundTranslateY.setValue(-parallaxOffset);
                },
              }
            )}
            scrollEventThrottle={16}
          >
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeModal} 
              testID="close-button" 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color="#ffffff" size={24} />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={[styles.imageContainer, isTablet && { marginBottom: 24, height: 350 }]}>
                <View style={styles.imageShadowContainer}>
                  <Image
                    source={{
                      uri: imageUri || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Netflix/ImagenPrueba.png',
                    }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>{title || 'El reloj quieto\nen la mesa'}</Text>
                <Text style={styles.durationText}>{t('swipeUpModal.duration')} <Text style={styles.durationLight}>{durationFormatted ?? '—'}</Text></Text>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <View style={styles.actionsSectionInner}>
                <View style={styles.card} testID="info-actions-card">

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.playBtn}
                      activeOpacity={0.1}
                      onPress={async () => {
                        // Add haptic feedback
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                          } catch (error) {
                            console.log('Haptic feedback error:', error);
                          }
                        }
                        
                        // Check if user has pending payment and show modal
                        const isPendingPayment = session?.isMembershipActive === false && session?.subscriptionStatus !== 'canceled';
                        if (isPendingPayment && stripeRedirectEnabled && stripeRedirectLink) {
                          if (Platform.OS !== 'web') {
                            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                          }
                          console.log('[SwipeUpModal Play] Pending payment, showing modal');
                          setPendingPaymentModalVisible(true);
                          return;
                        }
                        
                        // Check if user needs to subscribe and show modal
                        if (session?.isMembershipActive === false && session?.subscriptionStatus === 'canceled') {
                          if (stripeRedirectEnabled && stripeRedirectLink) {
                            if (Platform.OS !== 'web') {
                              try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                            }
                            console.log('[SwipeUpModal Play] Showing pending payment modal');
                            setPendingPaymentModalVisible(true);
                            return;
                          }
                        }
                        
                        if (isAvailable && requestId && hasOnboardingVideo) {
                          console.log('[SwipeUpModal] Calling updateIsAvailable for requestId:', requestId);
                          try {
                            onMarkedNotAvailable?.(requestId);
                          } catch (error) {
                            console.log('[SwipeUpModal] Error calling onMarkedNotAvailable:', error);
                          }
                          console.log('[SwipeUpModal] Navigating to ExplanationVideoPlayer because isAvailable is true and hasOnboardingVideo');
                          setVideoPlayerVisible(true);
                        } else {
                          console.log('[SwipeUpModal] Going directly to AudioPlayer - hasOnboardingVideo:', hasOnboardingVideo);
                          setAudioPlayerVisible(true);
                        }
                      }}
                      testID="play-button"
                      accessibilityRole="button"
                      accessibilityLabel={t('swipeUpModal.playButton')}
                    >
                      <Image
                        source={{ uri: playIconUri }}
                        style={styles.icon}
                      />
                      <Text style={styles.playText}>{t('swipeUpModal.playButton')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.downloadBtnSmall, 
                        isDownloading && styles.downloadBtnLoading,
                        isDownloaded && styles.downloadBtnCompleted
                      ]}
                      activeOpacity={isDownloading ? 1 : 0.2}
                      onPress={async () => {
                        // Check if user has pending payment and show modal
                        const isPendingPayment = session?.isMembershipActive === false && session?.subscriptionStatus !== 'canceled';
                        if (isPendingPayment && stripeRedirectEnabled && stripeRedirectLink) {
                          if (Platform.OS !== 'web') {
                            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                          }
                          console.log('[SwipeUpModal Download] Pending payment, showing modal');
                          setPendingPaymentModalVisible(true);
                          return;
                        }
                        
                        // Check if user needs to subscribe and show modal
                        if (session?.isMembershipActive === false && session?.subscriptionStatus === 'canceled') {
                          if (stripeRedirectEnabled && stripeRedirectLink) {
                            if (Platform.OS !== 'web') {
                              try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                            }
                            console.log('[SwipeUpModal Download] Showing pending payment modal');
                            setPendingPaymentModalVisible(true);
                            return;
                          }
                        }
                        
                        startDownload();
                      }}
                      testID="download-button"
                      accessibilityRole="button"
                      accessibilityLabel={
                        isDownloaded ? t('swipeUpModal.downloaded') : 
                        isDownloading ? t('swipeUpModal.downloadProgress', { progress: downloadProgress }) : t('swipeUpModal.downloadButton')
                      }
                      disabled={isDownloading}
                    >
                      {isDownloading && (
                        <Animated.View 
                          style={[
                            styles.downloadProgress,
                            { 
                              width: downloadProgressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                              })
                            },
                          ]}
                        />
                      )}
                      {isDownloaded ? (
                        <Check color="#FFFFFF" size={18} />
                      ) : (
                        <Download color="#FFFFFF" size={18} />
                      )}
                      <Text style={styles.downloadText}>
                        {isDownloaded ? t('swipeUpModal.downloaded') : 
                         isDownloading ? t('swipeUpModal.downloadProgress', { progress: downloadProgress }) : t('swipeUpModal.downloadButton')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {(isOnline && !isAvailable && hasOnboardingVideo) && (
                    <TouchableOpacity
                      style={styles.explainBtnWide}
                      activeOpacity={0.2}
                      onPress={async () => {
                        // Add haptic feedback
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                          } catch (error) {
                            console.log('Haptic feedback error:', error);
                          }
                        }
                        
                        // Check if user has pending payment and show modal
                        const isPendingPayment = session?.isMembershipActive === false && session?.subscriptionStatus !== 'canceled';
                        if (isPendingPayment && stripeRedirectEnabled && stripeRedirectLink) {
                          if (Platform.OS !== 'web') {
                            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                          }
                          console.log('[SwipeUpModal Explain] Pending payment, showing modal');
                          setPendingPaymentModalVisible(true);
                          return;
                        }
                        
                        // Check if user needs to subscribe (canceled subscription) and show modal
                        if (session?.isMembershipActive === false && session?.subscriptionStatus === 'canceled') {
                          if (stripeRedirectEnabled && stripeRedirectLink) {
                            if (Platform.OS !== 'web') {
                              try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
                            }
                            console.log('[SwipeUpModal Explain] Showing pending payment modal');
                            setPendingPaymentModalVisible(true);
                            return;
                          }
                        }
                        
                        console.log('Explicación pressed');
                        setVideoPlayerVisible(true);
                      }}
                      testID="explain-button"
                      accessibilityRole="button"
                      accessibilityLabel={t('swipeUpModal.explainButton')}
                    >
                      <Image
                        source={{ uri: explainIconUri }}
                        style={styles.icon}
                      />
                      <Text style={styles.explainText}>{t('swipeUpModal.explainButton')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.tabsSection} {...panResponder.panHandlers}>
              <View style={styles.tabsSectionInner}>
                <View style={styles.tabsContainer}>
                  <View style={styles.tabsRow} testID="tabs-row">
                    <TouchableOpacity
                      onPress={() => switchToTab('mensaje')}
                      activeOpacity={0.1}
                      style={styles.tabButton}
                      testID="tab-mensaje"
                      accessibilityRole="button"
                      accessibilityLabel={t('swipeUpModal.tabs.message')}
                      onLayout={(event) => {
                        const { width, x } = event.nativeEvent.layout;
                        setTabWidths(prev => ({ ...prev, mensaje: width }));
                        setTabPositions(prev => ({ ...prev, mensaje: x }));
                        if (activeTabRef.current === 'mensaje' && !indicatorInitialized) {
                          tabIndicatorPosition.setValue(x);
                          setIndicatorInitialized(true);
                        }
                      }}
                    >
                      <Text style={[styles.tabText, { opacity: activeTab === 'mensaje' ? 1 : 0.3 }]}>{t('swipeUpModal.tabs.message')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => switchToTab('respuestas')}
                      activeOpacity={0.1}
                      style={styles.tabButton}
                      testID="tab-respuestas"
                      accessibilityRole="button"
                      accessibilityLabel={t('swipeUpModal.tabs.answers')}
                      onLayout={(event) => {
                        const { width, x } = event.nativeEvent.layout;
                        setTabWidths(prev => ({ ...prev, respuestas: width }));
                        setTabPositions(prev => ({ ...prev, respuestas: x }));
                        if (activeTabRef.current === 'respuestas' && !indicatorInitialized) {
                          tabIndicatorPosition.setValue(x);
                          setIndicatorInitialized(true);
                        }
                      }}
                    >
                      <Text style={[styles.tabText, { opacity: activeTab === 'respuestas' ? 1 : 0.3 }]}>{t('swipeUpModal.tabs.answers')}</Text>
                    </TouchableOpacity>
                  </View>

                  <Animated.View 
                    style={[
                      styles.tabIndicator,
                      {
                        width: activeTab === 'mensaje' ? tabWidths.mensaje : tabWidths.respuestas,
                        transform: [{ translateX: tabIndicatorPosition }],
                      }
                    ]}
                  />
                </View>

                <View style={styles.tabContentContainer}>
                  <Animated.View 
                    style={[
                      styles.animatedContentContainer,
                      {
                        transform: [{ translateX: textTranslateX }],
                        opacity: textOpacity,
                      }
                    ]}
                  >
                    {activeTab === 'mensaje' ? (
                      <Text style={styles.longParagraph} testID="universe-paragraph">{formattedMessageForYou}</Text>
                    ) : (
                      <View style={styles.answersContainer} testID="answers-container">
                        {Array.from({ length: Math.max(qaQuestions.length, qaAnswers.length) }).map((_, idx) => {
                          const q = qaQuestions[idx] ?? '';
                          const a = qaAnswers[idx] ?? '';
                          const showSep = idx !== Math.max(qaQuestions.length, qaAnswers.length) - 1;
                          return (
                            <View key={`qa-${idx}`} style={styles.questionBlock}>
                              <Text style={styles.questionText}>{`${idx + 1}. ${q}`}</Text>
                              <Text style={styles.answerText}>{a}</Text>
                              {showSep ? <View style={styles.separator} /> : null}
                            </View>
                          );
                        })}
                        {qaQuestions.length === 0 && qaAnswers.length === 0 ? (
                          <Text style={styles.answerText}>{t('swipeUpModal.noAnswers', { defaultValue: 'Sin respuestas registradas.' })}</Text>
                        ) : null}
                      </View>
                    )}
                  </Animated.View>
                </View>
              </View>
            </View>
          </Animated.ScrollView>
        </View>
      </Animated.View>

      <PlayerModal
        visible={audioPlayerVisible}
        onClose={() => setAudioPlayerVisible(false)}
        mode="audio"
        title={title || 'El reloj quieto en la mesa'}
        mediaUri={mediaUri ?? ''}
        backgroundVideoUri={backgroundVideoUri}
      />

      <ExplanationVideoPlayer
        visible={videoPlayerVisible}
        onClose={() => setVideoPlayerVisible(false)}
        videoUri={onboardingVideoUri}
        onSkipToPlayer={() => {
          setVideoPlayerVisible(false);
          setAudioPlayerVisible(true);
        }}
        userLevel={userLevel}
      />

      <PendingPaymentModal
        visible={pendingPaymentModalVisible}
        onClose={() => setPendingPaymentModalVisible(false)}
        stripeLink={stripeRedirectLink}
      />

      {deleteConfirmVisible && (
        <View style={styles.deleteOverlay}>
          <TouchableOpacity 
            style={styles.deleteBackdrop} 
            onPress={() => {
              Animated.parallel([
                Animated.timing(deleteAlertScale, {
                  toValue: 0.85,
                  duration: 150,
                  useNativeDriver: true,
                }),
                Animated.timing(deleteAlertOpacity, {
                  toValue: 0,
                  duration: 150,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                setDeleteConfirmVisible(false);
              });
            }} 
            activeOpacity={1} 
          />
          <Animated.View style={[
            styles.deleteConfirmContainer,
            {
              opacity: deleteAlertOpacity,
              transform: [{ scale: deleteAlertScale }],
            },
          ]}>
            <View style={styles.deleteConfirmGradientBg} />
            <View style={styles.deleteConfirmContent}>
              <Text style={styles.deleteConfirmTitle}>{t('swipeUpModal.deleteConfirm.title')}</Text>
              <Text style={styles.deleteConfirmMessage}>{t('swipeUpModal.deleteConfirm.message')}</Text>
              <View style={styles.deleteConfirmButtons}>
                <Animated.View style={{ flex: 1, transform: [{ scale: deleteCancelButtonScale }], opacity: deleteCancelButtonOpacity }}>
                  <TouchableOpacity
                    style={styles.deleteConfirmCancelButton}
                    onPress={async () => {
                      if (Platform.OS !== 'web') {
                        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      }
                      Animated.parallel([
                        Animated.timing(deleteAlertScale, {
                          toValue: 0.85,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                        Animated.timing(deleteAlertOpacity, {
                          toValue: 0,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start(() => {
                        setDeleteConfirmVisible(false);
                      });
                    }}
                    onPressIn={() => {
                      Animated.parallel([
                        Animated.spring(deleteCancelButtonScale, {
                          toValue: 0.9,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 0,
                        }),
                        Animated.timing(deleteCancelButtonOpacity, {
                          toValue: 0.2,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    onPressOut={() => {
                      Animated.parallel([
                        Animated.spring(deleteCancelButtonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 4,
                        }),
                        Animated.timing(deleteCancelButtonOpacity, {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    activeOpacity={1}
                  >
                    <Text style={styles.deleteConfirmCancelText}>{t('swipeUpModal.deleteConfirm.cancel')}</Text>
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={{ flex: 1, transform: [{ scale: deleteConfirmButtonScale }], opacity: deleteConfirmButtonOpacity }}>
                  <TouchableOpacity
                    style={styles.deleteConfirmDeleteButton}
                    onPress={async () => {
                      if (Platform.OS !== 'web') {
                        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
                      }
                      Animated.parallel([
                        Animated.timing(deleteAlertScale, {
                          toValue: 0.85,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                        Animated.timing(deleteAlertOpacity, {
                          toValue: 0,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start(() => {
                        setDeleteConfirmVisible(false);
                        onRequestDelete?.();
                      });
                    }}
                    onPressIn={() => {
                      Animated.parallel([
                        Animated.spring(deleteConfirmButtonScale, {
                          toValue: 0.9,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 0,
                        }),
                        Animated.timing(deleteConfirmButtonOpacity, {
                          toValue: 0.2,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    onPressOut={() => {
                      Animated.parallel([
                        Animated.spring(deleteConfirmButtonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 4,
                        }),
                        Animated.timing(deleteConfirmButtonOpacity, {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    activeOpacity={1}
                  >
                    <Text style={styles.deleteConfirmDeleteText}>{t('swipeUpModal.deleteConfirm.delete')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  modalContainer: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden' },
  modalGradientBg: { ...StyleSheet.absoluteFillObject, height: '1500%' },
  modalBgImage: { ...StyleSheet.absoluteFillObject, opacity: 0.22 },
  gradientFill: { flex: 1 },
  innerShift: { flex: 1, position: 'relative' },
  dragArea: { paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  handle: { width: 40, height: 4, backgroundColor: 'transparent', borderRadius: 2, marginBottom: 4 },
  closeButton: { position: 'absolute', top: 24, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10, marginRight: 30, marginBottom: 10 },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 120, position: 'relative' },
  content: { paddingHorizontal: 24, paddingTop: 56, marginTop: 40 },
  imageContainer: { alignItems: 'center', marginBottom: 24, alignSelf: 'center', width: '66%', maxWidth: 300, aspectRatio: 4 / 5, position: 'relative' },
  imageShadowContainer: {
    width: '100%', aspectRatio: 4 / 5, shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 12.5, elevation: 12.5, borderRadius: 16,
  },
  image: { width: '100%', height: '100%', borderRadius: 16 },
  textContainer: { alignItems: 'center', alignSelf: 'center', width: '80%', maxWidth: 344 },
  title: { fontSize: 32, fontWeight: '600', color: '#ffffff', textAlign: 'center', marginBottom: 0, lineHeight: 34 },
  card: {
    alignSelf: 'stretch', width: '100%', backgroundColor: '#984616', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  cardOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  infoTextCenter: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center', alignSelf: 'center', width: '100%' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  explainBtnWide: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#b36017', paddingVertical: 10, borderRadius: 10, gap: 8,
    ...BUTTON_STYLES.elevatedShadow,
  },
  downloadBtnSmall: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Platform.OS === 'android' ? '#935139' : 'rgba(255, 255, 255, 0.2)', paddingVertical: 10, borderRadius: 10, gap: 8,
    ...BUTTON_STYLES.elevatedShadow, position: 'relative', overflow: 'hidden',
  },
  explainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  playBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 10, gap: 8,
    ...BUTTON_STYLES.elevatedShadow,
  },
  playText: { color: '#000000', fontSize: 16, fontWeight: '600' },
  actionsSection: { alignSelf: 'stretch', width: '100%', paddingTop: 24, paddingBottom: 24, marginTop: -24 },
  actionsSectionInner: { alignSelf: 'center', width: '80%', maxWidth: 520 },
  tabsSection: { alignSelf: 'stretch', width: '100%', paddingTop: 24, paddingBottom: 24, backgroundColor: 'transparent' },
  tabsSectionInner: { alignSelf: 'center', width: '80%', maxWidth: 520 },
  tabsContainer: { position: 'relative', marginBottom: 12 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 18, marginBottom: 8 },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: '#ffffff', borderRadius: 1.5 },
  tabButton: { paddingVertical: 4 },
  tabText: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textAlign: 'left' },
  longParagraph: { fontSize: 18, color: '#ffffff', lineHeight: 24, opacity: 0.95, textAlign: 'left', marginTop: 20 },
  answersContainer: { gap: 32, marginTop: 20 },
  questionBlock: { gap: 16 },
  questionText: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', lineHeight: 26, textAlign: 'left' },
  answerText: { fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 22, textAlign: 'left' },
  imageFadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 40 },
  imageFadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  imageFadeLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 40 },
  imageFadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 40 },
  durationLight: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  durationText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 11, marginBottom: 16 },
  separator: { height: 1, backgroundColor: '#ffffff', opacity: 0.2, marginTop: 8 },
  icon: { width: 18, height: 18, resizeMode: 'contain' },
  downloadBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4621F', paddingVertical: 10, borderRadius: 10, position: 'relative', overflow: 'hidden' },
  downloadBtnLoading: { backgroundColor: '#b36017' },
  downloadBtnCompleted: { backgroundColor: Platform.OS === 'android' ? '#935139' : 'rgba(255, 255, 255, 0.2)' },
  downloadProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 10 },
  downloadText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  tabContentContainer: { flex: 1 },
  animatedContentContainer: { flex: 1 },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.85)' },
  deleteConfirmContainer: {
    borderRadius: 20,
    width: '92%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  deleteConfirmGradientBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2a1410' },
  deleteConfirmContent: { paddingVertical: 32, paddingHorizontal: 24, position: 'relative', zIndex: 1 },
  deleteConfirmTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteConfirmMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteConfirmCancelButton: {
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmCancelText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  deleteConfirmDeleteButton: {
    paddingVertical: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteConfirmDeleteText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: 0.2,
  },

});
