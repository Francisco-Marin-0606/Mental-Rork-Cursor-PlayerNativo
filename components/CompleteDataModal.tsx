import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  useWindowDimensions,
  Easing,
  Platform,
  TextInput,
  ScrollView,
  Keyboard,
  Alert,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BUTTON_STYLES } from '@/constants/buttonStyles';
import { useTranslation } from 'react-i18next';
import { useUpdateUser } from '@/lib/api-hooks';

interface CompleteDataModalProps {
  visible: boolean;
  onComplete: (data: UserData) => void;
  initialData?: Partial<UserData & { wantToBeCalled?: string; email?: string; userId?: string }>;
}

interface UserData {
  name: string;
  gender: 'Hombre' | 'Mujer';
  birthdate: string;
}

export default function CompleteDataModal({ visible, onComplete, initialData }: CompleteDataModalProps) {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const [name, setName] = useState<string>('');
  
  const handleNameChange = (text: string) => {
    const validText = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    const limitedText = validText.slice(0, 25);
    setName(limitedText);
  };
  const [gender, setGender] = useState<'Hombre' | 'Mujer'>('Hombre');
  const [birthdate, setBirthdate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date(2004, 9, 19));
  
  const datePickerSlideAnim = useRef(new Animated.Value(500)).current;
  const datePickerOpacityAnim = useRef(new Animated.Value(0)).current;

  const buttonAnimation = useRef({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
  }).current;

  const togglePosition = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(0)).current;
  const nameInputRef = useRef<View>(null);
  const hasShiftedRef = useRef<boolean>(false);
  
  const hombreOpacity = useRef(new Animated.Value(1)).current;
  const mujerOpacity = useRef(new Animated.Value(0.3)).current;

  const updateUser = useUpdateUser();

  const DURATION_OPEN = 400;
  const easeInOut = Easing.bezier(0.4, 0.0, 0.2, 1);
  const isAnimatingRef = useRef<boolean>(false);

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

  const isoToDisplay = useCallback((iso: string): string => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (_e) {
      return '';
    }
  }, []);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        const n = initialData.name ?? initialData.wantToBeCalled ?? '';
        const g = (initialData.gender ?? '') as string;
        const b = initialData.birthdate ?? '';
        if (n) setName(String(n));
        if (g) {
          const mapped = g.toLowerCase() === 'mujer' ? 'Mujer' : 'Hombre';
          setGender(mapped);
        }
        if (b) setBirthdate(isoToDisplay(String(b)) || String(b));
      }
      openModal();
    }
  }, [visible, openModal, initialData, isoToDisplay]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
    }
  }, [visible, translateY, opacity, screenHeight]);

  const displayToIsoUtc = useCallback((display: string): string => {
    const parts = display.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return '';
    const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00.000Z`;
    return iso;
  }, []);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    
    const trimmedName = name.trim();
    console.log('Completing data:', { name: trimmedName, gender, birthdate });

    const userId = initialData?.userId ?? '';
    if (!userId) {
      Alert.alert('Falta el usuario', 'No encontramos el usuario para actualizar los datos.');
      return;
    }

    try {
      const birthdateIso = displayToIsoUtc(birthdate) || birthdate;
      console.log('[CompleteDataModal] ===== UPDATING USER DATA =====');
      console.log('[CompleteDataModal] Gender selected in UI:', gender);
      console.log('[CompleteDataModal] Full update data:', { userId, wantToBeCalled: trimmedName, gender, birthdate: birthdateIso });
      
      const res = await updateUser.mutateAsync({
        userId,
        data: { wantToBeCalled: trimmedName, gender, birthdate: birthdateIso },
      });
      
      console.log('[CompleteDataModal] ===== UPDATE RESPONSE =====');
      console.log('[CompleteDataModal] Response gender:', res?.gender);
      console.log('[CompleteDataModal] Full response:', res);
      onComplete({ name: trimmedName, gender, birthdate: displayToIsoUtc(birthdate) || birthdate });
    } catch (err) {
      console.log('[CompleteDataModal] Update user error:', err);
      Alert.alert('Error', 'No se pudo actualizar. Inténtalo nuevamente.');
    }
  }, [name, gender, birthdate, onComplete, initialData?.userId, updateUser, displayToIsoUtc]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonAnimation.scale, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.timing(buttonAnimation.opacity, {
        toValue: 0.2,
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

  const handleGenderPress = async (selectedGender: 'Hombre' | 'Mujer') => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    console.log('[CompleteDataModal] Setting gender to:', selectedGender);
    setGender(selectedGender);
    
    Animated.parallel([
      Animated.timing(togglePosition, {
        toValue: selectedGender === 'Hombre' ? 0 : 1,
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(hombreOpacity, {
        toValue: selectedGender === 'Hombre' ? 1 : 0.3,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(mujerOpacity, {
        toValue: selectedGender === 'Mujer' ? 1 : 0.3,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      if (selectedDate) {
        const today = new Date();
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(today.getFullYear() - 3);
        
        if (selectedDate > threeYearsAgo) {
          Alert.alert(
            t('completeData.ageAlert.title'),
            t('completeData.ageAlert.message'),
            [{ text: t('completeData.ageAlert.button'), style: 'default' }]
          );
          return;
        }
      }
    }
    if (selectedDate) {
      setDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setBirthdate(`${day}/${month}/${year}`);
    }
  };

  const animateDatePickerIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(datePickerSlideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(datePickerOpacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [datePickerSlideAnim, datePickerOpacityAnim]);

  const animateDatePickerOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(datePickerSlideAnim, {
        toValue: 500,
        duration: 250,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(datePickerOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDatePicker(false);
    });
  }, [datePickerSlideAnim, datePickerOpacityAnim]);

  const handleDatePress = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  const handleDatePickerDone = async () => {
    const today = new Date();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(today.getFullYear() - 3);
    
    if (date > threeYearsAgo) {
      Alert.alert(
        t('completeData.ageAlert.title'),
        t('completeData.ageAlert.message'),
        [{ text: t('completeData.ageAlert.button'), style: 'default' }]
      );
      animateDatePickerOut();
      return;
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic feedback error:', error);
      }
    }
    animateDatePickerOut();
  };

  useEffect(() => {
    if (showDatePicker && Platform.OS === 'ios') {
      datePickerSlideAnim.setValue(500);
      datePickerOpacityAnim.setValue(0);
      animateDatePickerIn();
    }
  }, [showDatePicker, animateDatePickerIn, datePickerSlideAnim, datePickerOpacityAnim]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (!nameInputRef.current) return;
        const screenHeight = Dimensions.get('window').height;
        const keyboardTop = screenHeight - e.endCoordinates.height;
        setTimeout(() => {
          nameInputRef.current?.measureInWindow((x, y, width, height) => {
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

  const isFormValid = name.trim().length > 0 && birthdate.length > 0;

  if (!visible) return null;

  return (
    <View style={styles.overlay} testID="complete-data-overlay">
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="none" />
      
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: screenHeight,
            transform: [{ translateY }],
          },
        ]}
        testID="complete-data-container"
      >
        <View style={styles.content}>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none" />
          </TouchableWithoutFeedback>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
          >
            <Animated.View style={[styles.formContainer, { transform: [{ translateY: formTranslateY }] }]}>
                <Text style={styles.mainTitle}>{t('completeData.title')}</Text>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {t('completeData.infoText')}
                  </Text>
                </View>

                <View style={styles.fieldContainer} ref={nameInputRef} collapsable={false}>
                  <Text style={styles.label}>{t('completeData.preferredName')}</Text>
                  <Text style={styles.helperText}>
                    {t('completeData.preferredNameHelper')}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder={t('completeData.preferredNamePlaceholder')}
                    placeholderTextColor="rgba(251, 239, 217, 0.3)"
                    maxLength={25}
                    testID="name-input"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t('completeData.gender')}</Text>
                  <View style={styles.genderToggleWrapper}>
                    <Animated.View
                      style={[
                        styles.toggleSelector,
                        {
                          transform: [
                            {
                              translateX: togglePosition.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 133],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <View style={styles.genderContainer}>
                      <Pressable
                        style={styles.genderButton}
                        onPress={() => handleGenderPress('Hombre')}
                        testID="gender-hombre-button"
                      >
                        <Animated.Text
                          style={[
                            styles.genderButtonText,
                            { opacity: hombreOpacity },
                          ]}
                        >
                          {t('completeData.genderOptions.male')}
                        </Animated.Text>
                      </Pressable>

                      <Pressable
                        style={styles.genderButton}
                        onPress={() => handleGenderPress('Mujer')}
                        testID="gender-mujer-button"
                      >
                        <Animated.Text
                          style={[
                            styles.genderButtonText,
                            { opacity: mujerOpacity },
                          ]}
                        >
                          {t('completeData.genderOptions.female')}
                        </Animated.Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t('completeData.dateOfBirth')}</Text>
                  <Pressable onPress={handleDatePress} style={styles.dateInputWrapper}>
                    <View style={styles.dateInput} pointerEvents="none">
                      <Text style={[styles.inputText, !birthdate && styles.placeholderText]}>
                        {birthdate || t('completeData.datePlaceholder')}
                      </Text>
                    </View>
                  </Pressable>
                </View>


            </Animated.View>
          </ScrollView>

            {showDatePicker && Platform.OS === 'ios' && (
              <Pressable
                style={styles.datePickerOverlay}
                onPress={handleDatePickerDone}
                testID="date-picker-backdrop"
              >
                <Animated.View 
                  style={{
                    opacity: datePickerOpacityAnim,
                  }}
                >
                  <Pressable 
                    style={styles.datePickerPopup}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <Animated.View
                      style={[
                        styles.datePickerPopupContent,
                        {
                          transform: [{ translateY: datePickerSlideAnim }],
                        },
                      ]}
                    >
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={date}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        textColor="#fbefd9"
                        maximumDate={new Date()}
                      />
                      <View style={styles.datePickerFooter}>
                        <Pressable onPress={handleDatePickerDone}>
                          <Text style={styles.datePickerDoneText}>{t('completeData.confirmButton')}</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              </Pressable>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            <View style={styles.footer}>
              <Animated.View
                style={{
                  transform: [{ scale: buttonAnimation.scale }],
                  opacity: buttonAnimation.opacity,
                  width: '100%',
                }}
              >
                <Pressable
                  style={[
                    styles.completeButton,
                    (!isFormValid || updateUser.isPending) && styles.completeButtonDisabled,
                  ]}
                  onPress={handleComplete}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!isFormValid || updateUser.isPending}
                  android_ripple={Platform.OS === 'android' ? { color: 'transparent' } : undefined}
                  testID="complete-button"
                >
                  <Text style={[
                    styles.completeButtonText,
                    (!isFormValid || updateUser.isPending) && styles.completeButtonTextDisabled,
                  ]}>
                    {updateUser.isPending ? t('common.loading') : t('completeData.nextButton')}
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
    paddingTop: Platform.OS === 'android' ? 20 : 90,
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 180,
  },
  formContainer: {
    gap: 24,
    paddingHorizontal: 44,
  },
  mainTitle: {
    fontSize: Platform.OS === 'android' ? 38 : 37,
    fontWeight: Platform.OS === 'android' ? '600' : '700',
    color: '#fbefd9',
    lineHeight: Platform.OS === 'android' ? 40 : 42,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  infoBox: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(251, 239, 217, 0.3)',
    paddingLeft: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: Platform.OS === 'android' ? 15.2 : 16,
    color: 'rgba(251, 239, 217, 0.5)',
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: Platform.OS === 'android' ? 21.6 : 24,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: '#fbefd9',
    marginBottom: 8,
  },
  helperText: {
    fontSize: Platform.OS === 'android' ? 14.25 : 15,
    color: 'rgba(251, 239, 217, 0.6)',
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Platform.OS === 'android' ? 15.2 : 16,
    color: '#fbefd9',
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
  },
  genderToggleWrapper: {
    position: 'relative',
  },
  toggleSelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 121,
    height: 48,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    zIndex: 1,
    padding: 5,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
    zIndex: 2,
    width: 254,
    alignSelf: 'flex-start',
  },
  genderButton: {
    width: 121,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  genderButtonText: {
    fontSize: Platform.OS === 'android' ? 17.1 : 18,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 44,
    paddingTop: Platform.OS === 'android' ? 0 : 24,
    paddingBottom: Platform.OS === 'android' ? 0 : 55,
    backgroundColor: '#170501',
  },
  completeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 25,
    ...BUTTON_STYLES.elevatedShadow,
  },
  completeButtonDisabled: {
    backgroundColor: Platform.OS === 'android' ? '#433935' : 'rgba(255,255,255,0.08)',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  completeButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  inputText: {
    fontSize: Platform.OS === 'android' ? 15.2 : 16,
    color: '#fbefd9',
  },
  placeholderText: {
    color: 'rgba(251, 239, 217, 0.3)',
  },
  dateInputWrapper: {
    alignSelf: 'flex-start',
  },
  dateInput: {
    backgroundColor: 'rgba(251, 239, 217, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 239, 217, 0.2)',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  datePickerPopup: {
    width: '85%',
    maxWidth: 340,
  },
  datePickerPopupContent: {
    backgroundColor: '#2a1410',
    borderRadius: 16,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  datePickerDoneText: {
    fontSize: Platform.OS === 'android' ? 15.2 : 16,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: '#ff6b35',
  },
});
