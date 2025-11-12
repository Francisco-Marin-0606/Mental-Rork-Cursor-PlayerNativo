import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  useWindowDimensions,
  Easing,
  Platform,
} from 'react-native';
import { WifiOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface TrackNotDownloadedModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TrackNotDownloadedModal({ visible, onClose }: TrackNotDownloadedModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const buttonAnimation = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
  }).current;

  const DURATION_OPEN = 300;
  const DURATION_CLOSE = 250;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);
  const isAnimatingRef = useRef<boolean>(false);

  const closeModal = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }

    opacity.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
      onClose();
    });
  }, [opacity, translateY, scale, onClose, easeInOut]);

  const openModal = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    opacity.stopAnimation();
    scale.stopAnimation();

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 7,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
    });
  }, [opacity, scale, easeInOut]);

  useEffect(() => {
    if (visible) {
      openModal();
    }
  }, [visible, openModal]);

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible, opacity, scale]);

  const handleClose = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        toValue: 0.8,
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
    <View style={styles.overlay} testID="track-not-downloaded-overlay">
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </Pressable>
      
      <View style={styles.centerContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
          testID="track-not-downloaded-container"
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <WifiOff color="#fbefd9" size={56} strokeWidth={2} />
            </View>

            <Text style={styles.title}>Sin conexión</Text>
            <Text style={styles.message}>
              No tienes conexión a Internet y este track no está descargado. Conecta a Internet para reproducir este contenido.
            </Text>
            
            <Animated.View
              style={{
                transform: [{ scale: buttonAnimation.scale }],
                opacity: buttonAnimation.opacity,
                width: '100%',
              }}
            >
              <Pressable
                style={styles.button}
                onPress={handleClose}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'rgba(251, 239, 217, 0.1)' } : undefined}
                testID="close-button"
              >
                <Text style={styles.buttonText}>Entendido</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
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
    zIndex: 4000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: '#2a1410',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },
  content: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.9,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  message: {
    fontSize: 15,
    color: 'rgba(251, 239, 217, 0.85)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#ff6b35',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});
