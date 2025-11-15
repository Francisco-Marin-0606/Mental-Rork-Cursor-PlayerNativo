import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';

export function useRevenueCatSubscription() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const fetchCustomerInfo = async () => {
      try {
        console.log('[RevenueCat] Fetching customer info...');
        const info = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info fetched:', JSON.stringify(info, null, 2));
        setCustomerInfo(info);
        setError(null);
      } catch (err) {
        console.log('[RevenueCat] Error fetching customer info:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerInfo();

    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      console.log('[RevenueCat] Customer info updated:', JSON.stringify(info, null, 2));
      setCustomerInfo(info);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const hasProEntitlement = customerInfo?.entitlements.active['Mental'] !== undefined;
  const isProActive = hasProEntitlement && customerInfo?.entitlements.active['Mental']?.isActive === true;

  return {
    customerInfo,
    isLoading,
    error,
    hasProEntitlement,
    isProActive,
    entitlements: customerInfo?.entitlements.active ?? {},
  };
}

export async function checkSubscriptionStatus(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[RevenueCat] Web platform, skipping subscription check');
    return false;
  }

  try {
    console.log('[RevenueCat] Checking subscription status...');
    const customerInfo = await Purchases.getCustomerInfo();
    const hasProEntitlement = typeof customerInfo.entitlements.active['Mental'] !== 'undefined';
    const isActive = hasProEntitlement && customerInfo.entitlements.active['Mental']?.isActive === true;
    console.log('[RevenueCat] Subscription status:', { hasProEntitlement, isActive });
    return isActive;
  } catch (error) {
    console.log('[RevenueCat] Error checking subscription:', error);
    return false;
  }
}

export async function restorePurchases(): Promise<{ success: boolean; hasActiveSubscription: boolean }> {
  if (Platform.OS === 'web') {
    console.log('[RevenueCat] Web platform, cannot restore purchases');
    return { success: false, hasActiveSubscription: false };
  }

  try {
    console.log('[RevenueCat] Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    console.log('[RevenueCat] Restore result:', JSON.stringify(customerInfo, null, 2));
    
    const hasProEntitlement = typeof customerInfo.entitlements.active['Mental'] !== 'undefined';
    const isActive = hasProEntitlement && customerInfo.entitlements.active['Mental']?.isActive === true;
    
    console.log('[RevenueCat] Restore completed:', { hasProEntitlement, isActive });
    return { success: true, hasActiveSubscription: isActive };
  } catch (error) {
    console.log('[RevenueCat] Error restoring purchases:', error);
    return { success: false, hasActiveSubscription: false };
  }
}
