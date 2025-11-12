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
  Linking,
} from 'react-native';
import { ChevronLeft, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface PendingPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  stripeLink?: string;
}

export default function PendingPaymentModal({ visible, onClose, stripeLink }: PendingPaymentModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(screenWidth)).current;
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
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      translateY.setValue(0);
      isAnimatingRef.current = false;
      onClose();
    });
  }, [opacity, translateY, translateX, screenWidth, onClose, easeInOut]);

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
      Animated.timing(translateX, {
        toValue: 0,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
    });
  }, [opacity, translateX, easeInOut]);

  useEffect(() => {
    if (visible) {
      openModal();
    }
  }, [visible, openModal]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
      translateX.setValue(screenWidth);
      opacity.setValue(0);
    }
  }, [visible, translateY, translateX, opacity, screenWidth]);

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
            translateX.setValue(screenWidth);
            translateY.setValue(0);
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

  const handleGoToStripe = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }

    if (stripeLink) {
      console.log('[PendingPaymentModal] Redirecting to Stripe:', stripeLink);
      try {
        const supported = await Linking.canOpenURL(stripeLink);
        if (supported) {
          await Linking.openURL(stripeLink);
          closeModal();
        } else {
          console.log('[PendingPaymentModal] Cannot open URL:', stripeLink);
        }
      } catch (error) {
        console.log('[PendingPaymentModal] Error opening Stripe link:', error);
      }
    }
  }, [stripeLink, closeModal]);

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
    <View style={styles.overlay} testID="pending-payment-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }, { translateX }],
          },
        ]}
        testID="pending-payment-container"
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

          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <AlertCircle color="#c9841e" size={64} strokeWidth={2} />
            </View>

            <Text style={styles.title}>Pago pendiente</Text>
            <Text style={styles.subtitle}>
              Para acceder a esta función, necesitas completar tu pago. Haz clic en el botón de abajo para finalizar el proceso.
            </Text>
            
            <Animated.View
              style={{
                transform: [{ scale: buttonAnimation.scale }],
                opacity: buttonAnimation.opacity,
                width: '100%',
                marginTop: 40,
              }}
            >
              <Pressable
                style={styles.actionButton}
                onPress={handleGoToStripe}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="go-to-stripe-button"
              >
                <Text style={styles.actionButtonText}>Completar pago</Text>
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

  contentContainer: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
    width: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(251, 239, 217, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    width: '100%',
  },

  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9841e',
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
  actionButtonText: {
    color: '#fbefd9',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
