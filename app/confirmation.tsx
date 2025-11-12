import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserSession } from '@/providers/UserSession';
import { apiClient } from '@/lib/api-client';
import ErrorModal from '@/components/ErrorModal';

const EPS = 0.0001;

export default function ConfirmationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { session } = useUserSession();
  const isTablet = useMemo(() => screenWidth >= 768, [screenWidth]);
  const title = t('confirmation.title');
  const titleChars = title.split('');
  const submitButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonOpacity = useRef(new Animated.Value(1)).current;
  const reviewButtonScale = useRef(new Animated.Value(1)).current;
  const reviewButtonOpacity = useRef(new Animated.Value(1)).current;
  const textEraseProgress = useRef(new Animated.Value(0)).current;
  const textRevealProgress = useRef(new Animated.Value(0)).current;
  const buttonEnterProgress = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const [isErasing, setIsErasing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<{ questions: { question: string; answer: string }[] } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const dataStr = await AsyncStorage.getItem(`confirmation_data_${session?.userId ?? 'anon'}`);
        if (dataStr) {
          const data = JSON.parse(dataStr);
          setFormData(data);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [session?.userId]);

  React.useEffect(() => {
    if (!isLoading) {
      textRevealProgress.stopAnimation();
      buttonEnterProgress.stopAnimation();
      
      Animated.timing(textRevealProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      Animated.timing(buttonEnterProgress, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [textRevealProgress, buttonEnterProgress, isLoading]);

  const handleSubmit = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }

    if (!formData || !formData.questions || formData.questions.length === 0) {
      setShowErrorModal(true);
      return;
    }

    try {
      setIsSubmitting(true);

      let membershipDate: string | undefined = undefined;
      try {
        const userData = await apiClient.user.getById(session?.userId ?? '');
        membershipDate = (userData as any)?.lastMembership?.membershipDate;
      } catch (userError) {
        console.error('Error fetching user data:', userError);
      }

      const payload = {
        userId: session?.userId ?? 'anonymous',
        email: session?.email ?? '',
        requestDate: new Date().toISOString(),
        membershipDate,
        status: 'created',
        audioMotive: {
          questions: formData.questions,
        },
      };

      await apiClient.audioRequest.create(payload);

      await AsyncStorage.removeItem(`confirmation_data_${session?.userId ?? 'anon'}`);
      await AsyncStorage.removeItem(`form_cache_${session?.userId ?? 'anon'}`);

      setIsErasing(true);
      textEraseProgress.stopAnimation();
      Animated.timing(textEraseProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start(() => {
        router.push('/success');
      });
    } catch (e: any) {
      console.error('Error submitting form:', e?.message);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [textEraseProgress, formData, session]);

  const handleReview = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.back();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          const progress = Math.min(gestureState.dx / screenWidth, 1);
          swipeOpacity.setValue(1 - progress * 0.5);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.stopAnimation();
        swipeOpacity.stopAnimation();
        
        if (gestureState.dx > screenWidth * 0.3) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(swipeOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            router.back();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 10,
            }),
            Animated.timing(swipeOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleSubmitPressIn = useCallback(() => {
    submitButtonScale.stopAnimation();
    submitButtonOpacity.stopAnimation();
    Animated.parallel([
      Animated.spring(submitButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(submitButtonOpacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [submitButtonScale, submitButtonOpacity]);

  const handleSubmitPressOut = useCallback(() => {
    submitButtonScale.stopAnimation();
    submitButtonOpacity.stopAnimation();
    Animated.parallel([
      Animated.spring(submitButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(submitButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [submitButtonScale, submitButtonOpacity]);

  const handleReviewPressIn = useCallback(() => {
    reviewButtonScale.stopAnimation();
    reviewButtonOpacity.stopAnimation();
    Animated.parallel([
      Animated.timing(reviewButtonScale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(reviewButtonOpacity, {
        toValue: 0.2,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reviewButtonScale, reviewButtonOpacity]);

  const handleReviewPressOut = useCallback(() => {
    reviewButtonScale.stopAnimation();
    reviewButtonOpacity.stopAnimation();
    Animated.parallel([
      Animated.timing(reviewButtonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(reviewButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reviewButtonScale, reviewButtonOpacity]);

  const totalChars = titleChars.length;

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#ff6b35" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Animated.View 
        style={[styles.safe, {
          transform: [{ translateX }],
          opacity: swipeOpacity,
        }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.titleContainer}>
              {titleChars.map((char, index) => {
                // Delays “simétricos”
                const revealDelay =
                  index < totalChars / 2
                    ? (totalChars / 2 - index) / totalChars
                    : (index - totalChars / 2) / totalChars;

                const eraseDelay =
                  index < totalChars / 2
                    ? index / totalChars
                    : (totalChars - 1 - index) / totalChars;

                // Evitar 0 en puntos intermedios
                const revealStart = Math.max(EPS, revealDelay * 0.5);
                const revealMid = Math.min(1 - EPS, revealStart + 0.5);

                const eraseStart = Math.max(EPS, eraseDelay);
                const eraseMid = Math.min(1 - EPS, eraseStart + 0.3);

                const revealOpacity = textRevealProgress.interpolate({
                  inputRange: [0, revealStart, revealMid, 1],
                  outputRange: [0, 0, 1, 1],
                  extrapolate: 'clamp',
                });

                const eraseOpacity = textEraseProgress.interpolate({
                  inputRange: [0, eraseStart, eraseMid, 1],
                  outputRange: [1, 1, 0, 0],
                  extrapolate: 'clamp',
                });

                const finalOpacity = Animated.multiply(revealOpacity, eraseOpacity);

                return (
                  <Animated.Text
                    key={`char-${index}`}
                    style={[styles.titleChar, { opacity: finalOpacity, fontSize: isTablet ? 96 : 48 }]}
                  >
                    {char}
                  </Animated.Text>
                );
              })}
            </View>
          </View>

          <View
            style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
            pointerEvents={(isErasing || isSubmitting) ? 'none' : 'auto'}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: submitButtonScale },
                  {
                    translateY: buttonEnterProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
                opacity: Animated.multiply(
                  Animated.multiply(submitButtonOpacity, buttonEnterProgress),
                  textEraseProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  })
                ),
              }}
            >
              <Pressable
                style={styles.submitButton}
                onPress={handleSubmit}
                onPressIn={handleSubmitPressIn}
                onPressOut={handleSubmitPressOut}
                disabled={isSubmitting}
                android_ripple={
                  Platform.OS === 'android'
                    ? { color: 'rgba(255,255,255,0.08)' }
                    : undefined
                }
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Enviando...' : t('confirmation.submitButton')}
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={{
                transform: [
                  { scale: reviewButtonScale },
                  {
                    translateY: buttonEnterProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
                opacity: Animated.multiply(
                  Animated.multiply(reviewButtonOpacity, buttonEnterProgress),
                  textEraseProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  })
                ),
              }}
            >
              <Pressable
                style={styles.reviewButton}
                onPress={handleReview}
                onPressIn={handleReviewPressIn}
                onPressOut={handleReviewPressOut}
                disabled={isSubmitting}
                android_ripple={
                  Platform.OS === 'android'
                    ? { color: 'rgba(255,255,255,0.08)' }
                    : undefined
                }
              >
                <Text style={styles.reviewButtonText}>{t('confirmation.reviewButton')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <ErrorModal visible={showErrorModal} onClose={() => setShowErrorModal(false)} />
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
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titleContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  titleChar: {
    fontWeight: '600' as const,
    color: '#fbefd9',
    letterSpacing: -0.5,
  },
  footer: {
    paddingHorizontal: 44,
    paddingTop: 30,
    gap: 10,
  },
  submitButton: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: '#ff6b35',
  },
  submitButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#ffffff',
  },
  reviewButton: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: 'rgba(251, 239, 217, 0.1)',
  },
  reviewButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
