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
} from 'react-native';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CancelSubscriptionResultModalProps {
  visible: boolean;
  onClose: () => void;
  success: boolean;
  errorMessage?: string;
}

export default function CancelSubscriptionResultModal({ visible, onClose, success, errorMessage }: CancelSubscriptionResultModalProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const DURATION_OPEN = 400;
  const DURATION_CLOSE = 350;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);

  const closeModal = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    
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
      onClose();
    });
  }, [opacity, translateX, screenWidth, onClose, easeInOut]);

  const openModal = useCallback(() => {
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
    ]).start();
  }, [opacity, translateX, easeInOut]);

  useEffect(() => {
    if (visible) {
      openModal();
    }
  }, [visible, openModal]);

  useEffect(() => {
    if (!visible) {
      translateX.setValue(screenWidth);
      opacity.setValue(0);
    }
  }, [visible, translateX, opacity, screenWidth]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeModal}
              activeOpacity={0.6}
            >
              <ChevronLeft color="#fbefd9" size={28} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={[styles.iconContainer, success ? styles.iconContainerSuccess : styles.iconContainerError]}>
              {success ? (
                <CheckCircle2 color="#10b981" size={64} strokeWidth={2.5} />
              ) : (
                <XCircle color="#ef4444" size={64} strokeWidth={2.5} />
              )}
            </View>

            <Text style={[styles.title, Platform.OS === 'android' && styles.titleAndroid]}>
              {success ? 'Suscripción cancelada' : 'Error al cancelar'}
            </Text>

            <Text style={[styles.subtitle, Platform.OS === 'android' && styles.subtitleAndroid]}>
              {success 
                ? 'Tu suscripción ha sido cancelada exitosamente. Ya no se te cobrará en el próximo ciclo de facturación.'
                : errorMessage || 'Hubo un error al cancelar tu suscripción. Por favor, intenta de nuevo más tarde.'
              }
            </Text>

            <Animated.View 
              style={{ 
                transform: [{ scale: buttonScale }], 
                opacity: buttonOpacity,
                width: '100%',
                marginTop: 32,
              }}
            >
              <Pressable
                style={styles.button}
                onPress={closeModal}
                onPressIn={() => {
                  Animated.parallel([
                    Animated.spring(buttonScale, {
                      toValue: 0.95,
                      useNativeDriver: true,
                      speed: 50,
                      bounciness: 0,
                    }),
                    Animated.timing(buttonOpacity, {
                      toValue: 0.6,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }}
                onPressOut={() => {
                  Animated.parallel([
                    Animated.spring(buttonScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      speed: 50,
                      bounciness: 4,
                    }),
                    Animated.timing(buttonOpacity, {
                      toValue: 1,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
              >
                <Text style={styles.buttonText}>Volver</Text>
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
    zIndex: 5000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#170501',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 33,
    paddingTop: Platform.OS === 'android' ? 12 : 45,
    paddingBottom: 30,
  },
  header: {
    paddingBottom: 20,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'android' ? 0 : 30,
  },
  closeButton: {
    alignSelf: 'flex-start',
    marginLeft: -10,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconContainerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  titleAndroid: {
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(251, 239, 217, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  subtitleAndroid: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
});
