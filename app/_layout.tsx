// Main layout configuration
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import * as SystemUI from "expo-system-ui";
import * as ScreenOrientation from "expo-screen-orientation";
import { StyleSheet, Platform, Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserSessionProvider, useUserSession } from "@/providers/UserSession";
import { PlayerProvider } from "@/providers/PlayerProvider";
import GlobalPlayerOverlay from "@/components/GlobalPlayerOverlay";
import { AppVersionProvider, useAppVersionCheck } from "@/providers/AppVersionProvider";
import UpdateRequiredModal from "@/components/UpdateRequiredModal";
import "../config/i18n";
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Initialize Sentry
Sentry.init({
  dsn: 'https://d72aecc42dbdee91e8bccff7a748edf2@o4508667613151232.ingest.us.sentry.io/4510324338130944',
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // Adjust this value in production to reduce performance overhead
  tracesSampleRate: 1.0,
  // Enable debug mode in development
  debug: __DEV__,
  // Enable automatic session tracking
  enableAutoSessionTracking: true,
  // Track app start and navigation timing
  enableNative: true,
  enableNativeNagger: false,
});

// Only prevent auto hide on native platforms
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="login" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: 'transparent', animation: 'fade' }} />
      <Stack.Screen name="index" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: 'transparent', animation: 'none', gestureEnabled: false }} />
      <Stack.Screen name="form" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: 'transparent', animation: 'slide_from_right' }} />
      <Stack.Screen name="confirmation" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: 'transparent', animation: 'slide_from_right' }} />
      <Stack.Screen name="success" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: 'transparent', animation: 'fade' }} />
      <Stack.Screen name="aura" options={{ headerShown: false, statusBarTranslucent: true, statusBarBackgroundColor: '#000000', animation: 'none', gestureEnabled: false, presentation: 'card' }} />
    </Stack>
  );
}

function AppContent() {
  const { updateRequired } = useAppVersionCheck();
  const { session, isHydrating } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isHydrating) return;

    let OneSignal: any = null;
    let LogLevel: any = null;

    try {
      const oneSignalModule = require('react-native-onesignal');
      OneSignal = oneSignalModule.OneSignal;
      LogLevel = oneSignalModule.LogLevel;
    } catch (error) {
      console.log('[OneSignal] Module not available (Expo Go limitation):', error);
      return;
    }

    if (!OneSignal) return;

    try {
      console.log('[OneSignal] Initializing...');
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      
      const oneSignalAppId = Constants.expoConfig?.extra?.oneSignalAppId;
      if (oneSignalAppId) {
        OneSignal.initialize(oneSignalAppId);
        OneSignal.Notifications.requestPermission(true);
        console.log('[OneSignal] Initialized successfully');
      } else {
        console.log('[OneSignal] App ID not found in config');
      }

      if (session?.userId) {
        OneSignal.login(session.userId);
        console.log('[OneSignal] User logged in on app start:', session.userId);
      } else {
        console.log('[OneSignal] No session found on app start');
      }
    } catch (error) {
      console.log('[OneSignal] Initialization error:', error);
    }
  }, [isHydrating, session?.userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let OneSignal: any = null;
    try {
      OneSignal = require('react-native-onesignal').OneSignal;
    } catch (error) {
      return;
    }

    if (!OneSignal) return;

    if (session?.userId) {
      try {
        OneSignal.login(session.userId);
        console.log('[OneSignal] User logged in:', session.userId);
      } catch (error) {
        console.log('[OneSignal] Login error:', error);
      }
    } else {
      try {
        OneSignal.logout();
        console.log('[OneSignal] User logged out');
      } catch (error) {
        console.log('[OneSignal] Logout error:', error);
      }
    }
  }, [session?.userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let OneSignal: any = null;
    try {
      OneSignal = require('react-native-onesignal').OneSignal;
    } catch (error) {
      return;
    }

    if (!OneSignal) return;

    const notificationClickHandler = (event: any) => {
      console.log('[OneSignal] Notification clicked:', event);
      
      if (event.notification.additionalData) {
        const additionalData = event.notification.additionalData;
        console.log('[OneSignal] Additional data:', additionalData);

        if (additionalData.route) {
          router.replace(additionalData.route as any);
        }
      }
    };

    try {
      OneSignal.Notifications.addEventListener('click', notificationClickHandler);
      console.log('[OneSignal] Click listener registered');

      return () => {
        try {
          OneSignal.Notifications.removeEventListener('click', notificationClickHandler);
        } catch (error) {
          console.log('[OneSignal] Remove listener error:', error);
        }
      };
    } catch (error) {
      console.log('[OneSignal] Add listener error:', error);
    }
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[Deep Link] URL received:', url);
      const parsed = Linking.parse(url);
      
      if (parsed.hostname === 'notification') {
        console.log('[Deep Link] Notification deep link:', parsed);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[Deep Link] Initial URL:', url);
        const parsed = Linking.parse(url);
        
        if (parsed.hostname === 'notification') {
          console.log('[Deep Link] Initial notification deep link:', parsed);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <RootLayoutNav />
      <GlobalPlayerOverlay />
      <UpdateRequiredModal visible={updateRequired} />
    </>
  );
}

function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (Platform.OS !== 'web') {
          await SystemUI.setBackgroundColorAsync("transparent").catch((e) => console.log("SystemUI error", e));
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.log('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.flex} testID="gesture-root">
        <AppVersionProvider>
          <UserSessionProvider>
            <PlayerProvider>
              <AppContent />
            </PlayerProvider>
          </UserSessionProvider>
        </AppVersionProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default Sentry.wrap(RootLayout);
