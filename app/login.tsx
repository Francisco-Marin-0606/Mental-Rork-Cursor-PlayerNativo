import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Animated,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { useTranslation } from 'react-i18next';

import { useRequestLoginCode, useAppSettings, useAuraHertz } from '@/lib/api-hooks';
import Constants from 'expo-constants';
import { apiClient } from '@/lib/api-client';
import { Image as ExpoImage } from 'expo-image';
import Purchases from 'react-native-purchases';
import { initializeRevenueCat } from './_layout';
export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState<boolean>(false);
  const enterButtonScale = useRef(new Animated.Value(1)).current;
  const enterButtonOpacity = useRef(new Animated.Value(1)).current;
  const createAccountButtonScale = useRef(new Animated.Value(1)).current;
  const createAccountButtonOpacity = useRef(new Animated.Value(1)).current;
  const formTranslateY = useRef(new Animated.Value(0)).current;
  const controlsRef = useRef<View>(null);
  const hasShiftedRef = useRef<boolean>(false);

  const { data: appSettingsData } = useAppSettings();
  const { data: auraData } = useAuraHertz();
  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(n => parseInt(n, 10));
    const parts2 = v2.split('.').map(n => parseInt(n, 10));
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  };
  
  const showCreateAccount = useCallback(() => {
    if (!appSettingsData || appSettingsData.length === 0) {
      return false;
    }
    
    const settings = appSettingsData[0];
    const versionRequired = settings.versionFirstHypnosisEnabled;
    const firstHypnosisEnabled = settings.firstHypnosisEnabled;
    
    console.log('[Login] Current version:', currentVersion);
    console.log('[Login] Version required for create account:', versionRequired);
    console.log('[Login] firstHypnosisEnabled:', firstHypnosisEnabled);
    
    if (firstHypnosisEnabled === true) {
      console.log('[Login] Show create account button: true (firstHypnosisEnabled is true)');
      return true;
    }
    
    if (!versionRequired) {
      console.log('[Login] Show create account button: false (no version required)');
      return false;
    }
    
    const isVersionValid = compareVersions(currentVersion, versionRequired) >= 0;
    console.log('[Login] Show create account button:', isVersionValid, '(version check)');
    
    return isVersionValid;
  }, [appSettingsData, currentVersion])();

  const stripSupportTag = (text: string): string => {
    try {
      const trimmed = text.replace(/\?support\s*$/i, '');
      return trimmed;
    } catch {
      return text;
    }
  };

  const hasSupportTag = (text: string): boolean => {
    try {
      return /\?support\s*$/i.test(text);
    } catch {
      return false;
    }
  };

  const validateEmail = (text: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = stripSupportTag(text);
    return emailRegex.test(cleaned);
  };

  const sanitizeEmail = (text: string): string => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu;
    return text.replace(emojiRegex, '').replace(/\s+/g, '').replace(/\n/g, '');
  };

  const handleEmailChange = useCallback((text: string) => {
    const sanitized = sanitizeEmail(text);
    setEmail(sanitized);
    if (errorMessage) setErrorMessage(null);
  }, []);



  const requestLoginCodeMutation = useRequestLoginCode();

  const handleEnter = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    console.log('[Login] ====== LOGIN ATTEMPT ======');
    console.log('[Login] Email entered:', email);
    console.log('[Login] BFF URL:', apiClient.axios.defaults.baseURL);
    const effectiveEmail = stripSupportTag(email);
    const supportMode = hasSupportTag(email);
    console.log('[Login] Effective email:', effectiveEmail);
    console.log('[Login] Support mode:', supportMode);

    try {
      // Si está en modo soporte, NO hacer la llamada a requestLoginCode
      if (supportMode) {
        console.log('[Login] Support mode detected - SKIPPING requestLoginCode');
        console.log('[Login] Navigating directly to auth with support mode enabled');
        router.replace({ pathname: '/auth', params: { email: effectiveEmail, support: '1' } });
        return;
      }

      console.log('[Login] Step 1: Requesting login code...');
      const result = await requestLoginCodeMutation.mutateAsync(effectiveEmail);
      console.log('[Login] requestLoginCode response:', result);
      
      if (result?.success) {
        console.log('[Login] Code sent successfully, navigating to auth...');
        router.replace({ pathname: '/auth', params: { email: effectiveEmail, support: '0' } });
      } else {
        console.log('[Login] Email not found in DB');
        setErrorMessage(t('login.errors.emailNotFound'));
        if (Platform.OS !== 'web') {
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
        }
      }
    } catch (e: unknown) {
      const err = e as { message?: string; stack?: string; data?: any; response?: any } | Error | any;
      const message = (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err);
      console.log('[Login] ====== ERROR DE CONEXIÓN ======');
      console.log('[Login] requestLoginCode error completo:', JSON.stringify(err, null, 2));
      console.log('[Login] requestLoginCode error message:', message);
      console.log('[Login] BFF response status:', err?.response?.status);
      console.log('[Login] BFF response data:', err?.response?.data);
      if (err?.stack) {
        console.log('[Login] Stack trace:', err.stack);
      }
      console.log('[Login] ===========================');
      
      let userMessage = t('login.errors.connectionError');
      if (err?.response?.status === 404) {
        userMessage = t('login.errors.emailNotFound');
      } else if (message.includes('network') || message.includes('Network')) {
        userMessage = t('login.errors.networkError');
      }
      
      setErrorMessage(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, requestLoginCodeMutation, t]);

  const isEmailValid = validateEmail(email);

  useEffect(() => {
    if (!auraData || auraData.length === 0) return;
    
    const prefetchImages = async () => {
      try {
        console.log('[Login] Starting image prefetch for Aura...');
        const imagesToPrefetch: string[] = [];
        
        const instrumentalsData = auraData.find(item => item.instrumentals);
        if (instrumentalsData) {
          if (instrumentalsData.forYou) {
            instrumentalsData.forYou.forEach((item) => {
              if (item.imageUrl?.man) imagesToPrefetch.push(item.imageUrl.man);
              if (item.imageUrl?.woman) imagesToPrefetch.push(item.imageUrl.woman);
              if (item.vinillo?.man) imagesToPrefetch.push(item.vinillo.man);
              if (item.vinillo?.woman) imagesToPrefetch.push(item.vinillo.woman);
            });
          }
          
          if (instrumentalsData.instrumentals) {
            Object.entries(instrumentalsData.instrumentals).forEach(([_, albumArray]) => {
              if (Array.isArray(albumArray) && albumArray.length > 0) {
                const albumData = albumArray[0];
                if (albumData.imageUrl?.man) imagesToPrefetch.push(albumData.imageUrl.man);
                if (albumData.imageUrl?.woman) imagesToPrefetch.push(albumData.imageUrl.woman);
                if (albumData.vinillo?.man) imagesToPrefetch.push(albumData.vinillo.man);
                if (albumData.vinillo?.woman) imagesToPrefetch.push(albumData.vinillo.woman);
              }
            });
          }
        }
        
        imagesToPrefetch.push('https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816');
        imagesToPrefetch.push('https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png');
        imagesToPrefetch.push('https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png');
        
        const uniqueImages = Array.from(new Set(imagesToPrefetch));
        console.log(`[Login] Prefetching ${uniqueImages.length} unique images...`);
        
        await Promise.all(
          uniqueImages.map(url => 
            ExpoImage.prefetch(url, { cachePolicy: 'memory-disk' })
          )
        );
        
        console.log('[Login] Image prefetch complete!');
      } catch (error) {
        console.log('[Login] Error prefetching images:', error);
      }
    };
    
    prefetchImages();
  }, [auraData]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[Login] Web platform detected, RevenueCat not available');
      setIsRevenueCatReady(false);
      return;
    }

    const initRevenueCat = async () => {
      try {
        console.log('[Login] Waiting for RevenueCat initialization...');
        const success = await initializeRevenueCat();
        
        if (success) {
          console.log('[Login] RevenueCat is ready!');
          setIsRevenueCatReady(true);
        } else {
          console.error('[Login] RevenueCat initialization failed');
          setIsRevenueCatReady(false);
        }
      } catch (error: any) {
        console.error('[Login] Error initializing RevenueCat:', error?.message || error);
        setIsRevenueCatReady(false);
      }
    };

    initRevenueCat();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (!controlsRef.current) return;
        const screenHeight = Dimensions.get('window').height;
        const keyboardTop = screenHeight - e.endCoordinates.height;
        setTimeout(() => {
          controlsRef.current?.measureInWindow((x, y, width, height) => {
            const bottom = y + height;
            const overlap = bottom + 12 - keyboardTop;
            if (overlap > 0) {
              hasShiftedRef.current = true;
              Animated.timing(formTranslateY, {
                toValue: -overlap,
                duration: Platform.OS === 'ios' ? 220 : 0,
                useNativeDriver: true,
              }).start();
            }
          });
        }, Platform.OS === 'ios' ? 50 : 100);
      }
    );

    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!hasShiftedRef.current) return;
        hasShiftedRef.current = false;
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 220 : 0,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, [formTranslateY]);





  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.brownBackground} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>

          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/app-general/LogoMentalCrema.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <KeyboardAvoidingView
            style={styles.formAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
          <Animated.View style={[styles.formContainer, { transform: [{ translateY: formTranslateY }] }]} testID="login-animated-container">
            <Text style={styles.title}>{t('login.title')}</Text>

            <View ref={controlsRef} collapsable={false} style={styles.controlsWrap}>
              <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={handleEmailChange}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor="rgba(251, 239, 217, 0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                testID="email-input"
              />
            </View>

            <Animated.View
              style={{
                width: '100%',
                transform: [{ scale: enterButtonScale }],
                opacity: enterButtonOpacity,
              }}
            >
              <Pressable
                style={[
                  styles.enterButton,
                  !isEmailValid && styles.enterButtonDisabled,
                ]}
                onPress={handleEnter}
                onPressIn={() => {
                  if (!isEmailValid || isSubmitting) return;
                  Animated.parallel([
                    Animated.spring(enterButtonScale, {
                      toValue: 0.95,
                      useNativeDriver: true,
                      speed: 50,
                      bounciness: 0,
                    }),
                    Animated.timing(enterButtonOpacity, {
                      toValue: 0.6,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }}
                onPressOut={() => {
                  if (!isEmailValid || isSubmitting) return;
                  Animated.parallel([
                    Animated.spring(enterButtonScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      speed: 50,
                      bounciness: 4,
                    }),
                    Animated.timing(enterButtonOpacity, {
                      toValue: 1,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }}
                disabled={!isEmailValid || isSubmitting}
                testID="enter-button"
> 
                {isSubmitting && (
                  <ActivityIndicator color="#000" size="small" testID="enter-loading" />
                )}
                <Text
                  style={[
                    styles.enterButtonText,
                    !isEmailValid && styles.enterButtonTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {t('login.enterButton')}
                </Text>
              </Pressable>
            </Animated.View>
            {errorMessage ? (
              <Text style={styles.errorText} testID="login-error-text">{errorMessage}</Text>
            ) : null}
            </View>
          </Animated.View>
          </KeyboardAvoidingView>

          {showCreateAccount ? (
            <View style={styles.createAccountSection} testID="create-account-section">
              <Pressable
                onPress={async () => {
                  if (Platform.OS !== 'web') {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
                  }
                  console.log('[Login] Create account pressed');
                  console.log('[Login] RevenueCat ready status:', isRevenueCatReady);
                  
                  if (!isRevenueCatReady) {
                    console.log('[Login] RevenueCat not ready yet, waiting...');
                    return;
                  }
                  
                  try {
                    console.log('[Login] Fetching offerings...');
                    const offerings = await Purchases.getOfferings();
                    console.log('[Login] Available offerings:', JSON.stringify(offerings, null, 2));
                    
                    if (!offerings.current) {
                      console.log('[Login] No current offering available');
                      return;
                    }
                    
                    const availablePackages = offerings.current.availablePackages;
                    console.log('[Login] Available packages:', availablePackages.length);
                    
                    if (availablePackages.length > 0) {
                      const packageToPurchase = availablePackages[0];
                      console.log('[Login] Attempting purchase of package:', packageToPurchase.identifier);
                      
                      const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
                      console.log('[Login] Purchase result:', JSON.stringify(purchaseResult, null, 2));
                      
                      const customerInfo = purchaseResult.customerInfo;
                      const hasProEntitlement = typeof customerInfo.entitlements.active['Mental'] !== 'undefined';
                      console.log('[Login] Has Mental entitlement:', hasProEntitlement);
                      
                      if (hasProEntitlement) {
                        console.log('[Login] Purchase successful! Navigating to form...');
                        router.replace('/form');
                      } else {
                        console.log('[Login] Purchase completed but no entitlement found');
                      }
                    } else {
                      console.log('[Login] No packages available in offering');
                    }
                  } catch (error: any) {
                    console.log('[Login] Purchase error:', error);
                    console.log('[Login] Error code:', error?.code);
                    console.log('[Login] Error message:', error?.message);
                    
                    if (error?.code === 'PURCHASE_CANCELLED_ERROR' || error?.userCancelled) {
                      console.log('[Login] User cancelled the purchase');
                    } else {
                      console.log('[Login] Purchase failed with error:', error);
                    }
                  }
                }}
                testID="create-account-link"
                android_ripple={{ color: 'rgba(255,138,0,0.15)' }}
                style={{ alignSelf: 'center' }}
              >
                <Text style={styles.createAccountLinkText} numberOfLines={2}>
                  {'¿No tienes cuenta?\nToca aquí para crear una.'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      </TouchableWithoutFeedback>
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
  container: {
    flex: 1,
    paddingHorizontal: 44,
  },

  logoContainer: {
    alignItems: 'center',
    paddingTop: 120,
  },
  logo: {
    width: 120,
    height: 120,
  },
  formAvoider: {
    flex: 1,
    width: '100%',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70,
    minHeight: 400,
  },
  title: {
    fontSize: 41.31,
    fontWeight: '600' as const,
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: -1,
  },
  controlsWrap: {
    width: '100%',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  input: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: 'rgba(251, 239, 217, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.15)',
    fontSize: 17,
    fontWeight: '400' as const,
    color: '#fbefd9',
    letterSpacing: 0,
    textAlign: 'left',
    paddingHorizontal: 24,
  },
  enterButton: {
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
  enterButtonDisabled: {
    backgroundColor: Platform.OS === 'android' ? '#3d2f28' : 'rgba(251, 239, 217, 0.15)',
  },
  enterButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    letterSpacing: -0.3,
  },
  enterButtonTextDisabled: {
    color: '#170501',
  },
  errorText: {
    marginTop: 10,
    color: '#ff4d4f',
    fontSize: 14,
    textAlign: 'center',
  },
  createAccountSection: {
    width: '100%',
    paddingBottom: 57,
    gap: 12,
  },
  noAccountText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#fbefd9',
    textAlign: 'center',
    opacity: 0.7,
  },
  createAccountLinkText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ff8a00',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
