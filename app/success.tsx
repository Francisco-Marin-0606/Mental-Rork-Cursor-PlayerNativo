import React, { useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { useTranslation } from 'react-i18next';
import { useUserSession } from '@/providers/UserSession';
import { useQueryClient } from '@tanstack/react-query';

export default function SuccessScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useUserSession();
  const queryClient = useQueryClient();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const titleRevealProgress = useRef(new Animated.Value(0)).current;
  const infoRevealProgress = useRef(new Animated.Value(0)).current;
  const buttonEnterProgress = useRef(new Animated.Value(0)).current;

  const titleLines = t('success.title', { returnObjects: true }) as string[];
  const subtitleLines = t('success.subtitle', { returnObjects: true }) as string[];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleRevealProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(infoRevealProgress, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(buttonEnterProgress, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [titleRevealProgress, infoRevealProgress, buttonEnterProgress]);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }
    console.log('[Success] Returning to home and refetching audio requests');
    
    if (session?.userId) {
      console.log('[Success] Invalidating audioRequests query for userId:', session.userId);
      await queryClient.invalidateQueries({ queryKey: ['audioRequests', session.userId] });
    }
    
    router.push('/');
  }, [queryClient, session?.userId]);

  const handlePressIn = useCallback(() => {
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
  }, [buttonScale, buttonOpacity]);

  const handlePressOut = useCallback(() => {
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
  }, [buttonScale, buttonOpacity]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      <View style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.textContainer}>
              {titleLines.map((line: string, lineIndex: number) => {
                const maxChars = Math.max(...titleLines.map((l: string) => l.length));
                
                return (
                  <View key={`title-line-${lineIndex}`} style={styles.textLineContainer}>
                    {line.split('').map((char, charIndex) => {
                      const revealStart = charIndex / maxChars;
                      let revealEnd = revealStart + 0.28;
                      if (revealEnd >= 1) revealEnd = 0.999;
                      if (revealEnd <= revealStart) revealEnd = revealStart + 0.001;
                      
                      const opacity = titleRevealProgress.interpolate({
                        inputRange: [0, revealStart, revealEnd, 1],
                        outputRange: [0, 0, 1, 1],
                      });

                      const baseFontSize = Platform.OS === 'android' ? 49.6 : 62;
                      const adjustedBaseFontSize = isTablet ? baseFontSize * 2 : baseFontSize;
                      const fontSize = i18n.language === 'en' ? adjustedBaseFontSize * 0.9 : adjustedBaseFontSize;
                      
                      return (
                        <Animated.Text
                          key={`title-${lineIndex}-${charIndex}`}
                          style={[styles.titleChar, { opacity, fontSize, lineHeight: fontSize }]}
                        >
                          {char}
                        </Animated.Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
            
            <View style={styles.infoTextContainer}>
              {subtitleLines.map((line: string, lineIndex: number) => {
                const maxChars = Math.max(...subtitleLines.map((l: string) => l.length));
                
                return (
                  <View key={`info-line-${lineIndex}`} style={styles.textLineContainer}>
                    {line.split('').map((char, charIndex) => {
                      const revealStart = charIndex / maxChars;
                      let revealEnd = revealStart + 0.28;
                      if (revealEnd >= 1) revealEnd = 0.999;
                      if (revealEnd <= revealStart) revealEnd = revealStart + 0.001;
                      
                      const opacity = infoRevealProgress.interpolate({
                        inputRange: [0, revealStart, revealEnd, 1],
                        outputRange: [0, 0, 1, 1],
                      });

                      const infoFontSize = isTablet 
                        ? (Platform.OS === 'android' ? 32 : 40) 
                        : (Platform.OS === 'android' ? 16 : 20);
                      const infoLineHeight = isTablet 
                        ? (Platform.OS === 'android' ? 41.6 : 52) 
                        : (Platform.OS === 'android' ? 20.8 : 26);

                      return (
                        <Animated.Text
                          key={`info-${lineIndex}-${charIndex}`}
                          style={[styles.infoChar, { opacity, fontSize: infoFontSize, lineHeight: infoLineHeight }]}
                        >
                          {char}
                        </Animated.Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Animated.View
              style={{
                transform: [
                  { scale: buttonScale },
                  { translateY: buttonEnterProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  })},
                ],
                opacity: Animated.multiply(buttonOpacity, buttonEnterProgress),
              }}
            >
              <Pressable
                style={styles.button}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.08)' } : undefined}
              >
                <Text style={styles.buttonText}>{t('success.button')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#170501',
  },
  safe: {
    flex: 1,
    backgroundColor: '#170501',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 44,
  },
  textContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginBottom: 20,
  },
  infoTextContainer: {
    flexDirection: 'column' as const,
    gap: 0,
  },
  textLineContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  titleChar: {
    fontWeight: '600' as const,
    color: '#fbefd9',
    letterSpacing: -2.5,
  },
  infoChar: {
    fontSize: Platform.OS === 'android' ? 16 : 20,
    fontWeight: '400' as const,
    color: 'rgba(251, 239, 217, 0.65)',
    lineHeight: Platform.OS === 'android' ? 20.8 : 26,
    letterSpacing: 0,
  },
  footer: {
    paddingHorizontal: 44,
    paddingTop: 20,
    gap: 10,
  },

  button: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: '#ff6b35',
  },
  buttonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#ffffff',
  },
});
