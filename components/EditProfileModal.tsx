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
  TextInput,
  ScrollView,
  PanResponder,
  Keyboard,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useUser, useUpdateUser } from '@/lib/api-hooks';
import { useUserSession } from '@/providers/UserSession';

const formatBirthdate = (dateString: string): string => {
  if (!dateString) return '—';

  try {
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ] as const;

    // Try ISO first (e.g., 1995-10-19T00:00:00.000Z)
    const isoDate = new Date(dateString);
    if (!Number.isNaN(isoDate.getTime())) {
      const day = isoDate.getUTCDate();
      const monthIndex = isoDate.getUTCMonth();
      const year = isoDate.getUTCFullYear();
      return `${day} ${monthNames[monthIndex]} ${year}`;
    }

    // Fallback to dd/mm/yyyy
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
        return `${day} ${monthNames[month - 1]} ${year}`;
      }
    }

    return dateString;
  } catch (e) {
    console.log('[formatBirthdate] Error formatting date:', e);
    return dateString;
  }
};

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const sessionCtx = useUserSession();
  const userId = sessionCtx?.session?.userId ?? '';

  const [nombre, setNombre] = useState<string>('');
  const [apellido, setApellido] = useState<string>('');
  const [nombrePreferido, setNombrePreferido] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [genero, setGenero] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const profileQuery = useUser(userId);
  const updateUserMutation = useUpdateUser();

  useEffect(() => {
    if (profileQuery.data) {
      const d = profileQuery.data;
      console.log('[EditProfileModal] User data loaded:', d);
      setNombre(d.names ?? d.name ?? '');
      setApellido(d.lastnames ?? '');
      setNombrePreferido(d.wantToBeCalled ?? '');
      setEmail(d.email ?? '');
      setGenero(d.gender ?? '');
      setFechaNacimiento(d.birthdate ?? '');
    }
    if (profileQuery.error) {
      console.log('[EditProfileModal] User query error:', profileQuery.error);
    }
  }, [profileQuery.data, profileQuery.error]);

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
  }, [opacity, translateY, translateX, screenHeight, onClose, easeInOut]);

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
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 10;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          const progress = Math.min(gestureState.dx / screenWidth, 1);
          opacity.setValue(1 - progress * 0.5);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
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

  const handleSave = useCallback(async () => {
    const trimmedNombrePreferido = nombrePreferido.trim();
    
    if (trimmedNombrePreferido.length === 0) {
      setValidationError(t('editProfile.requiredField'));
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (error) {
          console.log('Haptic feedback error:', error);
        }
      }
      return;
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();
    
    const updateData: Record<string, string> = {
      wantToBeCalled: trimmedNombrePreferido
    };
    
    if (trimmedNombre) {
      updateData.names = trimmedNombre;
    }
    
    if (trimmedApellido) {
      updateData.lastnames = trimmedApellido;
    }
    
    console.log('[EditProfileModal] Saving profile with data:', { userId, updateData });

    try {
      setIsSaving(true);
      const res = await updateUserMutation.mutateAsync({ userId, data: updateData });
      console.log('[EditProfileModal] User updated successfully:', res);
      closeModal();
    } catch (e) {
      console.log('[EditProfileModal] Update user error:', e);
      setValidationError('No se pudo guardar. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }, [nombre, apellido, nombrePreferido, userId, updateUserMutation, closeModal]);

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

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="edit-profile-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }, { translateX }],
          },
        ]}
        testID="edit-profile-container"
        {...panResponder.panHandlers}
      >
        <Pressable style={styles.content} onPress={Keyboard.dismiss}>
          <Pressable style={styles.header} onPress={Keyboard.dismiss}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeModal} 
              testID="close-button" 
              activeOpacity={0.6}
            >
              <ChevronLeft color="#fbefd9" size={28} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('editProfile.title')}</Text>
          </Pressable>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={Platform.OS === 'android'}
            keyboardDismissMode="none"
            scrollEventThrottle={16}
          >
            <View style={styles.formContainer}>
                {profileQuery.isLoading ? (
                  <Text style={styles.helperText} testID="profile-loading">Cargando perfil...</Text>
                ) : null}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('editProfile.firstName')}</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder={t('editProfile.placeholder')}
                  placeholderTextColor="rgba(251, 239, 217, 0.3)"
                  maxLength={25}
                  testID="nombre-input"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('editProfile.lastName')}</Text>
                <TextInput
                  style={styles.input}
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder={t('editProfile.placeholder')}
                  placeholderTextColor="rgba(251, 239, 217, 0.3)"
                  maxLength={25}
                  testID="apellido-input"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('editProfile.preferredName')}</Text>
                <Text style={styles.helperText}>
                  {t('editProfile.preferredNameHelper')}
                </Text>
                <TextInput
                  style={[styles.input, validationError && styles.inputError]}
                  value={nombrePreferido}
                  onChangeText={(text) => {
                    setNombrePreferido(text);
                    if (validationError && text.trim().length > 0) {
                      setValidationError('');
                    }
                  }}
                  placeholder={t('editProfile.placeholder')}
                  placeholderTextColor="rgba(251, 239, 217, 0.3)"
                  maxLength={25}
                  testID="nombre-preferido-input"
                />
                {validationError && (
                  <Text style={styles.errorText}>{validationError}</Text>
                )}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('editProfile.email')}</Text>
                <Text style={styles.readOnlyText} testID="email-readonly">{email || '—'}</Text>
              </View>

              <View style={styles.rowContainer}>
                <View style={[styles.fieldContainer, styles.halfField]}>
                  <Text style={styles.label} numberOfLines={1}>{t('editProfile.dateOfBirth')}</Text>
                  <Text style={styles.readOnlyText} testID="birthdate-readonly">{formatBirthdate(fechaNacimiento)}</Text>
                </View>

                <View style={[styles.fieldContainer, styles.halfFieldSmaller]}>
                  <Text style={styles.label}>{t('editProfile.gender')}</Text>
                  <Text style={styles.readOnlyText} testID="gender-readonly">{genero || '—'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <Pressable style={styles.footer} onPress={Keyboard.dismiss}>
            <Animated.View
              style={{
                transform: [{ scale: buttonAnimation.scale }],
                opacity: buttonAnimation.opacity,
                width: '100%',
              }}
            >
              <Pressable
                style={styles.saveButton}
                onPress={handleSave}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="save-button"
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Guardando...' : t('editProfile.saveButton')}</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    backgroundColor: '#170501',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#170501',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#170501',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
    marginBottom: 12,
    marginTop: Platform.OS === 'android' ? 0 : 30,
    paddingTop: Platform.OS === 'android' ? 50 : 0,
  },
  closeButton: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -14,
    paddingTop: Platform.OS === 'android' ? 50 : 0,
  },
  title: {
    fontSize: 20.16,
    fontWeight: '700',
    color: '#fbefd9',
    lineHeight: 37.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 240,
  },
  formContainer: {
    gap: 24,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fbefd9',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 15,
    color: 'rgba(251, 239, 217, 0.6)',
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fbefd9',
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
  },
  inputText: {
    fontSize: 16,
    color: '#fbefd9',
  },
  readOnlyText: {
    fontSize: 16,
    color: 'rgba(251, 239, 217, 0.3)',
    textAlign: 'left',
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
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1.3,
  },
  halfFieldSmaller: {
    flex: 0.7,
  },
  inputTransparent: {
    paddingHorizontal: 0,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 44,
    paddingTop: 24,
    paddingBottom: 55,
    backgroundColor: '#170501',
  },
  saveButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 14,
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
  saveButtonText: {
    color: '#fbefd9',
    fontSize: 18,
    fontWeight: '600',
  },
});
