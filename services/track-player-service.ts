import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[TrackPlayer Service] Remote Play');
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[TrackPlayer Service] Remote Pause');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[TrackPlayer Service] Remote Next');
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[TrackPlayer Service] Remote Previous');
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[TrackPlayer Service] Remote Seek to:', event.position);
    TrackPlayer.seekTo(event.position);
  });
}
