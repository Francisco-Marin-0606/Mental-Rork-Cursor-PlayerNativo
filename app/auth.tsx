import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Animated,
  ScrollView,
  Keyboard,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import CompleteDataModal from '@/components/CompleteDataModal';

import { useUserSession } from '@/providers/UserSession';
import { useVerifyLoginCode, useUser, useRequestLoginCode, useCheckMembershipStatus } from '@/lib/api-hooks';
import { apiClient } from '@/lib/api-client';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>('');
  const [timer, setTimer] = useState<number>(555);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [showCompleteDataModal, setShowCompleteDataModal] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const hiddenInputRef = useRef<TextInput>(null);
  const backButtonScale = useRef(new Animated.Value(1)).current;
  const verifyButtonScale = useRef(new Animated.Value(1)).current;
  const verifyButtonOpacity = useRef(new Animated.Value(1)).current;
  const resendButtonScale = useRef(new Animated.Value(1)).current;
  const resendButtonOpacity = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const resendButtonRef = useRef<View>(null);
  const hasScrolledRef = useRef<boolean>(false);
  const params = useLocalSearchParams<{ email?: string; support?: string }>();
  const { setSession, session } = useUserSession();
  const email = params.email ?? '';
  const verifyLoginMutation = useVerifyLoginCode();
  const requestLoginCodeMutation = useRequestLoginCode();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const getUserQuery = useUser(verifiedUserId ?? '');
  const checkMembershipMutation = useCheckMembershipStatus();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (hasScrolledRef.current) return;
        
        const screenHeight = Dimensions.get('window').height;
        const keyboardHeight = e.endCoordinates.height;
        
        setTimeout(() => {
          resendButtonRef.current?.measureInWindow((x, y, width, height) => {
            const resendButtonBottom = y + height;
            const targetPosition = screenHeight - keyboardHeight - 20;
            
            if (resendButtonBottom > targetPosition) {
              const scrollAmount = resendButtonBottom - targetPosition;
              scrollViewRef.current?.scrollTo({
                y: scrollAmount,
                animated: Platform.OS === 'ios',
              });
              hasScrolledRef.current = true;
            }
          });
        }, Platform.OS === 'ios' ? 50 : 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        scrollViewRef.current?.scrollTo({
          y: 0,
          animated: true,
        });
        hasScrolledRef.current = false;
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const focusHiddenInput = useCallback(() => {
    try {
      hiddenInputRef.current?.focus();
    } catch (e) {
      console.log('[Auth] focus hidden input error', e);
    }
  }, []);

  const handleCodeChange = useCallback((text: string) => {
    const onlyDigits = (text || '').replace(/\D+/g, '');
    const next = onlyDigits.slice(0, 4);
    setCode(next);
  }, []);

  const handlePasteFromClipboardIosAutofill = useCallback((text: string) => {
    // Some providers autofill a long string, we try to extract first 4 consecutive digits
    try {
      const match = (text || '').match(/\d{4}/);
      if (match) {
        setCode(match[0].slice(0, 4));
      } else {
        handleCodeChange(text);
      }
    } catch {
      handleCodeChange(text);
    }
  }, [handleCodeChange]);

  const handleBack = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.back();
  }, []);

  const handleVerify = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    const fullCode = code;
    console.log('[Auth] ====== VERIFICATION ATTEMPT ======');
    console.log('[Auth] Code entered:', fullCode);
    console.log('[Auth] Email:', email);
    console.log('[Auth] Calling verifyLoginCode mutation...');
    
    Keyboard.dismiss();

    setVerifyError(null);
    try {
      const res = await verifyLoginMutation.mutateAsync({ email, loginCode: fullCode });
      console.log('[Auth] ====== VERIFICATION RESPONSE ======');
      console.log('[Auth] Response:', JSON.stringify(res, null, 2));
      console.log('[Auth] Success:', res?.success);
      console.log('[Auth] Token:', res?.token ? 'Present (length: ' + res.token.length + ')' : 'Missing');
      console.log('[Auth] UserId:', res?.userId || 'Missing');
      
      if (res?.success && res?.token && res?.userId) {
        try {
          await apiClient.setToken(res.token);
          console.log('[Auth] Token saved:', res.token);
        } catch (e) {
          console.log('[Auth] setToken error', e);
        }
        
        try {
          setSession({ userId: res.userId, email });
          console.log('[Auth] Session stored for userId', res.userId);
          
          console.log('[Auth] Checking membership status...');
          try {
            const membershipResult = await checkMembershipMutation.mutateAsync(res.userId);
            setSession({ userId: res.userId, email, isMembershipActive: membershipResult.isActive });
            console.log('[Auth] Membership status updated:', membershipResult.isActive);
          } catch (membershipError) {
            console.log('[Auth] Error checking membership status:', membershipError);
          }
        } catch (e) {
          console.log('[Auth] setSession error', e);
        }
        
        try {
          setVerifiedUserId(res.userId);
          
          setTimeout(async () => {
            const userDataResult = await getUserQuery.refetch();
            const userData = userDataResult.data;
            
            console.log('[Auth] User data fetched:', JSON.stringify(userData, null, 2));
            
            const hasWantToBeCalled = userData?.wantToBeCalled && userData.wantToBeCalled.trim().length > 0;
            const hasGender = userData?.gender && userData.gender.trim().length > 0;
            const hasBirthdate = userData?.birthdate && userData.birthdate.trim().length > 0;
            const hasAllRequiredData = hasWantToBeCalled && hasGender && hasBirthdate;
            
            console.log('[Auth] User data check:', { 
              hasWantToBeCalled,
              hasGender,
              hasBirthdate,
              hasAllRequiredData,
              userData: {
                wantToBeCalled: userData?.wantToBeCalled,
                gender: userData?.gender,
                birthdate: userData?.birthdate,
                _id: userData?._id,
                email: userData?.email
              }
            });
            
            if (hasAllRequiredData) {
              console.log('[Auth] User has all required data, navigating to home');
              router.replace('/');
            } else {
              console.log('[Auth] User missing required data, showing complete data modal');
              setShowCompleteDataModal(true);
            }
          }, 500);
        } catch (err) {
          console.log('[Auth] getUser refetch error', err);
          setShowCompleteDataModal(true);
        }
      } else {
        console.log('[Auth] Verification failed:', res);
        setVerifyError(t('auth.errors.invalidCode'));
        if (Platform.OS !== 'web') {
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
        }
      }
    } catch (e: unknown) {
      const err = e as { message?: string; stack?: string; response?: any } | Error | any;
      const message = (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err);
      console.log('[Auth] ====== VERIFICATION ERROR ======');
      console.log('[Auth] Error type:', typeof err);
      console.log('[Auth] Error message:', message);
      console.log('[Auth] BFF response status:', err?.response?.status);
      console.log('[Auth] BFF response statusText:', err?.response?.statusText);
      console.log('[Auth] BFF response data:', JSON.stringify(err?.response?.data, null, 2));
      console.log('[Auth] BFF response headers:', err?.response?.headers);
      console.log('[Auth] Full error object:', JSON.stringify(err, null, 2));
      console.log('[Auth] ===========================');
      
      let userMessage = t('auth.errors.connectionError');
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        userMessage = t('auth.errors.invalidCode');
      } else if (message.includes('network') || message.includes('Network')) {
        userMessage = t('auth.errors.networkError');
      }
      
      setVerifyError(userMessage);
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isSubmitting, email, t]);

  const handleResendCode = useCallback(async () => {
    if (isResending || resendTimer > 0) return;
    setIsResending(true);
    setResendTimer(60);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    try {
      if (email) {
        console.log('[Auth] Resending code to:', email);
        const result = await requestLoginCodeMutation.mutateAsync(email);
        console.log('[Auth] Resend code result:', result);
        if (result?.success) {
          setTimer(555);
          setCode('');
          console.log('[Auth] Code resent successfully');
        }
      }
    } catch (e) {
      console.log('[Auth] resend error', e);
    }
    
    setTimeout(() => {
      setIsResending(false);
    }, 500);
  }, [isResending, email, requestLoginCodeMutation, resendTimer]);

  const isCodeComplete = code.length === 4;

  const handleCompleteData = useCallback((data: { name: string; gender: string; birthdate: string }) => {
    console.log('User data completed:', data);
    setShowCompleteDataModal(false);
    router.replace('/');
  }, []);

  const activeIndex = Math.min(3, Math.max(0, code.length));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.brownBackground} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          onPressIn={() => {
            Animated.spring(backButtonScale, {
              toValue: 0.85,
              useNativeDriver: true,
              speed: 50,
              bounciness: 0,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(backButtonScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 50,
              bounciness: 0,
            }).start();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="back-button"
        >
          <Animated.View style={{ transform: [{ scale: backButtonScale }] }}>
            <ChevronLeft color="#fbefd9" size={31.5} strokeWidth={1.5} />
          </Animated.View>
        </Pressable>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.container}>
              <View style={styles.contentContainer}>
                <View style={styles.imageContainer}>
                  <Text style={styles.imagePlaceholder}>🎨</Text>
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title}>{t('auth.title1')}</Text>
                  <Text style={styles.title}>{t('auth.title2')}</Text>
                  {!!email && <Text style={[styles.infoText, { marginTop: 8 }]}>{email}</Text>}
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.infoText}>{t('auth.info1')}</Text>
                  <Text style={styles.infoText}>{t('auth.info2', { timer })}</Text>
                  <Text style={styles.infoText}>{t('auth.info3')}</Text>
                </View>

                <Pressable style={styles.codePressable} onPress={focusHiddenInput} testID="otp-pressable">
                  <View style={styles.codeContainer}>
                    {[0,1,2,3].map((i) => {
                      const char = code[i] ?? '';
                      const isActive = i === (code.length === 4 ? 3 : activeIndex);
                      return (
                        <View key={i} style={[styles.codeBox, isActive && styles.codeBoxActive]} testID={`otp-box-${i}`}>
                          <Text style={styles.codeChar}>{char}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <TextInput
                    ref={hiddenInputRef}
                    style={styles.hiddenInput}
                    value={code}
                    onChangeText={(text) => {
                      // iOS Gmail often passes the whole code as one chunk
                      handlePasteFromClipboardIosAutofill(text);
                    }}
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    maxLength={4}
                    returnKeyType={'done'}
                    selectionColor="#fbefd9"
                    placeholder=""
                    importantForAutofill="yes"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                    testID="otp-hidden-input"
                    onFocus={() => console.log('[Auth] OTP input focused')}
                    onBlur={() => console.log('[Auth] OTP input blurred')}
                  />
                </Pressable>

                <Animated.View
                  style={{
                    width: '100%',
                    transform: [{ scale: verifyButtonScale }],
                    opacity: verifyButtonOpacity,
                  }}
                >
                  <Pressable
                    style={[
                      styles.verifyButton,
                      !isCodeComplete && styles.verifyButtonDisabled,
                    ]}
                    onPress={handleVerify}
                    onPressIn={() => {
                      if (!isCodeComplete || isSubmitting) return;
                      Animated.parallel([
                        Animated.spring(verifyButtonScale, {
                          toValue: 0.95,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 0,
                        }),
                        Animated.timing(verifyButtonOpacity, {
                          toValue: 0.6,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    onPressOut={() => {
                      if (!isCodeComplete || isSubmitting) return;
                      Animated.parallel([
                        Animated.spring(verifyButtonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          speed: 50,
                          bounciness: 4,
                        }),
                        Animated.timing(verifyButtonOpacity, {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                    }}
                    disabled={!isCodeComplete || isSubmitting}
                    testID="verify-button"
                  >
                    {isSubmitting && (
                      <ActivityIndicator color="#000" size="small" testID="verify-loading" />
                    )}
                    <Text style={[
                      styles.verifyButtonText,
                      !isCodeComplete && styles.verifyButtonTextDisabled,
                    ]}>
                      {t('auth.verifyButton')}
                    </Text>
                  </Pressable>
                </Animated.View>

                {verifyError ? (
                  <Text style={[styles.infoText, { color: '#ff4d4f', opacity: 1, marginTop: 8 }]} testID="verify-error-text">{verifyError}</Text>
                ) : null}

                <View ref={resendButtonRef} collapsable={false}>
                  <Animated.View
                    style={{
                      transform: [{ scale: resendButtonScale }],
                      opacity: resendTimer > 0 ? 0.2 : resendButtonOpacity,
                    }}
                  >
                    <Pressable
                      onPress={handleResendCode}
                      disabled={isResending || resendTimer > 0}
                      onPressIn={() => {
                        if (isResending || resendTimer > 0) return;
                        Animated.parallel([
                          Animated.spring(resendButtonScale, {
                            toValue: 0.9,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 0,
                          }),
                          Animated.timing(resendButtonOpacity, {
                            toValue: 0.2,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      onPressOut={() => {
                        if (isResending || resendTimer > 0) return;
                        Animated.parallel([
                          Animated.spring(resendButtonScale, {
                            toValue: 1,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 4,
                          }),
                          Animated.timing(resendButtonOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      style={styles.resendButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      testID="resend-button"
                    >
                      <Text style={styles.resendText}>
                        {resendTimer > 0
                          ? `${t('auth.resendButton')} (${resendTimer} segundos)`
                          : t('auth.resendButton')}
                      </Text>
                    </Pressable>
                  </Animated.View>
                </View>
              </View>
            </View>
        </ScrollView>
      </SafeAreaView>
      
      <CompleteDataModal
        visible={showCompleteDataModal}
        onComplete={handleCompleteData}
        initialData={{
          name: getUserQuery.data?.wantToBeCalled ?? getUserQuery.data?.name ?? '',
          gender: (getUserQuery.data?.gender === 'Hombre' || getUserQuery.data?.gender === 'Mujer') ? getUserQuery.data.gender : undefined,
          birthdate: getUserQuery.data?.birthdate ?? '',
          wantToBeCalled: getUserQuery.data?.wantToBeCalled ?? getUserQuery.data?.name ?? '',
          userId: verifiedUserId ?? session?.userId ?? '',
          email: email,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#170501',
  },
  brownBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#170501',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 44,
    minHeight: 1100,
  },
  backButton: {
    marginHorizontal: 44,
    marginTop: 16,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  imageContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    fontSize: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600' as const,
    color: '#fbefd9',
    textAlign: 'center',
    letterSpacing: -1.0,
    lineHeight: 34,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  infoText: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '400' as const,
    color: '#fbefd9',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 22 : 24,
    letterSpacing: 0,
    opacity: 0.5,
  },
  codePressable: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  codeBox: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(251, 239, 217, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    borderColor: '#ff6b35',
  },
  codeChar: {
    color: '#fbefd9',
    fontSize: 32,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },

  verifyButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbefd9',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    ...BUTTON_STYLES.elevatedShadow,
  },
  verifyButtonDisabled: {
    backgroundColor: Platform.OS === 'android' ? '#3d2f28' : 'rgba(251, 239, 217, 0.15)',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    letterSpacing: -0.3,
  },
  verifyButtonTextDisabled: {
    color: 'rgba(251, 239, 217, 0.35)',
  },
  resendButton: {
    marginTop: 24,
  },
  resendText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fbefd9',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
