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


interface AlbumDownloadCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  albumTitle: string;
}

export default function AlbumDownloadCompleteModal({ visible, onClose, albumTitle }: AlbumDownloadCompleteModalProps) {
  const { t } = useTranslation();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const handleAccept = useCallback(async () => {
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

  const handleButtonPressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScale, buttonOpacity]);

  const handleButtonPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScale, buttonOpacity]);

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
      onRequestClose={handleAccept}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleAccept} />
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
            <Text style={styles.title}>{t('albumDownloadComplete.title')}</Text>
            <Text style={styles.message}>
              {t('albumDownloadComplete.message', { albumTitle })}
            </Text>
            
            <Animated.View
              style={{
                transform: [{ scale: buttonScale }],
                opacity: buttonOpacity,
              }}
            >
              <Pressable
                style={styles.button}
                onPress={handleAccept}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.1)' } : undefined}
              >
                <Text style={styles.buttonText}>{t('albumDownloadComplete.button')}</Text>
              </Pressable>
            </Animated.View>
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
    zIndex: 4000,
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
  button: {
    paddingVertical: 16,
    backgroundColor: '#ff6b35',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});
