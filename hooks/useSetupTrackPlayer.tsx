import { useEffect } from 'react';
import { Platform } from 'react-native';
import TrackPlayerService from '@/services/trackPlayerService';

interface SetupTrackPlayerProps {
  onNotificationTapped?: () => void;
}

export const useSetupTrackPlayer = ({ onNotificationTapped }: SetupTrackPlayerProps = {}) => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[useSetupTrackPlayer] Skipping on web');
      return;
    }

    let isMounted = true;

    const setupAndListeners = async () => {
      const TrackPlayer = require('react-native-track-player').default;
      const { Event } = require('react-native-track-player');

      const service = TrackPlayerService.getInstance();
      await service.setupPlayer();

      if (!isMounted) return;

      const notificationSubscription = TrackPlayer.addEventListener(
        Event.RemoteJumpForward,
        () => {
          console.log('[useSetupTrackPlayer] Notification tapped');
          onNotificationTapped?.();
        }
      );

      return () => {
        notificationSubscription.remove();
      };
    };

    const cleanup = setupAndListeners();

    return () => {
      isMounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, [onNotificationTapped]);
};
