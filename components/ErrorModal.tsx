import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Easing,
  Platform,
  PanResponder,
} from 'react-native';
import { ChevronLeft, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ErrorModal({ visible, onClose }: ErrorModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const buttonAnimation = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
  }).current;

  const DURATION_OPEN = 400;
  const DURATION_CLOSE = 350;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);
  const isAnimatingRef = useRef<boolean>(false);

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

    opacity.stopAnimation();
    translateY.stopAnimation();
    translateX.stopAnimation();
    
    Animated.parallel([
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
    ]).start(() => {
      translateX.setValue(0);
      isAnimatingRef.current = false;
      onClose();
    });
  }, [opacity, translateY, translateX, screenHeight, onClose, easeInOut]);

  const openModal = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    opacity.stopAnimation();
    translateY.stopAnimation();
    translateX.stopAnimation();

    Animated.parallel([
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
    ]).start(() => {
      isAnimatingRef.current = false;
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
      translateX.setValue(0);
      opacity.setValue(0);
    }
  }, [visible, translateY, translateX, opacity, screenHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          const progress = Math.min(gestureState.dx / screenWidth, 1);
          opacity.setValue(1 - progress * 0.5);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > screenWidth * 0.3) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 250,
              easing: easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              easing: easeInOut,
              useNativeDriver: true,
            }),
          ]).start(() => {
            translateX.setValue(0);
            translateY.setValue(screenHeight);
            onClose();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 10,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleBack = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    closeModal();
  }, [closeModal]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonAnimation.scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(buttonAnimation.opacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(buttonAnimation.scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(buttonAnimation.opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="error-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }, { translateX }],
          },
        ]}
        testID="error-container"
        {...panResponder.panHandlers}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack} 
              testID="back-button" 
              activeOpacity={0.6}
            >
              <ChevronLeft color="#fbefd9" size={37.8} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.errorContentContainer}>
            <View style={styles.iconContainer}>
              <AlertCircle color="#fbefd9" size={64} strokeWidth={2} />
            </View>

            <Text style={styles.errorTitle}>{t('errorModal.title')}</Text>
            <Text style={styles.errorSubtitle}>{t('errorModal.subtitle')}</Text>
            
            <Animated.View
              style={{
                transform: [{ scale: buttonAnimation.scale }],
                opacity: buttonAnimation.opacity,
                width: '100%',
                marginTop: 40,
              }}
            >
              <Pressable
                style={styles.backButtonFooter}
                onPress={handleBack}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="back-footer-button"
              >
                <Text style={styles.backButtonText}>{t('errorModal.button')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#170501',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 44,
    paddingTop: Platform.OS === 'android' ? 16 : 60,
    paddingBottom: 40,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 60,
    left: 44,
    right: 44,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: Platform.OS === 'android' ? 0 : 30,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: -10,
    alignSelf: 'flex-start',
  },

  errorContentContainer: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignSelf: 'center',
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
    width: '100%',
  },
  errorSubtitle: {
    fontSize: 16,
    color: 'rgba(251, 239, 217, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    width: '100%',
  },

  backButtonFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  backButtonText: {
    color: '#fbefd9',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
