import React, { useEffect, useState, createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

type OfflineBannerContextValue = {
  isOfflineBannerVisible: boolean;
  isOnline: boolean;
  setEligible: (eligible: boolean) => void;
  hasProvider: boolean;
};

const defaultContextValue: OfflineBannerContextValue = {
  isOfflineBannerVisible: false,
  isOnline: true,
  setEligible: () => {},
  hasProvider: false,
};

const OfflineBannerContext = createContext<OfflineBannerContextValue>(defaultContextValue);

export function useOfflineBanner() {
  return useContext(OfflineBannerContext);
}

export function OfflineBannerProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isEligible, setIsEligible] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  const setEligible = useCallback((eligible: boolean) => {
    setIsEligible(eligible);
  }, []);

  const value = useMemo<OfflineBannerContextValue>(() => ({
    isOfflineBannerVisible: !isOnline && isEligible,
    isOnline,
    setEligible,
    hasProvider: true,
  }), [isOnline, isEligible, setEligible]);

  return (
    <OfflineBannerContext.Provider value={value}>
      {children}
    </OfflineBannerContext.Provider>
  );
}

export default function OfflineBanner() {
  const { isOnline: providerIsOnline, setEligible, hasProvider } = useOfflineBanner();
  const [isLocalOnline, setIsLocalOnline] = useState<boolean>(true);

  useEffect(() => {
    if (!hasProvider) {
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsLocalOnline(state.isConnected ?? true);
      });

      return () => unsubscribe();
    }

    return undefined;
  }, [hasProvider]);

  useEffect(() => {
    if (!hasProvider) {
      return undefined;
    }

    setEligible(true);

    return () => {
      setEligible(false);
    };
  }, [hasProvider, setEligible]);

  const isOnline = hasProvider ? providerIsOnline : isLocalOnline;

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No tienes conexión a internet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    backgroundColor: '#c9841e',
    paddingVertical: 6,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
