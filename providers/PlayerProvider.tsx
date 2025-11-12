import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import TrackPlayer, { 
  Capability, 
  RepeatMode,
} from 'react-native-track-player';
import type { Track as RNTPTrack } from 'react-native-track-player';

export interface Track {
  id: string;
  title: string;
  subtitle?: string;
  trackUrl?: string;
  imageUrl?: string;
  vinillo?: string;
  color?: string;
  isHypnosis?: boolean;
}

interface PlayerContextType {
  current: Track | null;
  previous: Track | null;
  isPlaying: boolean;
  userPaused: boolean;
  changeDirection: 'none' | 'next' | 'prev';
  uiOpen: boolean;
  isLoading: boolean;
  setUIOpen: (open: boolean) => void;
  playTrack: (track: Track, playlistTracks?: Track[], openUI?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  shuffle: () => Promise<void>;
  pauseForExternalPlayer: () => Promise<void>;
}

let isTrackPlayerInitialized = false;

async function setupTrackPlayer() {
  if (isTrackPlayerInitialized) {
    console.log('[TrackPlayer] Already initialized');
    return;
  }

  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
    });
    
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    
    isTrackPlayerInitialized = true;
    console.log('[TrackPlayer] Service initialized');
  } catch (error) {
    console.log('[TrackPlayer] Error setting up:', error);
  }
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<Track | null>(null);
  const [previous, setPrevious] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userPaused, setUserPaused] = useState<boolean>(false);
  const [changeDirection, setChangeDirection] = useState<'none' | 'next' | 'prev'>('none');
  const [uiOpen, setUIOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const playlist = useRef<Track[]>([]);
  const currentIndex = useRef<number>(0);
  const loadingAbortRef = useRef<boolean>(false);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const isTransitioning = useRef<boolean>(false);
  const loadingIdRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setupTrackPlayer();
    }

    return () => {
      if (Platform.OS !== 'web') {
        TrackPlayer.reset().catch(console.log);
      }
    };
  }, []);

  const playTrack = useCallback(async (track: Track, playlistTracks?: Track[], openUI: boolean = true) => {
    loadingIdRef.current += 1;
    const currentLoadingId = loadingIdRef.current;
    console.log(`[TrackPlayer] Starting load for track ${track.id}, loadingId: ${currentLoadingId}`);

    const loadTrack = async () => {
      try {
        setIsLoading(true);
        loadingAbortRef.current = true;

        if (Platform.OS === 'web') {
          console.log('[TrackPlayer] Web platform not supported');
          setIsLoading(false);
          return;
        }

        if (currentLoadingId !== loadingIdRef.current) {
          console.log(`[TrackPlayer] Load aborted for track ${track.id}, newer request detected`);
          setIsLoading(false);
          return;
        }

        if (!track.trackUrl) {
          console.log('[TrackPlayer] No track URL provided');
          setIsLoading(false);
          return;
        }

        if (playlistTracks && playlistTracks.length > 0) {
          playlist.current = playlistTracks;
          const idx = playlistTracks.findIndex(t => t.id === track.id);
          if (idx !== -1) {
            currentIndex.current = idx;
          }
        } else if (playlist.current.length === 0) {
          playlist.current = [track];
          currentIndex.current = 0;
        }

        setPrevious(current);
        setCurrent(track);
        setChangeDirection('none');
        setUserPaused(false);
        setIsPlaying(true);
        
        if (openUI) {
          setUIOpen(true);
        }

        loadingAbortRef.current = false;

        console.log(`[TrackPlayer] Adding track ${track.id} to queue, loadingId: ${currentLoadingId}`);
        
        await TrackPlayer.reset();

        const trackPlayerTrack: RNTPTrack = {
          url: track.trackUrl,
          title: track.title,
          artist: track.isHypnosis ? 'Mental' : (track.subtitle || 'Aura Mental'),
          album: track.isHypnosis ? 'Hipnosis' : 'Aura Mental',
          artwork: track.imageUrl || undefined,
        };

        await TrackPlayer.add(trackPlayerTrack);
        
        console.log('[TrackPlayer] Set now playing info:', {
          title: track.title,
          artist: trackPlayerTrack.artist,
          album: trackPlayerTrack.album,
        });

        if (currentLoadingId !== loadingIdRef.current || loadingAbortRef.current) {
          console.log(`[TrackPlayer] Track ${track.id} loading was aborted (newer request or manual abort)`);
          await TrackPlayer.reset();
          setIsLoading(false);
          return;
        }

        console.log(`[TrackPlayer] Successfully loaded track ${track.id}, playing now`);
        await TrackPlayer.play();
      } catch (error) {
        console.log('[TrackPlayer] Error playing track:', error);
      } finally {
        if (currentLoadingId === loadingIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadingPromiseRef.current = loadTrack();
    await loadingPromiseRef.current;
  }, [current]);

  const pause = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await TrackPlayer.pause();
        setIsPlaying(false);
        setUserPaused(true);
        console.log('[TrackPlayer] Paused');
      }
    } catch (error) {
      console.log('[TrackPlayer] Error pausing:', error);
    }
  }, []);

  const pauseForExternalPlayer = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await TrackPlayer.pause();
        setIsPlaying(false);
        setUserPaused(true);
        console.log('[TrackPlayer] Paused for external player');
      }
    } catch (error) {
      console.log('[TrackPlayer] Error pausing for external player:', error);
    }
  }, []);

  const play = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await TrackPlayer.play();
        setIsPlaying(true);
        setUserPaused(false);
        console.log('[TrackPlayer] Playing');
      }
    } catch (error) {
      console.log('[TrackPlayer] Error playing:', error);
    }
  }, []);

  const next = useCallback(async () => {
    if (isTransitioning.current) {
      console.log('[TrackPlayer] Transition already in progress, ignoring next()');
      return;
    }
    
    const loadNext = async () => {
      console.log('[TrackPlayer] next() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('[TrackPlayer] No playlist available');
        return;
      }

      if (Platform.OS === 'web') {
        console.log('[TrackPlayer] Web platform not supported');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      const newIndex = (currentIndex.current + 1) % playlist.current.length;
      console.log('[TrackPlayer] Moving from index', currentIndex.current, 'to', newIndex);
      currentIndex.current = newIndex;
      const nextTrack = playlist.current[currentIndex.current];
      
      if (nextTrack) {
        console.log('[TrackPlayer] Playing next track:', nextTrack.title);
        setPrevious(current);
        setChangeDirection('next');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!nextTrack.trackUrl) {
            console.log('[TrackPlayer] No track URL for next track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(nextTrack);

          await TrackPlayer.reset();

          const trackPlayerTrack: RNTPTrack = {
            url: nextTrack.trackUrl,
            title: nextTrack.title,
            artist: nextTrack.isHypnosis ? 'Mental' : (nextTrack.subtitle || 'Aura Mental'),
            album: nextTrack.isHypnosis ? 'Hipnosis' : 'Aura Mental',
            artwork: nextTrack.imageUrl || undefined,
          };

          await TrackPlayer.add(trackPlayerTrack);

          if (loadingAbortRef.current) {
            console.log('[TrackPlayer] Next track loading was aborted');
            await TrackPlayer.reset();
            return;
          }

          setIsPlaying(shouldPlay);

          console.log('[TrackPlayer] Set now playing info:', {
            title: nextTrack.title,
            artist: trackPlayerTrack.artist,
            album: trackPlayerTrack.album,
          });
          
          if (shouldPlay) {
            await TrackPlayer.play();
          }
        } catch (error) {
          console.log('[TrackPlayer] Error playing next track:', error);
        } finally {
          isTransitioning.current = false;
        }
      }
    };

    loadingPromiseRef.current = loadNext();
    await loadingPromiseRef.current;
  }, [current, userPaused]);

  const prev = useCallback(async () => {
    if (isTransitioning.current) {
      console.log('[TrackPlayer] Transition already in progress, ignoring prev()');
      return;
    }
    
    const loadPrev = async () => {
      console.log('[TrackPlayer] prev() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('[TrackPlayer] No playlist available');
        return;
      }

      if (Platform.OS === 'web') {
        console.log('[TrackPlayer] Web platform not supported');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      const newIndex = (currentIndex.current - 1 + playlist.current.length) % playlist.current.length;
      console.log('[TrackPlayer] Moving from index', currentIndex.current, 'to', newIndex);
      currentIndex.current = newIndex;
      const prevTrack = playlist.current[currentIndex.current];
      
      if (prevTrack) {
        console.log('[TrackPlayer] Playing prev track:', prevTrack.title);
        setPrevious(current);
        setChangeDirection('prev');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!prevTrack.trackUrl) {
            console.log('[TrackPlayer] No track URL for prev track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(prevTrack);

          await TrackPlayer.reset();

          const trackPlayerTrack: RNTPTrack = {
            url: prevTrack.trackUrl,
            title: prevTrack.title,
            artist: prevTrack.isHypnosis ? 'Mental' : (prevTrack.subtitle || 'Aura Mental'),
            album: prevTrack.isHypnosis ? 'Hipnosis' : 'Aura Mental',
            artwork: prevTrack.imageUrl || undefined,
          };

          await TrackPlayer.add(trackPlayerTrack);

          if (loadingAbortRef.current) {
            console.log('[TrackPlayer] Prev track loading was aborted');
            await TrackPlayer.reset();
            return;
          }

          setIsPlaying(shouldPlay);

          console.log('[TrackPlayer] Set now playing info:', {
            title: prevTrack.title,
            artist: trackPlayerTrack.artist,
            album: trackPlayerTrack.album,
          });
          
          if (shouldPlay) {
            await TrackPlayer.play();
          }
        } catch (error) {
          console.log('[TrackPlayer] Error playing prev track:', error);
        } finally {
          isTransitioning.current = false;
        }
      }
    };

    loadingPromiseRef.current = loadPrev();
    await loadingPromiseRef.current;
  }, [current, userPaused]);

  const shuffle = useCallback(async () => {
    if (isTransitioning.current) {
      console.log('[TrackPlayer] Transition already in progress, ignoring shuffle()');
      return;
    }
    
    const loadShuffle = async () => {
      console.log('[TrackPlayer] shuffle() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('[TrackPlayer] No playlist available');
        return;
      }

      if (Platform.OS === 'web') {
        console.log('[TrackPlayer] Web platform not supported');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      const randomIndex = Math.floor(Math.random() * playlist.current.length);
      console.log('[TrackPlayer] Playing random track at index:', randomIndex);
      currentIndex.current = randomIndex;
      const randomTrack = playlist.current[randomIndex];
      
      if (randomTrack) {
        console.log('[TrackPlayer] Playing random track:', randomTrack.title);
        setPrevious(current);
        setChangeDirection('next');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!randomTrack.trackUrl) {
            console.log('[TrackPlayer] No track URL for random track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(randomTrack);

          await TrackPlayer.reset();

          const trackPlayerTrack: RNTPTrack = {
            url: randomTrack.trackUrl,
            title: randomTrack.title,
            artist: randomTrack.isHypnosis ? 'Mental' : (randomTrack.subtitle || 'Aura Mental'),
            album: randomTrack.isHypnosis ? 'Hipnosis' : 'Aura Mental',
            artwork: randomTrack.imageUrl || undefined,
          };

          await TrackPlayer.add(trackPlayerTrack);

          if (loadingAbortRef.current) {
            console.log('[TrackPlayer] Shuffle track loading was aborted');
            await TrackPlayer.reset();
            return;
          }

          setIsPlaying(shouldPlay);

          console.log('[TrackPlayer] Set now playing info:', {
            title: randomTrack.title,
            artist: trackPlayerTrack.artist,
            album: trackPlayerTrack.album,
          });
          
          if (shouldPlay) {
            await TrackPlayer.play();
          }
        } catch (error) {
          console.log('[TrackPlayer] Error playing random track:', error);
        } finally {
          isTransitioning.current = false;
        }
      }
    };

    loadingPromiseRef.current = loadShuffle();
    await loadingPromiseRef.current;
  }, [current, userPaused]);

  const value: PlayerContextType = {
    current,
    previous,
    isPlaying,
    userPaused,
    changeDirection,
    uiOpen,
    isLoading,
    setUIOpen,
    playTrack,
    pause,
    play,
    next,
    prev,
    shuffle,
    pauseForExternalPlayer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
