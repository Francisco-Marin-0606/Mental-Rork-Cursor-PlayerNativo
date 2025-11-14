import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import { useUserSession } from '@/providers/UserSession';

const REVENUECAT_API_KEY_IOS = 'appl_JIgqffPngTJdriVoNIdXjDxZisc';
const REVENUECAT_API_KEY_ANDROID = 'goog_NxdUftDeAYMdsAdqhvDiiNOZnKi';
const ENTITLEMENT_ID = 'Mental';

interface RevenueCatContextType {
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPro: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo; success: boolean }>;
  restorePurchases: () => Promise<{ customerInfo: CustomerInfo; success: boolean }>;
  getProducts: () => PurchasesStoreProduct[];
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
}

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const { session } = useUserSession();
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[RevenueCat] Web platform detected, skipping initialization');
      setIsLoading(false);
      return;
    }

    const initializeRevenueCat = async () => {
      try {
        console.log('[RevenueCat] Initializing...');
        
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.select({
          ios: REVENUECAT_API_KEY_IOS,
          android: REVENUECAT_API_KEY_ANDROID,
        });

        if (!apiKey) {
          throw new Error('No RevenueCat API key for this platform');
        }

        Purchases.configure({ apiKey });
        console.log('[RevenueCat] Configured with API key');

        if (session?.userId) {
          await Purchases.logIn(session.userId);
          console.log('[RevenueCat] Logged in user:', session.userId);
        }

        const customerInfo = await Purchases.getCustomerInfo();
        setCustomerInfo(customerInfo);
        setIsPro(customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
        console.log('[RevenueCat] Customer info loaded, isPro:', customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);

        const offerings = await Purchases.getOfferings();
        setOfferings(offerings);
        console.log('[RevenueCat] Offerings loaded:', offerings.current?.availablePackages.length);

        setIsLoading(false);
      } catch (error) {
        console.error('[RevenueCat] Initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [session?.userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((info) => {
      console.log('[RevenueCat] Customer info updated');
      setCustomerInfo(info);
      setIsPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
    });

    return () => {
      customerInfoUpdateListener.remove();
    };
  }, []);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo; success: boolean }> => {
    try {
      console.log('[RevenueCat] Starting purchase:', pkg.identifier);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);
      setIsPro(customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
      console.log('[RevenueCat] Purchase successful');
      return { customerInfo, success: true };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('[RevenueCat] Purchase cancelled by user');
      } else {
        console.error('[RevenueCat] Purchase error:', error);
      }
      throw error;
    }
  };

  const restorePurchases = async (): Promise<{ customerInfo: CustomerInfo; success: boolean }> => {
    try {
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);
      setIsPro(customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
      console.log('[RevenueCat] Purchases restored');
      return { customerInfo, success: true };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      throw error;
    }
  };

  const getProducts = (): PurchasesStoreProduct[] => {
    if (!offerings?.current) return [];
    return offerings.current.availablePackages.map((pkg) => pkg.product);
  };

  const value: RevenueCatContextType = {
    offerings,
    customerInfo,
    isLoading,
    isPro,
    purchasePackage,
    restorePurchases,
    getProducts,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}
