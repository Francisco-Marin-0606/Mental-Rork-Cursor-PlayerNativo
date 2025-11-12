import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import '@/config/i18n';


interface DeleteAlbumModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  albumTitle: string;
}

export default function DeleteAlbumModal({ visible, onClose, onConfirm, albumTitle }: DeleteAlbumModalProps) {
  const { t } = useTranslation();
  const cancelButtonScale = useRef(new Animated.Value(1)).current;
  const cancelButtonOpacity = useRef(new Animated.Value(1)).current;
  const confirmButtonScale = useRef(new Animated.Value(1)).current;
  const confirmButtonOpacity = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const handleCancel = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, modalScale, modalOpacity]);

  const handleConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    }
    
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onConfirm();
    });
  }, [onConfirm, modalScale, modalOpacity]);

  const handleCancelButtonPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(cancelButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(cancelButtonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelButtonScale, cancelButtonOpacity]);

  const handleCancelButtonPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(cancelButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(cancelButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelButtonScale, cancelButtonOpacity]);

  const handleConfirmButtonPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(confirmButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(confirmButtonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [confirmButtonScale, confirmButtonOpacity]);

  const handleConfirmButtonPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(confirmButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(confirmButtonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [confirmButtonScale, confirmButtonOpacity]);

  React.useEffect(() => {
    if (visible) {
      modalScale.setValue(0.85);
      modalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, modalScale, modalOpacity]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: modalOpacity,
              transform: [{ scale: modalScale }],
            },
          ]}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{t('swipeUpModal.deleteConfirm.title')}</Text>
            <Text style={styles.message}>
              ¿Estás seguro que deseas eliminar &ldquo;{albumTitle}&rdquo; de tus descargas?
            </Text>
            
            <View style={styles.buttonContainer}>
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [{ scale: cancelButtonScale }],
                    opacity: cancelButtonOpacity,
                  },
                ]}
              >
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  onPressIn={handleCancelButtonPressIn}
                  onPressOut={handleCancelButtonPressOut}
                  android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.1)' } : undefined}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('swipeUpModal.deleteConfirm.cancel')}</Text>
                </Pressable>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [{ scale: confirmButtonScale }],
                    opacity: confirmButtonOpacity,
                  },
                ]}
              >
                <Pressable
                  style={[styles.button, styles.deleteButton]}
                  onPress={handleConfirm}
                  onPressIn={handleConfirmButtonPressIn}
                  onPressOut={handleConfirmButtonPressOut}
                  android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.1)' } : undefined}
                >
                  <Text style={[styles.buttonText, styles.deleteButtonText]}>{t('swipeUpModal.deleteConfirm.delete')}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContainer: {
    borderRadius: 20,
    width: '88%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2a1410',
  },
  content: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#fbefd9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  message: {
    fontSize: 15,
    color: 'rgba(251, 239, 217, 0.85)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  deleteButton: {
    backgroundColor: '#ff6b35',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  cancelButtonText: {
    color: '#fbefd9',
  },
  deleteButtonText: {
    color: '#ffffff',
  },
});
