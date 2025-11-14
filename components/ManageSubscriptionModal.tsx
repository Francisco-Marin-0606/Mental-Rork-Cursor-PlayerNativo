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
  PanResponder,
  Linking,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppSettings, useCancelSubscription } from '@/lib/api-hooks';
import CancelSubscriptionResultModal from './CancelSubscriptionResultModal';

interface ManageSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  isOnline?: boolean;
  subscriptionStatus?: 'active' | 'cancelled' | 'pending' | 'subscribe';
  subscriptionType?: string;
  billingDate?: string;
  userEmail?: string;
  userName?: string;
  onRefreshMembership?: () => void;
}

export default function ManageSubscriptionModal({ visible, onClose, isOnline = true, subscriptionStatus = 'active', subscriptionType, billingDate, userEmail = '', userName = '', onRefreshMembership }: ManageSubscriptionModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const cancelSubscriptionMutation = useCancelSubscription();
  
  const { data: appSettingsData } = useAppSettings();
  const appSettings = appSettingsData?.[0];
  const stripeRedirectEnabled = appSettings?.redirectStripe?.enabledStripe === true;
  const stripeRedirectLink = appSettings?.redirectStripe?.linkStripe;
  
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const buttonAnimation = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
  }).current;

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
      translateY.setValue(0);
      onClose();
    });
  }, [opacity, translateY, screenHeight, onClose, easeInOut]);

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
      translateY.setValue(0);
      translateX.setValue(screenWidth);
      opacity.setValue(0);
    }
  }, [visible, translateY, translateX, opacity, screenWidth]);

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
            translateX.setValue(screenWidth);
            translateY.setValue(0);
            onClose();
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

  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean>(true);
  const [currentStatus, setCurrentStatus] = useState<'active' | 'cancelled' | 'pending'>(
    subscriptionStatus === 'subscribe' ? 'cancelled' : subscriptionStatus
  );
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [cancelSuccess, setCancelSuccess] = useState<boolean>(false);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string>('');
  const cancelConfirmTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const cancelConfirmOpacity = useRef(new Animated.Value(0)).current;
  const yesCancelScale = useRef(new Animated.Value(1)).current;
  const yesCancelOpacity = useRef(new Animated.Value(1)).current;
  const noContinueScale = useRef(new Animated.Value(1)).current;
  const noContinueOpacity = useRef(new Animated.Value(1)).current;
  const confirmTranslateX = useRef(new Animated.Value(0)).current;
  const confirmSwipeOpacity = useRef(new Animated.Value(1)).current;

  const confirmPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          confirmTranslateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > screenWidth * 0.3) {
          Animated.parallel([
            Animated.timing(confirmTranslateX, {
              toValue: screenWidth,
              duration: 250,
              easing: easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(confirmSwipeOpacity, {
              toValue: 0,
              duration: 250,
              easing: easeInOut,
              useNativeDriver: true,
            }),
          ]).start(() => {
            confirmTranslateX.setValue(0);
            confirmSwipeOpacity.setValue(1);
            setShowCancelConfirm(false);
          });
        } else {
          Animated.parallel([
            Animated.spring(confirmTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 10,
            }),
            Animated.timing(confirmSwipeOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleCancelSubscription = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    setShowCancelConfirm(true);
    cancelConfirmTranslateX.setValue(screenWidth);
    cancelConfirmOpacity.setValue(0);
    confirmTranslateX.setValue(0);
    confirmSwipeOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(cancelConfirmTranslateX, {
        toValue: 0,
        duration: 350,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(cancelConfirmOpacity, {
        toValue: 1,
        duration: 350,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelConfirmTranslateX, cancelConfirmOpacity, screenWidth, easeInOut]);

  const handleConfirmCancel = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    
    console.log('[ManageSubscription] Executing cancellation...');
    console.log('[ManageSubscription] userEmail:', userEmail);
    console.log('[ManageSubscription] userName:', userName);
    
    try {
      await cancelSubscriptionMutation.mutateAsync({
        email: userEmail,
        userName: userName,
        cancelAtPeriodEnd: false,
        cancelReason: 'Usuario canceló desde la app',
        context: 'mental-magnet',
      });
      
      console.log('[ManageSubscription] ✅ Subscription cancelled successfully');
      setCancelSuccess(true);
      setCancelErrorMessage('');
      
      Animated.parallel([
        Animated.timing(cancelConfirmTranslateX, {
          toValue: screenWidth,
          duration: 250,
          easing: easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(cancelConfirmOpacity, {
          toValue: 0,
          duration: 250,
          easing: easeInOut,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCancelConfirm(false);
        setShowResultModal(true);
        setIsCancelled(true);
      });
    } catch (error: any) {
      console.error('[ManageSubscription] ❌ Error cancelling subscription:', error);
      console.error('[ManageSubscription] Error message:', error.message);
      console.error('[ManageSubscription] Error response:', error?.response?.data);
      
      setCancelSuccess(false);
      setCancelErrorMessage(error?.response?.data?.message || error.message || 'Error desconocido');
      
      Animated.parallel([
        Animated.timing(cancelConfirmTranslateX, {
          toValue: screenWidth,
          duration: 250,
          easing: easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(cancelConfirmOpacity, {
          toValue: 0,
          duration: 250,
          easing: easeInOut,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCancelConfirm(false);
        setShowResultModal(true);
      });
    }
  }, [cancelConfirmTranslateX, cancelConfirmOpacity, screenWidth, easeInOut, cancelSubscriptionMutation, userEmail, userName]);

  const handleCloseCancelConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    Animated.parallel([
      Animated.timing(cancelConfirmTranslateX, {
        toValue: screenWidth,
        duration: 250,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(cancelConfirmOpacity, {
        toValue: 0,
        duration: 250,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCancelConfirm(false);
    });
  }, [cancelConfirmTranslateX, cancelConfirmOpacity, screenWidth, easeInOut]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonAnimation.scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(buttonAnimation.opacity, {
        toValue: 0.6,
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

  const formatBillingDate = (dateString?: string): string => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const day = date.getUTCDate();
      const month = months[date.getUTCMonth()];
      return `${day} de ${month}`;
    } catch (error) {
      console.log('Error formatting billing date:', error);
      return '-';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="manage-subscription-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }, { translateX }],
          },
        ]}
        testID="manage-subscription-container"
        {...panResponder.panHandlers}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeModal} 
              testID="close-button" 
              activeOpacity={0.6}
            >
              <ChevronLeft color="#fbefd9" size={28} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('manageSubscription.title')}</Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('manageSubscription.subscription')}</Text>
              <View 
                style={[
                  styles.statusBadge,
                  (currentStatus === 'cancelled' || subscriptionStatus === 'subscribe') && styles.statusBadgeInactive,
                  currentStatus === 'pending' && styles.statusBadgePending
                ]}
              >
                <Text style={[
                  styles.statusText,
                  (currentStatus === 'cancelled' || subscriptionStatus === 'subscribe') && styles.statusTextInactive,
                  currentStatus === 'pending' && styles.statusTextPending
                ]}>
                  {currentStatus === 'active' ? t('settings.subscription.status.active') : 
                   currentStatus === 'pending' ? t('settings.subscription.status.pending') : 
                   t('settings.subscription.status.cancelled')}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, !subscriptionActive && styles.infoLabelInactive]}>
                {t('manageSubscription.currentPlan')}
              </Text>
              <Text style={[styles.infoValue, !subscriptionActive && styles.infoValueInactive]}>
                {subscriptionActive ? (subscriptionType || '-') : '-'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[
                styles.infoLabel, 
                !subscriptionActive && styles.infoLabelInactive,
                currentStatus === 'pending' && styles.infoLabelPending
              ]}>
                {t('manageSubscription.nextPayment')}
              </Text>
              <Text style={[
                styles.infoValue, 
                !subscriptionActive && styles.infoValueInactive,
                currentStatus === 'pending' && styles.infoValuePending
              ]}>
                {subscriptionActive ? formatBillingDate(billingDate) : '-'}
              </Text>
            </View>

            {isOnline && subscriptionType !== 'Gratuita' && (
              <View style={styles.buttonContainer}>
                <Animated.View
                  style={{
                    transform: [{ scale: buttonAnimation.scale }],
                    opacity: buttonAnimation.opacity,
                    width: '100%',
                  }}
                >
                  <Pressable
                    style={[
                      styles.cancelButton,
                      isCancelled && styles.cancelButtonDisabled,
                      (!subscriptionActive || currentStatus === 'cancelled' || subscriptionStatus === 'subscribe') && styles.cancelButtonActive
                    ]}
                    onPress={async () => {
                      if (!subscriptionActive || currentStatus === 'cancelled' || subscriptionStatus === 'subscribe') {
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                          } catch (error) {
                            console.log('Haptic feedback error:', error);
                          }
                        }
                        // Si la redirección de Stripe está habilitada, redirigir al link
                        if (stripeRedirectEnabled && stripeRedirectLink) {
                          console.log('[ManageSubscription] Redirecting to Stripe:', stripeRedirectLink);
                          try {
                            const supported = await Linking.canOpenURL(stripeRedirectLink);
                            if (supported) {
                              await Linking.openURL(stripeRedirectLink);
                            } else {
                              console.log('[ManageSubscription] Cannot open URL:', stripeRedirectLink);
                            }
                          } catch (error) {
                            console.log('[ManageSubscription] Error opening Stripe link:', error);
                          }
                        }
                      } else {
                        handleCancelSubscription();
                      }
                    }}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                    testID="cancel-subscription-button"
                    disabled={isCancelled}
                  >
                    <Text style={[
                      styles.cancelButtonText,
                      isCancelled && styles.cancelButtonTextDisabled,
                      (!subscriptionActive || currentStatus === 'cancelled' || subscriptionStatus === 'subscribe') && styles.cancelButtonTextActive
                    ]}>
                      {(subscriptionActive && currentStatus !== 'cancelled' && subscriptionStatus !== 'subscribe') ? t('manageSubscription.cancelButton') : 'Suscribirme'}
                    </Text>
                  </Pressable>
                </Animated.View>
                {currentStatus === 'pending' && (
                  <Text style={styles.pendingText}>
                    {t('manageSubscription.pendingMessage')}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {showCancelConfirm && (
        <View style={styles.confirmOverlay}>
          <Animated.View style={[styles.confirmBackdrop, { opacity: cancelConfirmOpacity }]} pointerEvents="none" />
          <Animated.View
            style={[
              styles.confirmContainer,
              {
                height: screenHeight,
                opacity: Animated.multiply(cancelConfirmOpacity, confirmSwipeOpacity),
                transform: [
                  { translateX: cancelConfirmTranslateX },
                  { translateX: confirmTranslateX }
                ],
              },
            ]}
            {...confirmPanResponder.panHandlers}
          >
            <View style={styles.confirmContent}>
              <View style={styles.confirmHeader}>
                <TouchableOpacity 
                  style={styles.confirmCloseButton} 
                  onPress={handleCloseCancelConfirm} 
                  activeOpacity={0.6}
                >
                  <ChevronLeft color="#fbefd9" size={28} />
                </TouchableOpacity>
              </View>

              <View style={styles.confirmBody}>
                <Text style={[styles.confirmTitle, Platform.OS === 'android' && styles.confirmTitleAndroid]}>
                  {t('manageSubscription.confirmCancel.title')}
                </Text>
              <Text style={[styles.confirmSubtitle, Platform.OS === 'android' && styles.confirmSubtitleAndroid]}>
                {t('manageSubscription.confirmCancel.subtitle')}
              </Text>

                <View style={styles.confirmButtons}>
                  <Animated.View style={{ transform: [{ scale: yesCancelScale }], opacity: yesCancelOpacity, marginBottom: 12 }}>
                    <Pressable
                      style={styles.confirmButton}
                      onPress={async () => {
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                          } catch (error) {
                            console.log('Haptic feedback error:', error);
                          }
                        }
                        handleConfirmCancel();
                      }}
                      disabled={cancelSubscriptionMutation.isPending}
                      onPressIn={() => {
                        Animated.parallel([
                          Animated.spring(yesCancelScale, {
                            toValue: 0.9,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 0,
                          }),
                          Animated.timing(yesCancelOpacity, {
                            toValue: 0.2,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      onPressOut={() => {
                        Animated.parallel([
                          Animated.spring(yesCancelScale, {
                            toValue: 1,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 4,
                          }),
                          Animated.timing(yesCancelOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                    >
                      <Text style={styles.confirmButtonText}>
                        {cancelSubscriptionMutation.isPending ? 'Cancelando...' : t('manageSubscription.confirmCancel.confirmButton')}
                      </Text>
                    </Pressable>
                  </Animated.View>

                  <Animated.View style={{ transform: [{ scale: noContinueScale }], opacity: noContinueOpacity }}>
                    <Pressable
                      style={styles.confirmButtonSecondary}
                      onPress={async () => {
                        if (Platform.OS !== 'web') {
                          try {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                          } catch (error) {
                            console.log('Haptic feedback error:', error);
                          }
                        }
                        handleCloseCancelConfirm();
                      }}
                      onPressIn={() => {
                        Animated.parallel([
                          Animated.spring(noContinueScale, {
                            toValue: 0.9,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 0,
                          }),
                          Animated.timing(noContinueOpacity, {
                            toValue: 0.2,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      onPressOut={() => {
                        Animated.parallel([
                          Animated.spring(noContinueScale, {
                            toValue: 1,
                            useNativeDriver: true,
                            speed: 50,
                            bounciness: 4,
                          }),
                          Animated.timing(noContinueOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      }}
                      android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                    >
                      <Text style={styles.confirmButtonSecondaryText}>{t('manageSubscription.confirmCancel.cancelButton')}</Text>
                    </Pressable>
                  </Animated.View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      <CancelSubscriptionResultModal
        visible={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          if (onRefreshMembership) {
            console.log('[ManageSubscription] Refreshing membership status after cancel result modal close');
            onRefreshMembership();
          }
        }}
        success={cancelSuccess}
        errorMessage={cancelErrorMessage}
      />
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
  content: {
    flex: 1,
    paddingHorizontal: 44,
    paddingTop: Platform.OS === 'android' ? 16 : 60,
    paddingBottom: 40,
  },
  header: {
    paddingBottom: 20,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: Platform.OS === 'android' ? 0 : 30,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  closeButton: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: Platform.OS === 'android' ? -4 : -14,
  },
  title: {
    fontSize: 20.16,
    fontWeight: '700',
    color: '#fbefd9',
    lineHeight: 37.8,
  },
  infoSection: {
    gap: 32,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbefd9',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '400',
    color: '#fbefd9',
  },
  statusBadge: {
    backgroundColor: '#fbefd9',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 132, 30, 0.4)',
  },
  statusBadgeInactive: {
    backgroundColor: '#555555',
    borderWidth: 1.5,
    borderColor: '#808080',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1a0d08',
    letterSpacing: 1.2,
  },
  statusTextInactive: {
    color: '#fbefd9',
  },
  buttonContainer: {
    marginTop: 16,
  },
  cancelButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B1C1C',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    letterSpacing: -0.3,
  },
  cancelButtonTextDisabled: {
    color: 'rgba(251, 239, 217, 0.4)',
  },
  cancelButtonDisabled: {
    backgroundColor: '#808080',
    opacity: 0.3,
  },
  cancelButtonActive: {
    backgroundColor: '#ff6b35',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.35)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  cancelButtonTextActive: {
    color: '#ffffff',
  },
  infoLabelInactive: {
    opacity: 0.3,
  },
  infoValueInactive: {
    opacity: 0.3,
  },
  statusBadgePending: {
    backgroundColor: 'rgba(201, 132, 30, 0.4)',
    borderColor: 'rgba(201, 132, 30, 0.3)',
  },
  statusTextPending: {
    color: '#ffffff',
  },

  infoLabelPending: {
    color: '#ef4444',
  },
  infoValuePending: {
    color: '#ef4444',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4000,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  confirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#170501',
    overflow: 'hidden',
  },
  confirmContent: {
    flex: 1,
    paddingHorizontal: 33,
    paddingTop: Platform.OS === 'android' ? 12 : 45,
    paddingBottom: 30,
  },
  confirmHeader: {
    paddingBottom: 20,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'android' ? 0 : 30,
  },
  confirmCloseButton: {
    alignSelf: 'flex-start',
    marginLeft: -10,
  },
  confirmBody: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 110,
  },
  confirmTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
    maxWidth: '100%',
  },
  confirmTitleAndroid: {
    fontSize: 28,
    lineHeight: 32,
    maxWidth: '100%',
  },
  confirmSubtitle: {
    fontSize: 16,
    color: 'rgba(251, 239, 217, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmSubtitleAndroid: {
    fontSize: 14,
    lineHeight: 20,
  },
  confirmButtons: {
    width: '100%',
    marginTop: 32,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  confirmButtonSecondary: {
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
  confirmButtonSecondaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
});
