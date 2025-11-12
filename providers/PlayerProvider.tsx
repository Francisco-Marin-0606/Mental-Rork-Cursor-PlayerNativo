import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';

export interface Track {
  id: string;
  title: string;
  subtitle?: string;
  trackUrl?: string;
  imageUrl?: string;
  vinillo?: string;
  color?: string;
  isHypnosis?: boolean;
  albumTitle?: string;
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

  const soundRef = useRef<Audio.Sound | null>(null);
  const playlist = useRef<Track[]>([]);
  const currentIndex = useRef<number>(0);
  const loadingAbortRef = useRef<boolean>(false);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const isTransitioning = useRef<boolean>(false);
  const loadingIdRef = useRef<number>(0);
  const nowPlayingUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const updateNowPlaying = useCallback(async (track: Track, sound: Audio.Sound, isPlaying: boolean) => {
    if (Platform.OS === 'web') return;
    
    try {
      const nowPlayingInfo: any = {
        title: track.title,
        artist: track.isHypnosis ? 'Mental' : (track.albumTitle || track.subtitle || 'Aura'),
      };

      if (track.imageUrl) {
        nowPlayingInfo.artwork = track.imageUrl;
      }

      const status = await sound.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded) {
        nowPlayingInfo.duration = status.durationMillis ? status.durationMillis / 1000 : undefined;
        nowPlayingInfo.currentTime = status.positionMillis ? status.positionMillis / 1000 : 0;
      }

      nowPlayingInfo.isPlaying = isPlaying;

      await sound.setNowPlayingAsync(nowPlayingInfo);
      console.log('[PlayerProvider] Updated now playing:', nowPlayingInfo);
    } catch (error) {
      console.log('[PlayerProvider] Error updating now playing:', error);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeAndroid: 1,
        interruptionModeIOS: 1,
      }).catch((e) => console.log('Audio.setAudioModeAsync error', e));
    }

    return () => {
      if (nowPlayingUpdateInterval.current) {
        clearInterval(nowPlayingUpdateInterval.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const playTrack = useCallback(async (track: Track, playlistTracks?: Track[], openUI: boolean = true) => {
    loadingIdRef.current += 1;
    const currentLoadingId = loadingIdRef.current;
    console.log(`[PlayTrack] Starting load for track ${track.id}, loadingId: ${currentLoadingId}`);

    const loadTrack = async () => {
      try {
        setIsLoading(true);
        loadingAbortRef.current = true;

        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
              await soundRef.current.stopAsync();
            }
            await soundRef.current.unloadAsync();
          } catch (e) {
            console.log('Error stopping/unloading previous sound:', e);
          }
          soundRef.current = null;
        }

        if (currentLoadingId !== loadingIdRef.current) {
          console.log(`[PlayTrack] Load aborted for track ${track.id}, newer request detected`);
          setIsLoading(false);
          return;
        }

        if (!track.trackUrl) {
          console.log('No track URL provided');
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

        console.log(`[PlayTrack] Creating audio for track ${track.id}, loadingId: ${currentLoadingId}`);
        const onStatusUpdate = (status: AVPlaybackStatus) => {
          if ('isLoaded' in status && status.isLoaded && currentLoadingId === loadingIdRef.current) {
            setIsPlaying(status.isPlaying);
          }
        };

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.trackUrl },
          { shouldPlay: true, isLooping: true },
          onStatusUpdate
        );

        await updateNowPlaying(track, sound, true);

        if (currentLoadingId !== loadingIdRef.current || loadingAbortRef.current) {
          console.log(`[PlayTrack] Track ${track.id} loading was aborted (newer request or manual abort), unloading sound`);
          await sound.unloadAsync();
          setIsLoading(false);
          return;
        }

        console.log(`[PlayTrack] Successfully loaded track ${track.id}, loadingId: ${currentLoadingId}`);
        soundRef.current = sound;
        await sound.playAsync();

        if (nowPlayingUpdateInterval.current) {
          clearInterval(nowPlayingUpdateInterval.current);
        }
        nowPlayingUpdateInterval.current = setInterval(() => {
          if (soundRef.current && current) {
            updateNowPlaying(current, soundRef.current, isPlaying).catch(() => {});
          }
        }, 5000);
      } catch (error) {
        console.log('Error playing track:', error);
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
      if (soundRef.current && current) {
        await soundRef.current.pauseAsync();
        await updateNowPlaying(current, soundRef.current, false);
        setIsPlaying(false);
        setUserPaused(true);
      }
    } catch (error) {
      console.log('Error pausing:', error);
    }
  }, [current, updateNowPlaying]);

  const pauseForExternalPlayer = useCallback(async () => {
    try {
      if (soundRef.current && current) {
        await soundRef.current.pauseAsync();
        await updateNowPlaying(current, soundRef.current, false);
        setIsPlaying(false);
        setUserPaused(true);
      }
    } catch (error) {
      console.log('Error pausing for external player:', error);
    }
  }, [current, updateNowPlaying]);

  const play = useCallback(async () => {
    try {
      if (soundRef.current && current) {
        await soundRef.current.playAsync();
        await updateNowPlaying(current, soundRef.current, true);
        setIsPlaying(true);
        setUserPaused(false);
      }
    } catch (error) {
      console.log('Error playing:', error);
    }
  }, [current, updateNowPlaying]);

  const next = useCallback(async () => {
    if (isTransitioning.current) {
      console.log('Transition already in progress, ignoring next()');
      return;
    }
    
    const loadNext = async () => {
      console.log('next() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('No playlist available');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error unloading during next():', e);
        }
        soundRef.current = null;
      }
      
      const newIndex = (currentIndex.current + 1) % playlist.current.length;
      console.log('Moving from index', currentIndex.current, 'to', newIndex);
      currentIndex.current = newIndex;
      const nextTrack = playlist.current[currentIndex.current];
      
      if (nextTrack) {
        console.log('Playing next track:', nextTrack.title);
        setPrevious(current);
        setChangeDirection('next');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!nextTrack.trackUrl) {
            console.log('No track URL for next track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(nextTrack);

          const { sound } = await Audio.Sound.createAsync(
            { uri: nextTrack.trackUrl },
            { shouldPlay: shouldPlay, isLooping: true }
          );

          if (loadingAbortRef.current) {
            console.log('Next track loading was aborted, unloading sound');
            await sound.unloadAsync();
            return;
          }

          soundRef.current = sound;
          setIsPlaying(shouldPlay);

          await updateNowPlaying(nextTrack, sound, shouldPlay);
          
          if (shouldPlay) {
            await sound.playAsync();
          }
        } catch (error) {
          console.log('Error playing next track:', error);
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
      console.log('Transition already in progress, ignoring prev()');
      return;
    }
    
    const loadPrev = async () => {
      console.log('prev() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('No playlist available');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error unloading during prev():', e);
        }
        soundRef.current = null;
      }
      
      const newIndex = (currentIndex.current - 1 + playlist.current.length) % playlist.current.length;
      console.log('Moving from index', currentIndex.current, 'to', newIndex);
      currentIndex.current = newIndex;
      const prevTrack = playlist.current[currentIndex.current];
      
      if (prevTrack) {
        console.log('Playing prev track:', prevTrack.title);
        setPrevious(current);
        setChangeDirection('prev');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!prevTrack.trackUrl) {
            console.log('No track URL for prev track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(prevTrack);

          const { sound } = await Audio.Sound.createAsync(
            { uri: prevTrack.trackUrl },
            { shouldPlay: shouldPlay, isLooping: true }
          );

          if (loadingAbortRef.current) {
            console.log('Prev track loading was aborted, unloading sound');
            await sound.unloadAsync();
            return;
          }

          soundRef.current = sound;
          setIsPlaying(shouldPlay);

          await updateNowPlaying(prevTrack, sound, shouldPlay);
          
          if (shouldPlay) {
            await sound.playAsync();
          }
        } catch (error) {
          console.log('Error playing prev track:', error);
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
      console.log('Transition already in progress, ignoring shuffle()');
      return;
    }
    
    const loadShuffle = async () => {
      console.log('shuffle() called, playlist length:', playlist.current.length);
      if (playlist.current.length === 0) {
        console.log('No playlist available');
        return;
      }
      
      isTransitioning.current = true;
      loadingAbortRef.current = true;
      
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('Error unloading during shuffle():', e);
        }
        soundRef.current = null;
      }
      
      const randomIndex = Math.floor(Math.random() * playlist.current.length);
      console.log('Playing random track at index:', randomIndex);
      currentIndex.current = randomIndex;
      const randomTrack = playlist.current[randomIndex];
      
      if (randomTrack) {
        console.log('Playing random track:', randomTrack.title);
        setPrevious(current);
        setChangeDirection('next');
        
        const shouldPlay = !userPaused;
        
        try {
          if (!randomTrack.trackUrl) {
            console.log('No track URL for random track');
            return;
          }

          loadingAbortRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, 16));
          
          setCurrent(randomTrack);

          const { sound } = await Audio.Sound.createAsync(
            { uri: randomTrack.trackUrl },
            { shouldPlay: shouldPlay, isLooping: true }
          );

          if (loadingAbortRef.current) {
            console.log('Shuffle track loading was aborted, unloading sound');
            await sound.unloadAsync();
            return;
          }

          soundRef.current = sound;
          setIsPlaying(shouldPlay);

          await updateNowPlaying(randomTrack, sound, shouldPlay);
          
          if (shouldPlay) {
            await sound.playAsync();
          }
        } catch (error) {
          console.log('Error playing random track:', error);
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
