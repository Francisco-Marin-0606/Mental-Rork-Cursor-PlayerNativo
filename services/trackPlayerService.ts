import TrackPlayer, { 
  Capability, 
  RepeatMode, 
  AppKilledPlaybackBehavior 
} from 'react-native-track-player';

class TrackPlayerService {
  private static instance: TrackPlayerService;
  private isSetup: boolean = false;

  private constructor() {}

  public static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  public async setupPlayer(): Promise<boolean> {
    if (this.isSetup) {
      console.log('[TrackPlayerService] Already setup');
      return true;
    }

    try {
      await TrackPlayer.setupPlayer({
        maxCacheSize: 1024 * 10,
        autoHandleInterruptions: true,
      });

      await TrackPlayer.setVolume(1);
      await TrackPlayer.setRepeatMode(RepeatMode.Off);

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1,
      });

      this.isSetup = true;
      console.log('[TrackPlayerService] Setup complete');
      return true;
    } catch (error) {
      console.log('[TrackPlayerService] Setup error:', error);
      return false;
    }
  }

  public isPlayerSetup(): boolean {
    return this.isSetup;
  }
}

export default TrackPlayerService;
