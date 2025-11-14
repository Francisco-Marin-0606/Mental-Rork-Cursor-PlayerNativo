import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Easing,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserSession } from '@/providers/UserSession';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { useRequestSettings } from '@/lib/api-hooks';

export default function QAScreen() {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { session } = useUserSession();
  const params = useLocalSearchParams<{ audioRequestId?: string; hypnosisName?: string }>();
  const audioRequestId = typeof params?.audioRequestId === 'string' ? params.audioRequestId : '';
  const hypnosisNameParam = typeof params?.hypnosisName === 'string' ? params.hypnosisName : '';

  const { data: audioRequestsByUser } = useQuery({
    queryKey: ['audioRequests', session?.userId],
    queryFn: () => apiClient.audioRequest.findByUserId(session?.userId ?? ''),
    enabled: !!session?.userId && !audioRequestId,
  });
  const latest = audioRequestsByUser?.[0];

  const { data: qaById } = useQuery({
    queryKey: ['audioRequest', audioRequestId],
    queryFn: () => apiClient.audioRequest.findById(audioRequestId),
    enabled: !!audioRequestId && audioRequestId.length === 24,
  });

  const { data: requestSettingsData } = useRequestSettings(session?.userId ?? '');
  const requestSettings = requestSettingsData?.[0];

  const qaPairs = useMemo(() => {
    console.log('[QAScreen] ===== BUILDING Q&A PAIRS =====');
    console.log('[QAScreen] audioRequestId:', audioRequestId);
    console.log('[QAScreen] Has qaById:', !!qaById);
    console.log('[QAScreen] Has latest:', !!latest);
    console.log('[QAScreen] Has requestSettings:', !!requestSettings);
    console.log('[QAScreen] requestSettings.appSettings.questions:', requestSettings?.appSettings?.questions?.length);

    const audioRequest = audioRequestId && qaById ? qaById : latest;
    const audioMotiveData = audioRequest?.audioMotive ?? {};
    const answers = Array.isArray(audioMotiveData?.questions) ? audioMotiveData.questions : [];
    const formQuestions = requestSettings?.appSettings?.questions ?? [];

    console.log('[QAScreen] Answers count:', answers.length);
    console.log('[QAScreen] Form questions count:', formQuestions.length);

    if (formQuestions.length === 0) {
      console.log('[QAScreen] WARNING: No form questions available from requestSettings');
      return answers.map((q: any, index: number) => ({
        question: typeof q?.referenceQuestion === 'string' ? q.referenceQuestion : (typeof q?.question === 'string' ? q.question : `Pregunta ${index + 1}`),
        answer: typeof q?.answer === 'string' ? q.answer : ''
      }));
    }

    const result = answers.map((answer: any, index: number) => {
      const formQuestion = formQuestions[index];
      const questionText = formQuestion?.question ?? answer?.referenceQuestion ?? answer?.question ?? `Pregunta ${index + 1}`;
      
      console.log(`[QAScreen] Q&A Pair ${index}:`, {
        hasFormQuestion: !!formQuestion,
        questionText: questionText.substring(0, 50) + '...',
        answer: (typeof answer?.answer === 'string' ? answer.answer : '').substring(0, 50) + '...'
      });

      return {
        question: questionText,
        answer: typeof answer?.answer === 'string' ? answer.answer : ''
      };
    });

    console.log('[QAScreen] Final Q&A pairs count:', result.length);
    console.log('[QAScreen] ===== END BUILDING Q&A PAIRS =====');
    return result;
  }, [audioRequestId, qaById, latest, requestSettings]);
  const insets = useSafeAreaInsets();
  
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const DURATION_OPEN = 400;
  const DURATION_CLOSE = 350;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);

  const closeScreen = useCallback(async () => {
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
      router.back();
    });
  }, [opacity, screenWidth, easeInOut, translateX]);

  const openScreen = useCallback(() => {
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
    openScreen();
  }, [openScreen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          const progress = Math.min(gestureState.dx / screenWidth, 1);
          opacity.setValue(1 - progress * 0.5);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
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

  const qaData = qaPairs;

  return (
    <View style={styles.overlay} testID="qa-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
          },
        ]}
        testID="qa-container"
        {...panResponder.panHandlers}
      >
        <View style={[
          styles.content,
          { paddingTop: (Platform.OS === 'android' ? 12 : insets.top + 15) }
        ]}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeScreen} 
              testID="close-button" 
              activeOpacity={0.6}
            >
              <ChevronLeft color="#fbefd9" size={28} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('qaScreen.title')}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const isCreating = !audioRequestId && latest?.status && latest.status !== 'sended';
              if (isCreating) {
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  } catch (err) {
                    console.log('[QAScreen] Haptics error on creating card press', err);
                  }
                } else {
                  console.log('[QAScreen] Creating card pressed (web)');
                }
              }
            }}
            disabled={false}
          >
            <View style={styles.hypnosisCard}>
              <Text style={styles.hypnosisTitle}>{(audioRequestId && (hypnosisNameParam || qaById?.hypnosisName)) ? (hypnosisNameParam || qaById?.hypnosisName) : audioRequestId ? t('qaScreen.latestTitle', { defaultValue: 'Preguntas y respuestas' }) : latest?.status && latest.status !== 'sended' ? t('qaScreen.creatingTitle', { defaultValue: 'Tu hipnosis está siendo creada' }) : (t('qaScreen.latestTitle', { defaultValue: 'Tu última hipnosis' }))}</Text>
              {!audioRequestId && latest?.createdAt ? (
                <Text style={styles.hypnosisDate}>{new Date(String(latest.createdAt)).toLocaleString()}</Text>
              ) : null}
              {(() => {
                const frontAnalysis = audioRequestId 
                  ? (typeof qaById?.audioMotive?.frontAnalysis === 'string' ? qaById.audioMotive.frontAnalysis : '')
                  : (typeof latest?.audioMotive?.frontAnalysis === 'string' ? latest.audioMotive.frontAnalysis : '');
                return frontAnalysis ? (
                  <>
                    <Text style={[styles.qaQuestionText, { marginTop: 12 }]}>{t('qaScreen.messageForYou', { defaultValue: 'Mensaje para ti' })}</Text>
                    <Text style={styles.qaAnswerText}>{frontAnalysis}</Text>
                  </>
                ) : null;
              })()}
            </View>
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.answersContainer}>
              {qaData.map((item, index) => (
                <View key={`qa-${index}`} style={styles.questionBlock}>
                  <Text style={styles.qaQuestionText}>{`${index + 1}. ${item.question}`}</Text>
                  <Text style={styles.qaAnswerText}>{item.answer}</Text>
                  {index !== qaData.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          </ScrollView>
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
  container: {
    position: 'absolute',
    top: 0,
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
  },
  header: {
    paddingBottom: 20,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: Platform.OS === 'android' ? 28 : 15,
  },
  closeButton: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -14,
  },
  title: {
    fontSize: 20.16,
    fontWeight: '700',
    color: '#fbefd9',
    lineHeight: 37.8,
  },
  hypnosisCard: {
    marginBottom: 24,
  },
  hypnosisTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fbefd9',
    marginBottom: 8,
    lineHeight: 28,
  },
  hypnosisDate: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.6)',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  answersContainer: {
    gap: 32,
  },
  questionBlock: {
    gap: 16,
  },
  qaQuestionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fbefd9',
    lineHeight: 26,
    textAlign: 'left',
  },
  qaAnswerText: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.5)',
    lineHeight: 24,
    textAlign: 'left',
  },
  separator: {
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.2,
    marginTop: 8,
  }
});
