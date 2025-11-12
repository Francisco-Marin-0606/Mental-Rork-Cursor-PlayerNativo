// Main layout configuration
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import * as SystemUI from "expo-system-ui";
import * as ScreenOrientation from "expo-screen-orientation";
import { StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserSessionProvider } from "@/providers/UserSession";
import { PlayerProvider } from "@/providers/PlayerProvider";
import GlobalPlayerOverlay from "@/components/GlobalPlayerOverlay";
import { AppVersionProvider, useAppVersionCheck } from "@/providers/AppVersionProvider";
import UpdateRequiredModal from "@/components/UpdateRequiredModal";
import "../config/i18n";
import * as Sentry from '@sentry/react-native';
import TrackPlayer from 'react-native-track-player';
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer';

TrackPlayer.registerPlaybackService(() => require('@/services/playerNotificationService'));

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
  useSetupTrackPlayer();

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
