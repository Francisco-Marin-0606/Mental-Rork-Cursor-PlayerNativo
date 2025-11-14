import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  Linking,
} from 'react-native';
import { X, User, Edit3, HelpCircle, Mail, Globe, Database } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { router } from 'expo-router';
import EditProfileModal from './EditProfileModal';
import { useUserSession } from '@/providers/UserSession';
import ManageSubscriptionModal from './ManageSubscriptionModal';
import ErrorModal from './ErrorModal';
import PendingPaymentModal from './PendingPaymentModal';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAppSettings } from '@/lib/api-hooks';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '@/config/i18n';
import Constants from 'expo-constants';
import appConfig from '../app.json';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isOnline?: boolean;
}

export default function SettingsModal({ visible, onClose, isOnline = true }: SettingsModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, i18n: i18nHook } = useTranslation();
  const { clearSession, session } = useUserSession();
  const { data: appSettingsData } = useAppSettings();
  const appSettings = React.useMemo(() => appSettingsData?.[0], [appSettingsData]);
  const stripeRedirectEnabled = React.useMemo(() => appSettings?.redirectStripe?.enabledStripe === true, [appSettings]);
  const stripeRedirectLink = React.useMemo(() => appSettings?.redirectStripe?.linkStripe, [appSettings]);
  const i18nInstance = i18nHook || i18n;
  
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const buttonAnimations = useRef<{ [key: string]: { scale: Animated.Value; opacity: Animated.Value } }>({}).current;
  
  const [editProfileModalVisible, setEditProfileModalVisible] = useState<boolean>(false);
  const [manageSubscriptionModalVisible, setManageSubscriptionModalVisible] = useState<boolean>(false);
  const [errorModalVisible, setErrorModalVisible] = useState<boolean>(false);
  const [pendingPaymentModalVisible, setPendingPaymentModalVisible] = useState<boolean>(false);

  const userQuery = useQuery({
    queryKey: ['user', session?.userId],
    queryFn: () => session?.userId ? apiClient.user.getById(session.userId) : null,
    enabled: !!session?.userId,
  });

  const subscriptionStatus: 'active' | 'cancelled' | 'pending' | 'subscribe' = React.useMemo(() => {
    const membershipType = userQuery.data?.lastMembership?.type;
    const stripeStatus = session?.subscriptionStatus;
    const isActive = session?.isMembershipActive;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[SettingsModal Badge] Calculating badge status...');
    console.log('[SettingsModal Badge] membershipType:', membershipType);
    console.log('[SettingsModal Badge] stripeStatus:', stripeStatus);
    console.log('[SettingsModal Badge] isActive:', isActive);
    console.log('[SettingsModal Badge] session data:', JSON.stringify(session, null, 2));

    if (membershipType === 'free') {
      console.log('[SettingsModal Badge] 🎁 Result: ACTIVA (free membership, no Stripe check needed)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'active';
    }

    if (stripeStatus === 'active' && isActive === true) {
      console.log('[SettingsModal Badge] ✅ Result: ACTIVA (active + isActive)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'active';
    }

    if (stripeStatus === 'canceled' && isActive === true) {
      console.log('[SettingsModal Badge] ⚠️ Result: CANCELADA (canceled + isActive)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'cancelled';
    }

    if (stripeStatus === 'canceled' && isActive === false) {
      console.log('[SettingsModal Badge] ❌ Result: SUSCRIBIRME (canceled + !isActive)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'subscribe';
    }

    if (stripeStatus !== 'active' && stripeStatus !== 'canceled' && isActive === false) {
      console.log('[SettingsModal Badge] ⏳ Result: PAGO PENDIENTE (other status + !isActive)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return 'pending';
    }

    console.log('[SettingsModal Badge] ⚠️ No matching condition, defaulting to SUSCRIBIRME');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return 'subscribe';
  }, [session?.subscriptionStatus, session?.isMembershipActive, userQuery.data?.lastMembership?.type]);

  const getSubscriptionTypeText = () => {
    const membershipType = userQuery.data?.lastMembership?.type;
    if (!membershipType) return t('settings.subscription.type');
    
    switch (membershipType) {
      case 'monthly':
        return 'Mensual';
      case 'yearly':
        return 'Anual';
      case 'free':
        return 'Gratuita';
      default:
        return t('settings.subscription.type');
    }
  };

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
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
      onClose();
    });
  }, [opacity, translateY, screenHeight, onClose, easeInOut]);

  const openModal = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    opacity.stopAnimation();
    translateY.stopAnimation();

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
    });
  }, [opacity, translateY, easeInOut]);

  useEffect(() => {
    if (visible) {
      openModal();
    }
  }, [visible, openModal]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
    }
  }, [visible, translateY, opacity, screenHeight]);

  const handleMenuAction = useCallback(async (action: string) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    console.log(`Settings action: ${action}`);
    
    if (action === 'edit-profile') {
      setEditProfileModalVisible(true);
      return;
    }

    if (action === 'manage-subscription') {
      setManageSubscriptionModalVisible(true);
      return;
    }

    if (action === 'faq') {
      try {
        await Linking.openURL('https://www.mental.app/preguntas');
      } catch (e) {
        console.log('Failed to open FAQ URL', e);
      }
      return;
    }

    if (action === 'contact') {
      try {
        await Linking.openURL('mailto:apoyo@mental.app?subject=Contacto desde la aplicación');
      } catch (e) {
        console.log('Failed to open email app', e);
      }
      return;
    }

    if (action === 'test-mongo') {
      closeModal();
      setTimeout(() => {
        router.push('/test-mongo');
      }, 400);
      return;
    }

    if (action === 'change-language') {
      const currentLang = i18nInstance.language || 'es';
      const newLanguage = currentLang === 'es' ? 'en' : 'es';
      await i18nInstance.changeLanguage(newLanguage);
      console.log(`Language changed to: ${newLanguage}`);
      return;
    }

    if (action === 'terms') {
      try {
        await Linking.openURL('https://www.mental.app/terminos');
      } catch (e) {
        console.log('Failed to open terms URL', e);
      }
      return;
    }

    if (action === 'privacy') {
      try {
        await Linking.openURL('https://www.mental.app/politicas');
      } catch (e) {
        console.log('Failed to open privacy URL', e);
      }
      return;
    }
    
    if (action === 'logout') {
      try { clearSession(); } catch (e) { console.log('clearSession error', e); }
      closeModal();
      setTimeout(() => {
        try { router.replace('/login'); } catch {}
      }, 400);
    }
  }, [closeModal, i18nInstance, clearSession]);

  const getButtonAnimation = (buttonId: string) => {
    if (!buttonAnimations[buttonId]) {
      buttonAnimations[buttonId] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }
    return buttonAnimations[buttonId];
  };

  const handlePressIn = (buttonId: string) => {
    const anim = getButtonAnimation(buttonId);
    
    Animated.parallel([
      Animated.spring(anim.scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(anim.opacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = (buttonId: string) => {
    const anim = getButtonAnimation(buttonId);
    
    Animated.parallel([
      Animated.spring(anim.scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="settings-overlay" pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="auto" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }],
          },
        ]}
        testID="settings-container"
        pointerEvents="box-none"
      >
        <View style={[
            styles.modalContent,
            { paddingTop: (Platform.OS === 'android' ? insets.top + 12 : insets.top + 20), paddingBottom: insets.bottom + 20 }
          ]} pointerEvents="box-none">
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeModal} 
              testID="close-button" 
              activeOpacity={0.6}
            >
              <View style={styles.closeButtonInner}>
                <X color="#fbefd9" size={24} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.subscriptionSection}>
            <View style={styles.subscriptionRow}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionLabel}>{t('settings.subscription.label')}</Text>
                <Text style={styles.subscriptionType}>{getSubscriptionTypeText()}</Text>
              </View>
              <Pressable
                style={[
                  styles.budgetContainer,
                  subscriptionStatus === 'active' && styles.budgetContainerActive,
                  subscriptionStatus === 'cancelled' && styles.budgetContainerCancelled,
                  subscriptionStatus === 'pending' && styles.budgetContainerPending,
                  subscriptionStatus === 'subscribe' && styles.budgetContainerSubscribe
                ]}
                onPress={async () => {
                  if (subscriptionStatus === 'subscribe' && stripeRedirectEnabled && stripeRedirectLink) {
                    if (Platform.OS !== 'web') {
                      try {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      } catch (error) {
                        console.log('Haptic feedback error:', error);
                      }
                    }
                    console.log('[Settings Badge] Redirecting to Stripe:', stripeRedirectLink);
                    try {
                      const supported = await Linking.canOpenURL(stripeRedirectLink);
                      if (supported) {
                        await Linking.openURL(stripeRedirectLink);
                      } else {
                        console.log('[Settings Badge] Cannot open URL:', stripeRedirectLink);
                      }
                    } catch (error) {
                      console.log('[Settings Badge] Error opening Stripe link:', error);
                    }
                  }
                  if (subscriptionStatus === 'pending') {
                    if (Platform.OS !== 'web') {
                      try {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      } catch (error) {
                        console.log('Haptic feedback error:', error);
                      }
                    }
                    setPendingPaymentModalVisible(true);
                  }
                }}
                disabled={subscriptionStatus === 'active' || subscriptionStatus === 'cancelled'}
              >
                <Text style={[
                  styles.budgetText,
                  subscriptionStatus === 'active' && styles.budgetTextActive,
                  (subscriptionStatus === 'cancelled' || subscriptionStatus === 'pending' || subscriptionStatus === 'subscribe') && styles.budgetTextInactive
                ]}>
                  {subscriptionStatus === 'active' ? t('settings.subscription.status.active') : 
                   subscriptionStatus === 'pending' ? t('settings.subscription.status.pending') : 
                   subscriptionStatus === 'subscribe' ? t('settings.subscription.status.subscribe') :
                   t('settings.subscription.status.cancelled')}
                </Text>
              </Pressable>
            </View>
            {subscriptionStatus === 'cancelled' && (
              <Text style={styles.cancelledTextTop}>
                {t('manageSubscription.cancelledMessage')}
              </Text>
            )}
            {subscriptionStatus === 'pending' && (
              <Text style={styles.cancelledTextTop}>
                {t('manageSubscription.pendingMessage')}
              </Text>
            )}
          </View>

          <View style={styles.menuSection}>
            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('manage-subscription').scale }],
                opacity: getButtonAnimation('manage-subscription').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('manage-subscription')}
                onPressIn={() => handlePressIn('manage-subscription')}
                onPressOut={() => handlePressOut('manage-subscription')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-manage-subscription"
              >
                <View style={styles.menuIconContainer}>
                  <User color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>{t('settings.menu.manageSubscription')}</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('edit-profile').scale }],
                opacity: getButtonAnimation('edit-profile').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('edit-profile')}
                onPressIn={() => handlePressIn('edit-profile')}
                onPressOut={() => handlePressOut('edit-profile')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-edit-profile"
              >
                <View style={styles.menuIconContainer}>
                  <Edit3 color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>{t('settings.menu.editProfile')}</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('faq').scale }],
                opacity: getButtonAnimation('faq').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('faq')}
                onPressIn={() => handlePressIn('faq')}
                onPressOut={() => handlePressOut('faq')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-faq"
              >
                <View style={styles.menuIconContainer}>
                  <HelpCircle color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>{t('settings.menu.faq')}</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('contact').scale }],
                opacity: getButtonAnimation('contact').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('contact')}
                onPressIn={() => handlePressIn('contact')}
                onPressOut={() => handlePressOut('contact')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-contact"
              >
                <View style={styles.menuIconContainer}>
                  <Mail color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>{t('settings.menu.contact')}</Text>
              </Pressable>
            </Animated.View>

            {false && (
            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('test-mongo').scale }],
                opacity: getButtonAnimation('test-mongo').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('test-mongo')}
                onPressIn={() => handlePressIn('test-mongo')}
                onPressOut={() => handlePressOut('test-mongo')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-test-mongo"
              >
                <View style={styles.menuIconContainer}>
                  <Database color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>Ver últimos 20 usuarios</Text>
              </Pressable>
            </Animated.View>
            )}

{false && (
            <Animated.View
              style={{
                transform: [{ scale: getButtonAnimation('change-language').scale }],
                opacity: getButtonAnimation('change-language').opacity,
              }}
            >
              <Pressable
                style={styles.menuItem}
                onPress={() => handleMenuAction('change-language')}
                onPressIn={() => handlePressIn('change-language')}
                onPressOut={() => handlePressOut('change-language')}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="menu-change-language"
              >
                <View style={styles.menuIconContainer}>
                  <Globe color="#ffffff" size={20} />
                </View>
                <Text style={styles.menuItemText}>
                  {t('settings.menu.language')}: {(i18nInstance.language || 'es') === 'es' ? 'Español' : 'English'}
                </Text>
              </Pressable>
            </Animated.View>
            )}
          </View>

          <Animated.View
            style={{
              transform: [{ scale: getButtonAnimation('logout').scale }],
              opacity: getButtonAnimation('logout').opacity,
            }}
          >
            <Pressable
              style={[
                styles.logoutButton,
                subscriptionStatus === 'active' ? styles.logoutButtonActive : styles.logoutButtonInactive
              ]}
              onPress={() => handleMenuAction('logout')}
              onPressIn={() => handlePressIn('logout')}
              onPressOut={() => handlePressOut('logout')}
              android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
              testID="logout-button"
            >
              <Text style={[
                styles.logoutButtonText,
                subscriptionStatus !== 'active' && styles.logoutButtonTextInactive
              ]}>{t('settings.logout')}</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.versionText}>{t('settings.version')} {appConfig.expo.version}</Text>

          <View style={styles.footerContainer}>
            <View style={styles.footerLinks}>
            <Pressable
              onPress={() => handleMenuAction('terms')}
              android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.1)', borderless: true } : undefined}
            >
              <Text style={styles.footerLinkText}>{t('settings.footer.terms')}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMenuAction('privacy')}
              android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.1)', borderless: true } : undefined}
            >
              <Text style={styles.footerLinkText}>{t('settings.footer.privacy')}</Text>
            </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {editProfileModalVisible && (
        <EditProfileModal
          visible={editProfileModalVisible}
          onClose={() => setEditProfileModalVisible(false)}
        />
      )}

      {manageSubscriptionModalVisible && (
        <ManageSubscriptionModal
          visible={manageSubscriptionModalVisible}
          onClose={() => setManageSubscriptionModalVisible(false)}
          isOnline={isOnline}
          subscriptionStatus={subscriptionStatus}
          subscriptionType={getSubscriptionTypeText()}
          billingDate={userQuery.data?.lastMembership?.billingDate}
          userEmail={userQuery.data?.email || ''}
          userName={userQuery.data?.wantToBeCalled || userQuery.data?.names || ''}
        />
      )}

      {errorModalVisible && (
        <ErrorModal
          visible={errorModalVisible}
          onClose={() => setErrorModalVisible(false)}
        />
      )}

      {pendingPaymentModalVisible && (
        <PendingPaymentModal
          visible={pendingPaymentModalVisible}
          onClose={() => setPendingPaymentModalVisible(false)}
          stripeLink={stripeRedirectLink}
        />
      )}
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
    zIndex: 99999999,
    elevation: 99999999,
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
  modalContent: {
    flex: 1,
    paddingHorizontal: 44,
    justifyContent: 'space-between',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  closeButton: {
    zIndex: 10,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32.4,
    fontWeight: '700',
    color: '#fbefd9',
    flex: 1,
  },
  subscriptionSection: {
    marginBottom: 12,
    marginTop: 8,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbefd9',
    marginBottom: 0,
  },
  subscriptionType: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.35)',
  },
  budgetContainer: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  budgetContainerActive: {
    backgroundColor: '#fbefd9',
    borderColor: 'rgba(201, 132, 30, 0.4)',
  },
  budgetContainerCancelled: {
    backgroundColor: '#555555',
    borderWidth: 1.5,
    borderColor: '#808080',
  },
  budgetContainerPending: {
    backgroundColor: 'rgba(201, 132, 30, 0.4)',
    borderColor: 'rgba(201, 132, 30, 0.3)',
  },
  budgetContainerSubscribe: {
    backgroundColor: '#ff6b35',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },

  budgetText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  budgetTextActive: {
    color: '#1a0d08',
  },
  budgetTextInactive: {
    color: '#ffffff',
  },

  menuSection: {
    gap: 0,
    marginBottom: 24,
  },
  menuItem: {
    ...BUTTON_STYLES.primaryButton,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 16,
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },

  menuIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    ...BUTTON_STYLES.primaryButtonText,
    flex: 1,
  },
  logoutButton: {
    ...BUTTON_STYLES.primaryButton,
    marginBottom: 24,
    overflow: 'hidden',
  },
  logoutButtonActive: {
    backgroundColor: '#ff6b35',
  },
  logoutButtonInactive: {
    backgroundColor: '#fbefd9',
  },

  logoutButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
  },
  logoutButtonTextInactive: {
    color: '#1a0d08',
  },
  versionText: {
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.15)',
    textAlign: 'center',
    marginBottom: 20,
  },
  footerContainer: {
    marginTop: 'auto',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 24,
  },
  footerLinkText: {
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.15)',
    textAlign: 'center',
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fbefd9',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  cancelledTextTop: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.35)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
});
