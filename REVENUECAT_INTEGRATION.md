# RevenueCat Integration

## Overview
RevenueCat is integrated in your app to handle in-app purchases and subscriptions. The integration works in both **Expo Go (Preview Mode)** and **Development Builds**.

## Configuration

### SDK Initialization
The RevenueCat SDK is initialized in `app/_layout.tsx`:
- **iOS**: API Key `appl_JIgqffPngTJdriVoNIdXjDxZisc`
- **Android**: API Key `goog_NxdUftDeAYMdsAdqhvDiiNOZnKi`
- **Offering ID**: `ofrng328a4a1622`
- **Entitlement ID**: `pro`

### User Identification
When a user logs in, they are automatically identified in RevenueCat using their `userId` (see `providers/UserSession.tsx`). This allows you to:
- Track purchases per user
- Enable subscription sharing across devices
- View customer history in RevenueCat dashboard

## How It Works

### 1. Purchase Flow (Login Screen)
When a user taps "¿No tienes cuenta? Toca aquí para crear una":

1. Fetches available offerings from RevenueCat
2. Shows the native payment sheet
3. Processes the purchase
4. Checks for the `pro` entitlement
5. If successful, navigates to `/form`

**Code**: `app/login.tsx` lines 416-465

### 2. Subscription Status Checking
Use the `useRevenueCatSubscription()` hook anywhere in your app:

```typescript
import { useRevenueCatSubscription } from '@/lib/revenuecat-hooks';

function MyComponent() {
  const { isProActive, isLoading, hasProEntitlement } = useRevenueCatSubscription();
  
  if (isLoading) return <ActivityIndicator />;
  
  if (isProActive) {
    return <Text>Premium User</Text>;
  }
  
  return <Text>Free User</Text>;
}
```

### 3. Manual Subscription Check
For one-time checks (e.g., in a mutation):

```typescript
import { checkSubscriptionStatus } from '@/lib/revenuecat-hooks';

const status = await checkSubscriptionStatus();
if (status) {
  // User has active subscription
}
```

### 4. Restore Purchases
To restore previous purchases:

```typescript
import { restorePurchases } from '@/lib/revenuecat-hooks';

const { success, hasActiveSubscription } = await restorePurchases();
if (success && hasActiveSubscription) {
  // Purchases restored successfully
}
```

## Expo Go Preview Mode

When running in Expo Go:
- `react-native-purchases` automatically switches to **Preview API Mode**
- No real purchases are processed
- All API calls return mock data
- You can still test the integration flow without errors
- Perfect for rapid development and UI testing

**To test real purchases**, you must use a **Development Build**.

## Testing

### Test in Expo Go
```bash
npm start
```
- Scan QR code with Expo Go app
- Test the purchase flow (mock mode)
- Check console logs for RevenueCat debug output

### Test in Development Build
1. Build the app with EAS:
   ```bash
   eas build --profile development --platform ios
   # or
   eas build --profile development --platform android
   ```
2. Install on device
3. Test with Sandbox accounts (iOS) or Test accounts (Android)

## Important Notes

### Entitlements
- Your app checks for the `pro` entitlement
- Configure this in RevenueCat Dashboard → Entitlements
- Link the entitlement to your products

### User Session
- Users are logged into RevenueCat when they authenticate in your app
- The `userId` from your backend is used as the app user ID in RevenueCat
- This allows cross-device subscription access

### Debugging
All RevenueCat calls are logged with `[RevenueCat]` prefix:
- `[RevenueCat] Initializing...`
- `[RevenueCat] Configured for iOS/Android`
- `[RevenueCat] Fetching offerings...`
- `[RevenueCat] Purchase result:...`

Check the console for detailed debug information.

## Files Modified

1. **`app/_layout.tsx`** - SDK initialization
2. **`app/login.tsx`** - Purchase flow implementation
3. **`providers/UserSession.tsx`** - User identification in RevenueCat
4. **`lib/revenuecat-hooks.ts`** - Utility hooks for subscription checks

## Next Steps

To complete the integration:

1. **Configure RevenueCat Dashboard**:
   - Add your products (SKUs)
   - Create offerings
   - Link products to the `pro` entitlement

2. **Test the Flow**:
   - Run in Expo Go to test UI
   - Build dev client to test real purchases

3. **Add Restore Button** (Optional):
   ```typescript
   <Pressable onPress={async () => {
     const result = await restorePurchases();
     if (result.hasActiveSubscription) {
       Alert.alert('Success', 'Purchases restored!');
     }
   }}>
     <Text>Restore Purchases</Text>
   </Pressable>
   ```

4. **Add Subscription Management**:
   - Show subscription status in settings
   - Display expiration dates
   - Add cancel/manage subscription links

## Support

- **RevenueCat Docs**: https://docs.revenuecat.com
- **Dashboard**: https://app.revenuecat.com
- **Expo Go Limitations**: https://docs.revenuecat.com/docs/expo
