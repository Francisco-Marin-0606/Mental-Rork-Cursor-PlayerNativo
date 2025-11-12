import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Animated,
  ScrollView,
  Keyboard,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import { Mic, Square } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Question } from '@/constants/questions';

import { useUserSession } from '@/providers/UserSession';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useRequestSettings } from '@/lib/api-hooks';

export default function FormScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { session } = useUserSession();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const isTablet = useMemo(() => {
    return Platform.isPad || (Platform.OS === 'android' && Math.min(screenWidth, screenHeight) >= 600);
  }, [screenWidth, screenHeight]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const cacheLoadedRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const nextButtonScale = useRef(new Animated.Value(1)).current;
  const nextButtonOpacity = useRef(new Animated.Value(1)).current;
  const prevButtonScale = useRef(new Animated.Value(1)).current;
  const prevButtonOpacity = useRef(new Animated.Value(1)).current;
  const micButtonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnimatedHeight = useRef(new Animated.Value(0)).current;

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const isLastQuestion = currentQuestionIndex === (questions.length - 1);
  const isFirstQuestion = currentQuestionIndex === 0;



  const renderFormattedText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    
    const segments: { start: number; end: number; type: 'bold' | 'italic'; content: string }[] = [];
    
    let boldMatch: RegExpExecArray | null;
    while ((boldMatch = boldRegex.exec(text)) !== null) {
      segments.push({ start: boldMatch.index, end: boldMatch.index + boldMatch[0].length, type: 'bold', content: boldMatch[1] });
    }
    
    let italicMatch: RegExpExecArray | null;
    while ((italicMatch = italicRegex.exec(text)) !== null) {
      const isBold = segments.some(s => s.start <= italicMatch!.index && s.end >= italicMatch!.index + italicMatch![0].length);
      if (!isBold) {
        segments.push({ start: italicMatch.index, end: italicMatch.index + italicMatch[0].length, type: 'italic', content: italicMatch[1] });
      }
    }
    
    segments.sort((a, b) => a.start - b.start);
    
    segments.forEach((segment, index) => {
      if (currentIndex < segment.start) {
        parts.push(text.substring(currentIndex, segment.start));
      }
      
      if (segment.type === 'bold') {
        parts.push(
          <Text key={`bold-${index}`} style={{ fontWeight: '700' }}>
            {segment.content}
          </Text>
        );
      } else if (segment.type === 'italic') {
        parts.push(
          <Text key={`italic-${index}`} style={{ fontStyle: 'italic' }}>
            {segment.content}
          </Text>
        );
      }
      
      currentIndex = segment.end;
    });
    
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    return parts;
  };

  const { data: requestSettingsData, isLoading: requestSettingsLoading, error: requestSettingsError, refetch } = useRequestSettings(session?.userId ?? '');

  const byUserQuery = {
    data: Array.isArray(requestSettingsData) ? requestSettingsData[0] : requestSettingsData,
    isLoading: requestSettingsLoading,
    error: requestSettingsError,
    refetch,
  };

  const cacheKey = useMemo(() => `form_cache_${session?.userId ?? 'anon'}` as const, [session?.userId]);

  useEffect(() => {
    const settingsData = Array.isArray(requestSettingsData) ? requestSettingsData[0] : requestSettingsData;

    if (settingsData?.appSettings?.questions && Array.isArray(settingsData.appSettings.questions)) {
      const questionsFromAPI = settingsData.appSettings.questions;
      
      const mapped: Question[] = questionsFromAPI.map((q, idx) => {
        return {
          id: String(idx + 1),
          text: q.question,
          description: q.description,
          placeholder: 'Escríbelo aquí',
          maxLength: 500,
          referenceQuestion: q.referenceQuestion ?? q.question,
          header: q.header,
        };
      });
      
      setQuestions(mapped);
    }
  }, [requestSettingsData]);

  useEffect(() => {
    loadCachedAnswers();
  }, [questions.length]);

  useEffect(() => {
    if (!cacheLoadedRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveCachedAnswers();
    }, 250);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [answers, inputValue, currentQuestionIndex]);

  const loadCachedAnswers = async () => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        setAnswers(data.answers || {});
        setCurrentQuestionIndex(data.currentQuestionIndex || 0);
        const q = questions[data.currentQuestionIndex || 0];
        setInputValue(q ? (data.answers?.[q.id] || '') : '');

      }
    } catch (error) {
      console.error('Failed to load cached answers:', error);
    } finally {
      cacheLoadedRef.current = true;
    }
  };

  const saveCachedAnswers = async () => {
    try {
      const currentAnswers = currentQuestion ? { ...answers, [currentQuestion.id]: inputValue } : answers;
      const data = {
        answers: currentAnswers,
        currentQuestionIndex,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cached answers:', error);
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (isNavigating) return;
        setKeyboardHeight(e.endCoordinates.height);
        keyboardAnimatedHeight.stopAnimation();
        Animated.timing(keyboardAnimatedHeight, {
          toValue: -e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? Math.min(e.duration, 200) : 100,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        if (isNavigating) return;
        setKeyboardHeight(0);
        keyboardAnimatedHeight.stopAnimation();
        Animated.timing(keyboardAnimatedHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? Math.min(e.duration, 200) : 100,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardAnimatedHeight, isNavigating]);



  const sanitizeInput = (text: string): string => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu;
    const specialCharsRegex = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,;:!?¿¡()\-"']/g;
    
    return text.replace(emojiRegex, '').replace(specialCharsRegex, '');
  };

  const handleNext = useCallback(async () => {
    if (inputValue.trim().length < 10) {
      setValidationError(t('form.validation.min'));
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      }
      return;
    }

    if (inputValue.length > 500) {
      setValidationError(t('form.validation.max'));
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      }
      return;
    }



    setValidationError('');

    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }

    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: inputValue }));
    }

    if (isLastQuestion) {
      const combinedAnswers = currentQuestion ? { ...answers, [currentQuestion.id]: inputValue } : { ...answers };
      const answeredQuestions = questions
        .map((q) => ({
          question: q.referenceQuestion ?? q.text ?? '',
          answer: (combinedAnswers[q.id] ?? '').trim(),
        }))
        .filter((qa) => qa.answer.length > 0);

      await AsyncStorage.setItem(
        `confirmation_data_${session?.userId ?? 'anon'}`,
        JSON.stringify({ questions: answeredQuestions })
      );
      
      await clearCache();
      setIsNavigating(true);
      router.push('/confirmation');
      setTimeout(() => {
        Keyboard.dismiss();
      }, 500);
      return;
    }

    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentQuestionIndex(prev => prev + 1);
      const nextQ = questions[currentQuestionIndex + 1];
      const nextAnswer = nextQ ? (answers[nextQ.id] || '') : '';
      setInputValue(nextAnswer);
      
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      });
    });
  }, [currentQuestion, inputValue, isLastQuestion, answers, currentQuestionIndex, fadeAnim, slideAnim]);

  const handlePrevious = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }

    if (isFirstQuestion) {
      const hasAnsweredAny = Object.values(answers).some(a => a.trim().length > 0) || inputValue.trim().length > 0;
      
      if (hasAnsweredAny) {
        Alert.alert(
          t('form.alerts.saveProgress.title'),
          '',
          [
            {
              text: t('form.alerts.saveProgress.no'),
              style: 'cancel',
            },
            {
              text: t('form.alerts.saveProgress.yes'),
              onPress: () => {
                router.back();
              },
            },
          ],
          { cancelable: true }
        );
      } else {
        router.back();
      }
      return;
    }

    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: inputValue }));
    }

    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      const prevQ = questions[currentQuestionIndex - 1];
      const prevAnswer = prevQ ? (answers[prevQ.id] || '') : '';
      setInputValue(prevAnswer);
      
      fadeAnim.setValue(0);
      slideAnim.setValue(-30);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentQuestion, inputValue, isFirstQuestion, answers, currentQuestionIndex, fadeAnim, slideAnim]);

  const startRecordingMobile = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('form.alerts.micPermission.title'), t('form.alerts.micPermission.message'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      
      setRecordingSeconds(0);
      setLiveTranscript('');
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(t('form.alerts.recordingError.title'), t('form.alerts.recordingError.message'));
    }
  };

  const stopRecordingMobile = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingSeconds(0);

      if (!uri) {
        Alert.alert(t('form.alerts.recordingUriError.title'), t('form.alerts.recordingUriError.message'));
        return;
      }
      await transcribeAudio(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert(t('form.alerts.stopRecordingError.title'), t('form.alerts.stopRecordingError.message'));
      setIsRecording(false);
    }
  };

  const startRecordingWeb = async () => {
    try {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setLiveTranscript(prev => prev + finalTranscript);
          } else if (interimTranscript) {
            setLiveTranscript(prev => {
              const lastFinalText = prev;
              return lastFinalText + interimTranscript;
            });
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };
        
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          await transcribeAudioWeb(audioBlob);
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      }
      
      setRecordingSeconds(0);
      setLiveTranscript('');
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start web recording:', error);
      Alert.alert(t('form.alerts.micAccessError.title'), t('form.alerts.micAccessError.message'));
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const stopRecordingWeb = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      
      if (liveTranscript.trim()) {
        setInputValue(prev => prev ? `${prev} ${liveTranscript.trim()}` : liveTranscript.trim());
      }
      setLiveTranscript('');
      setIsRecording(false);
      setRecordingSeconds(0);
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const transcribeAudio = async (uri: string) => {
    setIsTranscribing(true);
    try {
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      const audioFile = {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as any;

      formData.append('audio', audioFile);
      formData.append('language', 'es');

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      
      if (data.text) {
        setInputValue(prev => prev ? `${prev} ${data.text}` : data.text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(t('form.alerts.transcriptionError.title'), t('form.alerts.transcriptionError.message'));
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeAudioWeb = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'es');

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      
      if (data.text) {
        setInputValue(prev => prev ? `${prev} ${data.text}` : data.text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(t('form.alerts.transcriptionError.title'), t('form.alerts.transcriptionError.message'));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicPress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }

    if (isRecording) {
      if (Platform.OS === 'web') {
        stopRecordingWeb();
      } else {
        await stopRecordingMobile();
      }
    } else {
      if (Platform.OS === 'web') {
        await startRecordingWeb();
      } else {
        await startRecordingMobile();
      }
    }
  }, [isRecording]);

  const isInitialLoading = useMemo(() => {
    const noQuestionsYet = questions.length === 0;
    const loadingFromServer = requestSettingsLoading || (!requestSettingsData && noQuestionsYet);
    return loadingFromServer;
  }, [requestSettingsLoading, requestSettingsData, questions.length]);

  if (isInitialLoading) {
    return (
      <View style={styles.loadingRoot} testID="form-loading">
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ActivityIndicator color="#ff6b35" size="large" />
      </View>
    );
  }

  if (byUserQuery.error) {
    return (
      <View style={styles.loadingRoot} testID="form-error">
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar el formulario</Text>
          <Text style={styles.errorSubtitle}>Revisa tu conexión e inténtalo de nuevo</Text>
          <Pressable onPress={() => byUserQuery.refetch()} style={styles.retryButton} testID="form-retry">
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      <View style={styles.safe}>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.progressBarContainer}>
              {questions.map((_: Question, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.progressBar,
                    index <= currentQuestionIndex
                      ? styles.progressBarActive
                      : styles.progressBarInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight + 300 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            overScrollMode="always"
            scrollEnabled={true}
          >
            <Animated.View 
              style={[
                styles.questionContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {keyboardHeight === 0 && (
                <>
                  {currentQuestion?.header && (
                    <Text style={styles.headerText}>{currentQuestion.header}</Text>
                  )}
                  <Text style={styles.questionText}>{currentQuestion?.text ?? 'NO TEXT'}</Text>
                  {currentQuestion?.description && (
                    <Text style={styles.descriptionText}>{renderFormattedText(currentQuestion.description)}</Text>
                  )}
                </>
              )}

              <View style={styles.inputContainer}>
                {keyboardHeight === 0 && !currentQuestion?.description && (
                  <View style={styles.placeholderBox}>
                    <Text style={styles.placeholderText}>{currentQuestion?.placeholder ?? ''}</Text>
                  </View>
                )}

                {keyboardHeight > 0 && (
                  <View style={styles.compactQuestionBox}>
                    {currentQuestion?.header && (
                      <Text style={styles.compactHeaderText}>{currentQuestion.header}</Text>
                    )}
                    <Text style={[
                      styles.compactQuestionText,
                      isTablet && styles.compactQuestionTextTablet
                    ]}>{currentQuestion.text}</Text>
                    <Text style={[
                      styles.compactDescriptionText,
                      isTablet && styles.compactDescriptionTextTablet
                    ]}>{renderFormattedText(currentQuestion.description || currentQuestion.placeholder)}</Text>
                  </View>
                )}

                <View style={styles.textInputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.input,
                      validationError && styles.inputError,
                      inputValue.length > 500 && styles.inputTransparent,
                    ]}
                    value={isRecording && liveTranscript ? `${inputValue}${inputValue ? ' ' : ''}${liveTranscript}` : inputValue}
                    onChangeText={(text) => {
                      const sanitized = sanitizeInput(text);
                      setInputValue(sanitized);
                      if (validationError) {
                        if (sanitized.trim().length >= 10 && sanitized.length <= 500) {
                          setValidationError('');
                        }
                      }
                    }}
                    placeholder={t('form.placeholder')}
                    placeholderTextColor="rgba(251, 239, 217, 0.3)"
                    multiline
                    textAlignVertical="top"
                    autoFocus={false}
                    editable={!isRecording}
                    scrollEnabled={keyboardHeight > 0}
                  />
                  {inputValue.length > 500 && (
                    <View style={styles.textOverlay} pointerEvents="none">
                      <Text style={styles.overlayText}>
                        <Text style={styles.normalText}>{inputValue.slice(0, 500)}</Text>
                        <Text style={styles.excessText}>{inputValue.slice(500)}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {validationError && (
                  <Text style={styles.errorText}>{validationError}</Text>
                )}

                <View style={styles.inputFooter}>
                  <View style={styles.micContainer}>
                    <Pressable
                      onPress={handleMicPress}
                      onPressIn={() => {
                        micButtonScale.stopAnimation();
                        Animated.spring(micButtonScale, {
                          toValue: 0.85,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 0,
                        }).start();
                      }}
                      onPressOut={() => {
                        micButtonScale.stopAnimation();
                        Animated.spring(micButtonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 0,
                        }).start();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isTranscribing}
                    >
                      <Animated.View style={[
                        styles.micButton,
                        isRecording && styles.micButtonRecording,
                        isTranscribing && styles.micButtonTranscribing,
                        { transform: [{ scale: micButtonScale }] }
                      ]}>
                        {isTranscribing ? (
                          <Text style={styles.micButtonText}>...</Text>
                        ) : isRecording ? (
                          <Square color="#ff6b35" size={16} strokeWidth={2} fill="#ff6b35" />
                        ) : (
                          <Mic color="#fbefd9" size={20} strokeWidth={2} />
                        )}
                      </Animated.View>
                    </Pressable>
                    {isRecording && (
                      <Text style={styles.recordingTime}>{recordingSeconds}s</Text>
                    )}
                  </View>

                  <Text style={styles.charCount}>
                    {(isRecording && liveTranscript ? inputValue.length + liveTranscript.length + 1 : inputValue.length)}/{currentQuestion?.maxLength ?? 500}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          <Animated.View style={[styles.footer, { 
            transform: [{ translateY: keyboardAnimatedHeight }],
            paddingBottom: keyboardHeight === 0 ? 55 : 15,
          }]} pointerEvents="box-none">
            <Pressable
              onPress={handlePrevious}
              onPressIn={() => {
                if (isRecording) return;
                prevButtonScale.stopAnimation();
                prevButtonOpacity.stopAnimation();
                Animated.parallel([
                  Animated.timing(prevButtonScale, {
                    toValue: 0.9,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(prevButtonOpacity, {
                    toValue: 0.2,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPressOut={() => {
                if (isRecording) return;
                prevButtonScale.stopAnimation();
                prevButtonOpacity.stopAnimation();
                Animated.parallel([
                  Animated.timing(prevButtonScale, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(prevButtonOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              style={{ flex: 1 }}
              disabled={isRecording}
            >
              <Animated.View style={[
                styles.button, 
                styles.buttonSecondary,
                isRecording && styles.buttonDisabledSecondary,
                {
                  transform: [{ scale: prevButtonScale }], 
                  opacity: isRecording ? 0.3 : prevButtonOpacity
                }
              ]}>
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>{t('form.buttons.back')}</Text>
              </Animated.View>
            </Pressable>

            <Pressable
              onPress={handleNext}
              onPressIn={() => {
                if (isRecording) return;
                nextButtonScale.stopAnimation();
                nextButtonOpacity.stopAnimation();
                Animated.parallel([
                  Animated.timing(nextButtonScale, {
                    toValue: 0.9,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(nextButtonOpacity, {
                    toValue: 0.2,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              onPressOut={() => {
                if (isRecording) return;
                nextButtonScale.stopAnimation();
                nextButtonOpacity.stopAnimation();
                Animated.parallel([
                  Animated.timing(nextButtonScale, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                  Animated.timing(nextButtonOpacity, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                  }),
                ]).start();
              }}
              style={{ flex: 1 }}
              disabled={isRecording}
            >
              <Animated.View style={[
                styles.button, 
                styles.buttonPrimary,
                isRecording && styles.buttonDisabled,
                {
                  transform: [{ scale: nextButtonScale }], 
                  opacity: isRecording ? 0.3 : nextButtonOpacity
                }
              ]}>
                <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                  {isLastQuestion ? t('form.buttons.submit') : t('form.buttons.next')}
                </Text>
              </Animated.View>
            </Pressable>
          </Animated.View>
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
  loadingRoot: {
    flex: 1,
    backgroundColor: '#170501',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(251, 239, 217, 0.06)',
    borderColor: 'rgba(251, 239, 217, 0.12)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#fbefd9',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(251, 239, 217, 0.6)',
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderColor: '#ff6b35',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: 'rgba(251, 239, 217, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  safe: {
    flex: 1,
    backgroundColor: '#170501',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#ff6b35',
  },
  progressBarInactive: {
    backgroundColor: 'rgba(251, 239, 217, 0.3)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  questionContainer: {
    flex: 1,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(251, 239, 217, 0.5)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 33,
    fontWeight: '700',
    color: '#fbefd9',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14.4,
    color: 'rgba(251, 239, 217, 0.5)',
    lineHeight: 20,
    marginBottom: 16,
  },
  examplesContainer: {
    marginBottom: 24,
  },
  examplesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fbefd9',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(251, 239, 217, 0.6)',
    lineHeight: 20,
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
  },
  placeholderBox: {
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 15,
    color: 'rgba(251, 239, 217, 0.5)',
    lineHeight: 22,
  },
  input: {
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fbefd9',
    lineHeight: 24,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  inputError: {
    borderColor: '#ff6b35',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#ff6b35',
    marginTop: 8,
    fontWeight: '600',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  micContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingTime: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: '700',
    minWidth: 40,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 239, 217, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
  },
  micButtonRecording: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#ff6b35',
  },
  micButtonTranscribing: {
    backgroundColor: 'rgba(251, 239, 217, 0.15)',
    borderColor: 'rgba(251, 239, 217, 0.3)',
  },
  micButtonText: {
    fontSize: 18,
    color: '#fbefd9',
    fontWeight: '700' as const,
  },
  charCount: {
    fontSize: 14,
    color: 'rgba(251, 239, 217, 0.4)',
    fontWeight: '500',
  },
  compactQuestionBox: {
    marginBottom: 16,
  },
  compactHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(251, 239, 217, 0.5)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  compactQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbefd9',
    lineHeight: 20,
  },
  compactQuestionTextTablet: {
    fontSize: 33,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  compactDescriptionText: {
    fontSize: 13,
    color: 'rgba(251, 239, 217, 0.5)',
    lineHeight: 18,
    marginTop: 4,
  },
  compactDescriptionTextTablet: {
    fontSize: 14.4,
    lineHeight: 20,
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 15,
    gap: 12,
    backgroundColor: '#170501',
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 239, 217, 0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#ff6b35',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(251, 239, 217, 0.1)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
  },
  buttonDisabledSecondary: {
    backgroundColor: 'rgba(251, 239, 217, 0.05)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
  buttonTextSecondary: {
    color: '#fbefd9',
  },
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  textInputWrapper: {
    position: 'relative',
  },
  inputTransparent: {
    color: 'transparent',
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  overlayText: {
    fontSize: 16,
    lineHeight: 24,
    ...(Platform.OS === 'android' && { includeFontPadding: false, textAlignVertical: 'top' }),
  },
  normalText: {
    color: '#fbefd9',
  },
  excessText: {
    color: '#ff0000',
  },
});
