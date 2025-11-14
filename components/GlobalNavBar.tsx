import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useUserSession } from '@/providers/UserSession';
import { useUser, useCheckMembershipStatus } from '@/lib/api-hooks';

export default function GlobalNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session, updateMembershipStatus } = useUserSession();
  const { data: userData } = useUser(session?.userId ?? '');
  const checkMembershipMutation = useCheckMembershipStatus();
  
  const isHipnosis = pathname === '/' || pathname === '/index';
  const isAura = pathname.startsWith('/aura');
  
  const shouldShow = (isHipnosis || isAura) && userData?.auraEnabled !== false;
  
  const handleNavPress = useCallback(async (section: 'hipnosis' | 'aura') => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }

    if (section === 'hipnosis' && !isHipnosis) {
      router.replace('/');
    } else if (section === 'aura' && !isAura) {
      router.replace('/aura');
    }
    
    if (session?.userId) {
      console.log('[GlobalNavBar] Checking membership status on tab change...');
      checkMembershipMutation.mutateAsync(session.userId)
        .then((result) => {
          updateMembershipStatus(result.isActive, result.subscriptionStatus);
          console.log('[GlobalNavBar] Membership status updated:', result.isActive, 'Subscription status:', result.subscriptionStatus);
        })
        .catch((error) => {
          console.log('[GlobalNavBar] Error checking membership:', error);
        });
    }
  }, [isHipnosis, isAura, router, session?.userId, checkMembershipMutation, updateMembershipStatus]);
  
  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[
      styles.footerNav,
      { paddingBottom: (Platform.OS === 'android' ? 4 : 6.5) + insets.bottom }
    ]}>
      <View style={styles.navToggleContainer}>
        <Pressable
          style={styles.navToggleOption}
          onPress={() => handleNavPress('hipnosis')}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(255,255,255,0.08)', borderless: true }
              : undefined
          }
          testID="nav-hipnosis"
          accessibilityLabel="Hipnosis"
        >
          <Text
            style={[
              styles.navToggleTextLabel,
              { opacity: isHipnosis ? 1 : 0.2 }
            ]}
          >
            Hipnosis
          </Text>
        </Pressable>
        <Pressable
          style={styles.navToggleOption}
          onPress={() => handleNavPress('aura')}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(255,255,255,0.08)', borderless: true }
              : undefined
          }
          testID="nav-aura"
          accessibilityLabel="Aura"
        >
          <Text
            style={[
              styles.navToggleTextLabel,
              { opacity: isAura ? 1 : 0.2 }
            ]}
          >
            Aura
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerNav: {
    backgroundColor: '#170501',
    paddingHorizontal: 44,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  navToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  navToggleOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  navToggleTextLabel: {
    color: '#fbefd9',
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});
