import { useEffect } from 'react';
import TrackPlayer, { Event } from 'react-native-track-player';
import TrackPlayerService from '@/services/trackPlayerService';

interface SetupTrackPlayerProps {
  onNotificationTapped?: () => void;
}

export const useSetupTrackPlayer = ({ onNotificationTapped }: SetupTrackPlayerProps = {}) => {
  useEffect(() => {
    let isMounted = true;

    const setupAndListeners = async () => {
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
