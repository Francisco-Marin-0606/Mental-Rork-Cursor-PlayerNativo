import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Easing,
  Platform,
  TextInput,
  Keyboard,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';


import { useUserSession } from '@/providers/UserSession';
import { useUpdateAudioCustomData } from '@/lib/api-hooks';

interface RenameHypnosisModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  onSave?: (newName: string) => void;
  audioRequestId: string;
}

export default function RenameHypnosisModal({ visible, onClose, currentName, onSave, audioRequestId }: RenameHypnosisModalProps) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateYShift = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);
  const hasShiftedRef = useRef<boolean>(false);
  
  const [name, setName] = useState<string>(currentName);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const initialNameRef = useRef<string>(currentName);

  const saveButtonScale = useRef(new Animated.Value(1)).current;
  const saveButtonOpacity = useRef(new Animated.Value(1)).current;

  const DURATION_OPEN = 300;
  const DURATION_CLOSE = 250;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);

  const { session } = useUserSession();
  const updateAudioMutation = useUpdateAudioCustomData();

  const closeModal = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Animated.timing(scale, {
        toValue: 0.9,
        duration: DURATION_CLOSE,
        easing: easeInOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      translateYShift.setValue(0);
      hasShiftedRef.current = false;
    });
  }, [opacity, scale, onClose, easeInOut, translateYShift]);

  const openModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_OPEN,
        easing: easeInOut,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
    ]).start();
  }, [opacity, scale, easeInOut]);

  const prevVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      initialNameRef.current = currentName;
      setName(currentName);
      openModal();
    }
    prevVisibleRef.current = visible;
  }, [visible, currentName, openModal]);

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      translateYShift.setValue(0);
      hasShiftedRef.current = false;
      setIsSaving(false);
      setName(initialNameRef.current);
    }
  }, [visible, scale, opacity, translateYShift]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }

    setIsSaving(true);

    try {
      if (!session?.userId) {
        console.error('[RenameHypnosisModal] No userId in session');
        setIsSaving(false);
        return;
      }

      console.log('[RenameHypnosisModal] Updating audio custom data:', {
        userId: session.userId,
        audioRequestId,
        name: trimmed,
      });

      await updateAudioMutation.mutateAsync({
        userId: session.userId,
        audioRequestId,
        customData: { name: trimmed },
      });

      console.log('[RenameHypnosisModal] Audio name updated successfully');
      if (onSave) onSave(trimmed);
      closeModal();
    } catch (error: any) {
      console.error('[RenameHypnosisModal] Error updating audio name:', error);
      console.error('[RenameHypnosisModal] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } finally {
      setIsSaving(false);
    }
  }, [name, isSaving, onSave, closeModal, session?.userId, audioRequestId, updateAudioMutation]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(saveButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(saveButtonOpacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(saveButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(saveButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBackdropPress = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const screenHeight = Dimensions.get('window').height;
        const keyboardTop = screenHeight - e.endCoordinates.height;
        setTimeout(() => {
          containerRef.current?.measureInWindow((x, y, width, height) => {
            const bottom = y + height;
            const overlap = bottom + 12 - keyboardTop;
            if (overlap > 0) {
              hasShiftedRef.current = true;
              Animated.timing(translateYShift, {
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
        Animated.timing(translateYShift, {
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
  }, [translateYShift]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="rename-hypnosis-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none">

      </Animated.View>

      <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      
      <Animated.View
        ref={containerRef}
        collapsable={false}
        style={[
          styles.popupContainer,
          {
            opacity,
            transform: [{ scale }, { translateY: translateYShift }],
          },
        ]}
        testID="rename-hypnosis-container"
      >
        <View style={styles.popupContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('renameHypnosis.title')}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={closeModal}
              testID="close-button"
            >
              <X size={24} color="#fbefd9" strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{t('renameHypnosis.subtitle')}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('renameHypnosis.placeholder')}
              placeholderTextColor="rgba(251, 239, 217, 0.3)"
              autoFocus
              editable={!isSaving}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              selectionColor="#ff6b35"
              maxLength={100}
              testID="name-input"
            />
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable
              style={styles.cancelButton}
              onPress={closeModal}
              testID="cancel-button"
            >
              <Text style={styles.cancelButtonText}>{t('renameHypnosis.cancelButton')}</Text>
            </Pressable>

            <Animated.View
              style={{
                flex: 1,
                transform: [{ scale: saveButtonScale }],
                opacity: saveButtonOpacity,
              }}
            >
              <Pressable
                style={[
                  styles.saveButton,
                  (!name.trim() || isSaving) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!name.trim() || isSaving}
                android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                testID="save-button"
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? t('renameHypnosis.saving') : t('renameHypnosis.saveButton')}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
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
    zIndex: 4000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  popupContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#170501',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  popupContent: {
    alignItems: 'stretch',
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fbefd9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.6)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
  },
  cancelButtonText: {
    color: '#fbefd9',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b35',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(251, 239, 217, 0.2)',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
