import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface YaDisponibleModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestNow: () => void;
}

export default function YaDisponibleModal({ visible, onClose, onRequestNow }: YaDisponibleModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const primaryButtonScale = useRef(new Animated.Value(1)).current;
  const primaryButtonOpacity = useRef(new Animated.Value(1)).current;
  const secondaryButtonScale = useRef(new Animated.Value(1)).current;
  const secondaryButtonOpacity = useRef(new Animated.Value(1)).current;
  const isNavigatingRef = useRef<boolean>(false);

  const handleRequestNow = useCallback(async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }
    onRequestNow();

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [onRequestNow]);

  const handleRequestLater = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }
    onClose();
  }, [onClose]);

  const handlePrimaryPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(primaryButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(primaryButtonOpacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [primaryButtonScale, primaryButtonOpacity]);

  const handlePrimaryPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(primaryButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(primaryButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [primaryButtonScale, primaryButtonOpacity]);

  const handleSecondaryPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(secondaryButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(secondaryButtonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [secondaryButtonScale, secondaryButtonOpacity]);

  const handleSecondaryPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(secondaryButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(secondaryButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [secondaryButtonScale, secondaryButtonOpacity]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        
        <View style={styles.gradientBackground}>
          <Svg width={screenWidth} height={screenHeight}>
            <Defs>
              <SvgLinearGradient id="modalBg" x1="0%" y1="0%" x2="86.6%" y2="50%">
                <Stop offset="0%" stopColor="#a2380e" stopOpacity={1} />
                <Stop offset="100%" stopColor="#7c2709" stopOpacity={1} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="url(#modalBg)" />
          </Svg>
        </View>
        
        <View style={styles.safe}>
          <View style={styles.container}>
            <View style={styles.content}>
              <Text style={[styles.title, isTablet && { fontSize: 124, lineHeight: 124 }]}>{t('yaDisponible.title')}</Text>
              <Text style={[styles.subtitle, isTablet && { fontSize: 26, lineHeight: 34 }]}>
                {t('yaDisponible.subtitle')}
              </Text>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
              <Animated.View
                style={{
                  transform: [{ scale: primaryButtonScale }],
                  opacity: primaryButtonOpacity,
                }}
              >
                <Pressable
                  style={styles.primaryButton}
                  onPress={handleRequestNow}
                  onPressIn={handlePrimaryPressIn}
                  onPressOut={handlePrimaryPressOut}
                  android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                >
                  <Text style={styles.primaryButtonText}>{t('yaDisponible.primaryButton')}</Text>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [{ scale: secondaryButtonScale }],
                  opacity: secondaryButtonOpacity,
                }}
              >
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleRequestLater}
                  onPressIn={handleSecondaryPressIn}
                  onPressOut={handleSecondaryPressOut}
                  android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                >
                  <Text style={styles.secondaryButtonText}>{t('yaDisponible.secondaryButton')}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 44,
    paddingTop: Platform.OS === 'android' ? 50 : 110,
  },
  title: {
    fontSize: 62,
    fontWeight: Platform.OS === 'android' ? '500' as const : '600' as const,
    color: '#fbefd9',
    textAlign: 'left',
    letterSpacing: -2.5,
    lineHeight: 62,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '400' as const,
    color: '#fbefd9',
    textAlign: 'left',
    lineHeight: 26,
    letterSpacing: 0,
  },
  footer: {
    paddingHorizontal: 44,
    paddingTop: 20,
    gap: 10,
  },
  primaryButton: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: '#fbefd9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  primaryButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#3a2a1a',
  },
  secondaryButton: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: Platform.OS === 'android' ? '#935139' : 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  secondaryButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#fbefd9',
  },
});
