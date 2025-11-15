import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

export interface UserSessionData {
  userId: string;
  email: string;
  isMembershipActive?: boolean;
  subscriptionStatus?: string | null;
}

interface UserSessionState {
  session: UserSessionData | null;
  isHydrating: boolean;
  splashShown: boolean;
  yaDisponibleShown: boolean;
  setSession: (data: UserSessionData) => void;
  clearSession: () => void;
  markSplashShown: () => void;
  markYaDisponibleShown: () => void;
  updateMembershipStatus: (isActive: boolean, subscriptionStatus?: string | null) => void;
}

const STORAGE_KEY = '@app:user-session:v1';

export const [UserSessionProvider, useUserSession] = createContextHook<UserSessionState>(() => {
  const [session, setSessionState] = useState<UserSessionData | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [splashShown, setSplashShown] = useState<boolean>(false);
  const [yaDisponibleShown, setYaDisponibleShown] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as UserSessionData | null;
            if (parsed && typeof parsed.userId === 'string' && typeof parsed.email === 'string') {
              setSessionState(parsed);
            }
          } catch (e) {
            console.log('[UserSession] parse error', e);
          }
        }
      } catch (e) {
        console.log('[UserSession] hydrate error', e);
      } finally {
        if (mounted) setIsHydrating(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setSession = useCallback((data: UserSessionData) => {
    try {
      setSessionState(data);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => {
        console.log('[UserSession] persist error', e);
      });

      (async () => {
        try {
          console.log('[UserSession] Clearing Aura image cache and form cache on auth...');
          const keys = await AsyncStorage.getAllKeys();
          const auraCacheKeys = keys.filter(key => key.startsWith('aura_image_cache_'));
          const formCacheKeys = keys.filter(key => key.startsWith('form_cache_'));
          
          const keysToRemove = [...auraCacheKeys, ...formCacheKeys];
          
          if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
            console.log(`[UserSession] Cleared ${auraCacheKeys.length} Aura cache entries and ${formCacheKeys.length} form cache entries`);
          } else {
            console.log('[UserSession] No cache entries found to clear');
          }
        } catch (e) {
          console.log('[UserSession] Clear cache error', e);
        }
      })();

      if (Platform.OS !== 'web' && data.userId) {
        (async () => {
          try {
            console.log('[UserSession] Identifying user in RevenueCat:', data.userId);
            await Purchases.logIn(data.userId);
            console.log('[UserSession] User identified in RevenueCat');
          } catch (error) {
            console.log('[UserSession] RevenueCat login error:', error);
          }
        })();
      }
    } catch (e) {
      console.log('[UserSession] setSession error', e);
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      setSessionState(null);
      setSplashShown(false);
      setYaDisponibleShown(false);
      AsyncStorage.removeItem(STORAGE_KEY).catch((e) => {
        console.log('[UserSession] remove error', e);
      });
    } catch (e) {
      console.log('[UserSession] clearSession error', e);
    }
  }, []);

  const markSplashShown = useCallback(() => {
    setSplashShown(true);
  }, []);

  const markYaDisponibleShown = useCallback(() => {
    setYaDisponibleShown(true);
  }, []);

  const updateMembershipStatus = useCallback((isActive: boolean, subscriptionStatus?: string | null) => {
    setSessionState(prev => {
      if (!prev) return prev;
      const updated = { 
        ...prev, 
        isMembershipActive: isActive,
        subscriptionStatus: subscriptionStatus ?? prev.subscriptionStatus
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => {
        console.log('[UserSession] persist membership status error', e);
      });
      return updated;
    });
  }, []);

  return useMemo(() => ({ session, isHydrating, splashShown, yaDisponibleShown, setSession, clearSession, markSplashShown, markYaDisponibleShown, updateMembershipStatus }), [session, isHydrating, splashShown, yaDisponibleShown, setSession, clearSession, markSplashShown, markYaDisponibleShown, updateMembershipStatus]);
});
