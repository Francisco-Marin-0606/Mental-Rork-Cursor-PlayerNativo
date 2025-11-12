import React, { useRef, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform, Linking, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { BUTTON_STYLES } from '@/constants/buttonStyles';

interface UpdateRequiredModalProps {
  visible: boolean;
}

export default function UpdateRequiredModal({ visible }: UpdateRequiredModalProps) {
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

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
  const handleUpdatePress = async () => {
    if (Platform.OS !== 'web') {
      try {
        const storeUrl = Platform.select({
          ios: 'itms-apps://itunes.apple.com/app/id6740008581',
          android: 'market://details?id=com.mentalmagnet.mentalMagnetApp',
        });
        
        if (storeUrl) {
          await Linking.openURL(storeUrl);
        }
      } catch (error) {
        console.error('[UpdateRequired] Error opening store:', error);
      }
    } else {
      console.log('[UpdateRequired] Update required on web');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} />
        
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.mainTitle}>Te estás perdiendo una mejor versión de esta app.</Text>
            
            <Text style={styles.subtitle}>(No, perdón, MUCHO mejor)</Text>
            
            <Text style={styles.description}>
              Dale a "actualizar" para seguir usando Mental.
            </Text>
            
            <Animated.View
              style={[
                styles.buttonContainer,
                {
                  transform: [{ scale: buttonScale }],
                  opacity: buttonOpacity,
                },
              ]}
            >
              <Pressable
                style={styles.updateButton}
                onPress={handleUpdatePress}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.08)' } : undefined}
              >
                <Text style={styles.updateButtonText}>Actualizar ahora</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 5, 1, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#4d1904',
    borderRadius: 24,
    paddingVertical: 48,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },
  content: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fbefd9',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.85)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(251, 239, 217, 0.85)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 36,
  },
  buttonContainer: {
    width: '100%',
  },
  updateButton: {
    ...BUTTON_STYLES.primaryButton,
    backgroundColor: '#ff6b35',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    ...BUTTON_STYLES.primaryButtonText,
    color: '#ffffff',
    textAlign: 'center',
  },
});
