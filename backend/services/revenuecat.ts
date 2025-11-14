interface RevenueCatSubscription {
  id: string;
  externalId: string;
  customerId: string;
  provider: string;
  status: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface RevenueCatBadge {
  isActive: boolean;
  subscriptionStatus: string;
  startDate: string;
  endDate: string;
  planName?: string;
  amount?: number;
  currency?: string;
}

export async function getSubscriptionByCustomId(customId: string): Promise<RevenueCatSubscription | null> {
  try {
    const REVENUECAT_API_URL = process.env.REVENUECAT_API_URL || 'https://your-revenuecat-api.com';
    
    console.log('[RevenueCat Service] Fetching subscription for customId:', customId);
    
    const response = await fetch(`${REVENUECAT_API_URL}/subscriptions/${customId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[RevenueCat Service] Subscription not found for customId:', customId);
        return null;
      }
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as RevenueCatSubscription;
    console.log('[RevenueCat Service] Subscription data received:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('[RevenueCat Service] Error fetching subscription:', error);
    throw error;
  }
}

export function calculateBadge(subscription: RevenueCatSubscription | null): RevenueCatBadge {
  if (!subscription) {
    return {
      isActive: false,
      subscriptionStatus: 'inactive',
      startDate: '',
      endDate: '',
    };
  }

  const now = new Date();
  const startDate = new Date(subscription.startDate);
  const endDate = new Date(subscription.endDate);

  const isActive = now >= startDate && now <= endDate;

  return {
    isActive,
    subscriptionStatus: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    planName: subscription.planName,
    amount: subscription.amount,
    currency: subscription.currency,
  };
}

export async function getUserSubscriptionStatus(customId: string): Promise<RevenueCatBadge> {
  const subscription = await getSubscriptionByCustomId(customId);
  return calculateBadge(subscription);
}
