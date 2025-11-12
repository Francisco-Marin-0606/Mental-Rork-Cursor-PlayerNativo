import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated, Easing, Platform, PanResponder } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Play, Shuffle, Download, ChevronLeft, ArrowDown, Check } from 'lucide-react-native';
import { usePlayer } from '@/providers/PlayerProvider';
import { useAuraHertz, useUser } from '@/lib/api-hooks';
import { useUserSession } from '@/providers/UserSession';
import { getAlbumById, replaceNameVariable } from '@/lib/aura-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlbumDownloadCompleteModal from '@/components/AlbumDownloadCompleteModal';
import DeleteAlbumModal from '@/components/DeleteAlbumModal';
import TrackNotDownloadedModal from '@/components/TrackNotDownloadedModal';
import DeleteTrackModal from '@/components/DeleteTrackModal';

const hapticSelection = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const hapticImpact = async (style: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS !== 'web') {
    try {
      if (style === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (style === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const { width: screenWidth } = Dimensions.get('window');

interface AuraDataAudio {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  vinillo?: string;
  colorBackground?: string;
  colorText?: string;
  frecuencia?: string;
  tracks?: {
    id: string;
    title: string;
    subtitle?: string;
    trackUrl?: string;
  }[];
}



export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const albumId = (Array.isArray(params.albumId) ? params.albumId[0] : params.albumId) ?? '';
  const animateEntryParam = (Array.isArray(params.animateEntry) ? params.animateEntry[0] : params.animateEntry) ?? '0';
  const { playTrack, current, isPlaying, isLoading: isPlayerLoading, uiOpen } = usePlayer();
  const { session } = useUserSession();
  const userQuery = useUser(session?.userId || '');
  const user = userQuery.data;
  const auraHertzQuery = useAuraHertz();
  const auraData = useMemo(() => auraHertzQuery.data || [], [auraHertzQuery.data]);
  
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadCompleted, setDownloadCompleted] = useState<Record<string, boolean>>({});
  const downloadTimeouts = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [isDownloadingAlbum, setIsDownloadingAlbum] = useState<boolean>(false);
  const [showAlbumDownloadModal, setShowAlbumDownloadModal] = useState<boolean>(false);
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState<boolean>(false);
  const [showTrackNotDownloadedModal, setShowTrackNotDownloadedModal] = useState<boolean>(false);
  const [showDeleteTrackModal, setShowDeleteTrackModal] = useState<boolean>(false);
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasLoadedDownloadedTracks, setHasLoadedDownloadedTracks] = useState<boolean>(false);

  useEffect(() => {
    const loadDownloadedTracks = async () => {
      try {
        const stored = await AsyncStorage.getItem('downloaded_tracks');
        if (stored) {
          const downloadedTracks = JSON.parse(stored);
          console.log('[Album] Loaded downloaded tracks:', downloadedTracks);
          setDownloadCompleted(downloadedTracks);
        }
      } catch (error) {
        console.log('[Album] Error loading downloaded tracks:', error);
      } finally {
        setHasLoadedDownloadedTracks(true);
      }
    };

    loadDownloadedTracks();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
      console.log('[Album] Network connected:', state.isConnected);
    });

    return () => {
      Object.values(downloadTimeouts.current).forEach(clearInterval);
      unsubscribe();
    };
  }, []);

  const userGender = useMemo(() => {
    const gender = user?.gender?.toLowerCase();
    return gender === 'woman' || gender === 'female' || gender === 'mujer' ? 'woman' : 'man';
  }, [user]);

  const album: AuraDataAudio | null = useMemo(() => {
    if (!albumId) return null;
    
    const realAlbum = getAlbumById(auraData, albumId, userGender);
    if (!realAlbum) return null;
    
    const colorBg = realAlbum.colorBackground;
    const colorTxt = realAlbum.colorText;
    const formattedBgColor = colorBg ? (colorBg.startsWith('#') ? colorBg : `#${colorBg}`) : undefined;
    const formattedTextColor = colorTxt ? (colorTxt.startsWith('#') ? colorTxt : `#${colorTxt}`) : undefined;
    return {
      ...realAlbum,
      title: replaceNameVariable(realAlbum.title, user?.names, user?.wantToBeCalled),
      description: replaceNameVariable(realAlbum.description, user?.names, user?.wantToBeCalled),
      colorBackground: formattedBgColor,
      colorText: formattedTextColor,
      tracks: realAlbum.tracks?.map(t => ({
        id: t.id,
        title: replaceNameVariable(t.title, user?.names, user?.wantToBeCalled),
        subtitle: replaceNameVariable(t.subtitle, user?.names, user?.wantToBeCalled),
        trackUrl: t.trackUrl,
      })),
    };
  }, [albumId, auraData, userGender, user]);

  const hasAnyDownloadedTrack = useMemo(() => {
    if (!album?.tracks || album.tracks.length === 0) return false;
    return album.tracks.some(track => downloadCompleted[track.id]);
  }, [album, downloadCompleted]);

  const shouldShowOffline = useMemo(() => {
    return !isConnected && hasAnyDownloadedTrack;
  }, [isConnected, hasAnyDownloadedTrack]);

  const isDataLoading = auraHertzQuery.isLoading || userQuery.isLoading || !album || !hasLoadedDownloadedTracks;
  const isSkeleton = isDataLoading && !shouldShowOffline;

  const saveDownloadedTrack = useCallback(async (trackId: string) => {
    try {
      const stored = await AsyncStorage.getItem('downloaded_tracks');
      const current = stored ? JSON.parse(stored) : {};
      current[trackId] = true;
      await AsyncStorage.setItem('downloaded_tracks', JSON.stringify(current));
      console.log('[Album] Saved track as downloaded:', trackId);
    } catch (error) {
      console.log('[Album] Error saving downloaded track:', error);
    }
  }, []);

  const startDownload = useCallback(async (trackId: string) => {
    await hapticSelection();
    
    if (downloadProgress[trackId] !== undefined || downloadCompleted[trackId]) {
      return;
    }
    
    setDownloadProgress(prev => ({ ...prev, [trackId]: 0 }));
    
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const current = prev[trackId] || 0;
        if (current >= 100) {
          clearInterval(interval);
          delete downloadTimeouts.current[trackId];
          setTimeout(async () => {
            setDownloadProgress(prevState => {
              const newState = { ...prevState };
              delete newState[trackId];
              return newState;
            });
            setDownloadCompleted(prevCompleted => ({ ...prevCompleted, [trackId]: true }));
            await saveDownloadedTrack(trackId);
            hapticImpact('medium');
          }, 300);
          return prev;
        }
        return { ...prev, [trackId]: Math.min(100, current + 1) };
      });
    }, 30);
    
    downloadTimeouts.current[trackId] = interval;
  }, [downloadProgress, downloadCompleted, saveDownloadedTrack]);

  const markAlbumAsDownloaded = useCallback(async (albumId: string) => {
    try {
      const stored = await AsyncStorage.getItem('downloaded_instrumentals');
      const current = stored ? JSON.parse(stored) : [];
      if (!current.includes(albumId)) {
        current.push(albumId);
        await AsyncStorage.setItem('downloaded_instrumentals', JSON.stringify(current));
        console.log('[Album] Marked as downloaded:', albumId);
      }
    } catch (error) {
      console.log('[Album] Error marking as downloaded:', error);
    }
  }, []);

  const isAlbumFullyDownloaded = useMemo(() => {
    if (!album?.tracks || album.tracks.length === 0) return false;
    return album.tracks.every(track => downloadCompleted[track.id]);
  }, [album, downloadCompleted]);

  const removeAlbumDownload = useCallback(async () => {
    try {
      if (!album?.tracks) return;
      
      const newCompleted = { ...downloadCompleted };
      album.tracks.forEach(track => {
        delete newCompleted[track.id];
      });
      setDownloadCompleted(newCompleted);
      
      const storedTracks = await AsyncStorage.getItem('downloaded_tracks');
      const currentTracks = storedTracks ? JSON.parse(storedTracks) : {};
      album.tracks.forEach(track => {
        delete currentTracks[track.id];
      });
      await AsyncStorage.setItem('downloaded_tracks', JSON.stringify(currentTracks));
      
      const stored = await AsyncStorage.getItem('downloaded_instrumentals');
      const current = stored ? JSON.parse(stored) : [];
      const filtered = current.filter((id: string) => id !== album.id);
      await AsyncStorage.setItem('downloaded_instrumentals', JSON.stringify(filtered));
      console.log('[Album] Removed from downloads:', album.id);
      
      await hapticImpact('medium');
    } catch (error) {
      console.log('[Album] Error removing download:', error);
    }
  }, [album, downloadCompleted]);

  const removeTrackDownload = useCallback(async (trackId: string) => {
    try {
      const newCompleted = { ...downloadCompleted };
      delete newCompleted[trackId];
      setDownloadCompleted(newCompleted);
      
      const storedTracks = await AsyncStorage.getItem('downloaded_tracks');
      const currentTracks = storedTracks ? JSON.parse(storedTracks) : {};
      delete currentTracks[trackId];
      await AsyncStorage.setItem('downloaded_tracks', JSON.stringify(currentTracks));
      console.log('[Album] Removed track from downloads:', trackId);
      
      await hapticImpact('medium');
    } catch (error) {
      console.log('[Album] Error removing track download:', error);
    }
  }, [downloadCompleted]);

  const downloadAlbum = useCallback(async () => {
    if (isDownloadingAlbum || !album?.tracks || album.tracks.length === 0) {
      return;
    }
    
    if (isAlbumFullyDownloaded) {
      await hapticSelection();
      setShowDeleteAlbumModal(true);
      return;
    }
    
    await hapticImpact('medium');
    setIsDownloadingAlbum(true);
    
    for (const track of album.tracks) {
      if (downloadCompleted[track.id]) {
        continue;
      }
      
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));
      
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          setDownloadProgress(prev => {
            const current = prev[track.id] || 0;
            if (current >= 100) {
              clearInterval(interval);
              delete downloadTimeouts.current[track.id];
              setTimeout(async () => {
                setDownloadProgress(prevState => {
                  const newState = { ...prevState };
                  delete newState[track.id];
                  return newState;
                });
                setDownloadCompleted(prevCompleted => ({ ...prevCompleted, [track.id]: true }));
                await saveDownloadedTrack(track.id);
                hapticImpact('light');
                resolve();
              }, 300);
              return prev;
            }
            return { ...prev, [track.id]: Math.min(100, current + 1) };
          });
        }, 30);
        
        downloadTimeouts.current[track.id] = interval;
      });
    }
    
    setIsDownloadingAlbum(false);
    await hapticImpact('heavy');
    
    if (album?.id) {
      await markAlbumAsDownloaded(album.id);
    }
    
    setShowAlbumDownloadModal(true);
  }, [isDownloadingAlbum, album, downloadCompleted, markAlbumAsDownloaded, isAlbumFullyDownloaded, saveDownloadedTrack]);
  
  const darkenColor = useCallback((hex: string, factor: number) => {
    try {
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    } catch {
      return hex;
    }
  }, []);
  
  const baseColor = album?.colorBackground || '#111827';
  const softColor = useMemo(() => darkenColor(baseColor, 0.5), [baseColor, darkenColor]);

  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSize = Math.floor(imageBase * 0.72);
  const coverOffset = Math.max(6, Math.floor(screenWidth * 0.09));
  const TEXT_SHIFT = Math.floor(screenWidth * 0.05);

  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const currentRotation = useRef(0);

  useEffect(() => {
    if (loopRef.current) {
      try {
        loopRef.current.stop();
      } catch {}
    }
    
    const isCurrentAlbumPlaying = current && album?.tracks?.some(t => t.id === current.id);
    
    if (isPlaying && isCurrentAlbumPlaying) {
      const startValue = currentRotation.current % 1;
      rotation.setValue(startValue);
      
      const listener = rotation.addListener(({ value }) => {
        currentRotation.current = value;
      });
      
      loopRef.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: startValue + 1000,
          duration: 6000000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
      
      return () => {
        rotation.removeListener(listener);
        if (loopRef.current) {
          try {
            loopRef.current.stop();
            loopRef.current = null;
          } catch {}
        }
      };
    }
  }, [rotation, isPlaying, current, album]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const entryTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const isExitingRef = useRef<boolean>(false);
  const swipeTranslateX = useRef(new Animated.Value(0)).current;

  const handleBack = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    await hapticSelection();
    router.back();
    setTimeout(() => { isExitingRef.current = false; }, 300);
  }, [router]);

  useEffect(() => {
    if (uiOpen) {
      handleBack();
    }
  }, [uiOpen, handleBack]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0;
    },
    onPanResponderGrant: () => {
      swipeTranslateX.setOffset(0);
      swipeTranslateX.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx > 0) {
        swipeTranslateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: async (_, gestureState) => {
      const threshold = screenWidth * 0.3;
      const velocity = gestureState.vx;
      
      if (gestureState.dx > threshold || velocity > 0.5) {
        if (Platform.OS !== 'web') {
          try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} 
        }
        Animated.timing(swipeTranslateX, {
          toValue: screenWidth,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          handleBack();
        });
      } else {
        Animated.spring(swipeTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(swipeTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    },
  }), [swipeTranslateX, handleBack]);

  useEffect(() => {
    const shouldAnimate = String(animateEntryParam) === '1';
    if (!shouldAnimate) {
      entryTranslateX.setValue(0);
      return;
    }
    
    entryTranslateX.stopAnimation(() => {
      entryTranslateX.setValue(screenWidth);
      Animated.timing(entryTranslateX, { 
        toValue: 0, 
        duration: 320, 
        easing: Easing.out(Easing.cubic), 
        useNativeDriver: true 
      }).start();
    });
  }, [entryTranslateX, animateEntryParam]);

  if (!album) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#170501', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fbefd9' }}>Álbum no encontrado</Text>
      </SafeAreaView>
    );
  }

  const SIDE_MARGIN = 0;

  return (
    <Animated.View 
      style={[styles.root, { transform: [{ translateX: entryTranslateX }, { translateX: swipeTranslateX }] }]} 
      testID="album-screen-root"
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={[softColor, softColor, '#170501']}
        locations={[0, 0.02, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1, padding: 10 }}>
        <View style={{ flex: 1, paddingLeft: SIDE_MARGIN, paddingRight: SIDE_MARGIN }}>
          <View style={styles.headerRow}>
            <TouchableOpacity accessibilityRole="button" testID="btn-back" style={{ padding: 8, marginLeft: -15 }} onPress={handleBack}>
              <ChevronLeft color="#fbefd9" size={28} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: 140,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <View style={{ width: imageSize, height: imageSize, marginLeft: -coverOffset }} testID="album-cover-container">
                <Animated.View
                  style={{ 
                    position: 'absolute', 
                    width: Math.floor(imageSize * 0.7), 
                    height: Math.floor(imageSize * 0.7), 
                    left: Math.floor(imageSize - (imageSize * 0.7) / 2), 
                    top: Math.floor((imageSize - (imageSize * 0.7)) / 2), 
                    transform: [{ rotate }] 
                  }}
                >
                  <Image 
                    source={{ uri: album.vinillo }} 
                    style={{ 
                      width: Math.floor(imageSize * 0.7), 
                      height: Math.floor(imageSize * 0.7)
                    }} 
                    contentFit="contain" 
                    cachePolicy="disk"
                  />
                </Animated.View>
                <Image 
                  source={{ uri: album.imageUrl }} 
                  style={{ width: imageSize, height: imageSize }} 
                  contentFit="cover" 
                  cachePolicy="disk"
                />
                <View
                  style={{
                    position: 'absolute',
                    width: Math.floor(imageSize * 0.7),
                    height: Math.floor(imageSize * 0.7),
                    left: Math.floor(imageSize - (imageSize * 0.7) / 2),
                    top: Math.floor((imageSize - (imageSize * 0.7)) / 2),
                    borderRadius: Math.floor((imageSize * 0.7) / 2),
                    overflow: 'hidden',
                    zIndex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: Math.floor((imageSize * 0.7) / 2),
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={[
                        'transparent',
                        'rgba(0, 0, 0, 0.6)',
                        'rgba(0, 0, 0, 0.3)',
                        'rgba(0, 0, 0, 0.1)',
                        'transparent',
                      ]}
                      start={{ x: 0.45, y: 0 }}
                      end={{ x: 0.7, y: 0 }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: Math.floor((imageSize * 0.7) / 2) + 2,
                      }}
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={2} testID="album-title">{album.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{album.frecuencia}</Text>
              <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                <TouchableOpacity
                  testID="btn-play"
                  accessibilityRole="button"
                  accessibilityLabel="Reproducir"
                  style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={async () => {
                    if (isPlayerLoading) return;
                    await hapticImpact('medium');
                    if (album.tracks && album.tracks.length > 0) {
                      const firstTrack = album.tracks[0];
                      if (firstTrack && firstTrack.trackUrl) {
                        const tracksForPlaylist = album.tracks.filter(t => t.trackUrl).map(t => ({
                          id: t.id,
                          title: t.title,
                          subtitle: t.subtitle || album.description,
                          trackUrl: t.trackUrl,
                          imageUrl: album.imageUrl,
                          vinillo: album.vinillo,
                          color: album.colorBackground,
                        }));
                        
                        await playTrack({
                          id: firstTrack.id,
                          title: firstTrack.title,
                          subtitle: firstTrack.subtitle || album.description,
                          trackUrl: firstTrack.trackUrl,
                          imageUrl: album.imageUrl,
                          vinillo: album.vinillo,
                          color: album.colorBackground,
                        }, tracksForPlaylist, false);
                      }
                    }
                  }}
                >
                  <Play color="#fbefd9" size={20} />
                  <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Reproducir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="btn-shuffle"
                  accessibilityRole="button"
                  accessibilityLabel="Aleatorio"
                  style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={async () => {
                    if (isPlayerLoading) return;
                    await hapticImpact('light');
                    if (album.tracks && album.tracks.length > 0) {
                      const tracksForPlaylist = album.tracks.filter(t => t.trackUrl).map(t => ({
                        id: t.id,
                        title: t.title,
                        subtitle: t.subtitle || album.description,
                        trackUrl: t.trackUrl,
                        imageUrl: album.imageUrl,
                        vinillo: album.vinillo,
                        color: album.colorBackground,
                      }));
                      
                      if (tracksForPlaylist.length > 0) {
                        const randomTrack = tracksForPlaylist[Math.floor(Math.random() * tracksForPlaylist.length)];
                        await playTrack(randomTrack, tracksForPlaylist, false);
                      }
                    }
                  }}
                >
                  <Shuffle color="#fbefd9" size={20} />
                  <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Aleatorio</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.downloadRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                <TouchableOpacity
                  testID="btn-download-album"
                  accessibilityRole="button"
                  accessibilityLabel={isAlbumFullyDownloaded ? "Álbum descargado" : "Descargar álbum"}
                  style={[styles.ctaBtn, { backgroundColor: 'rgba(255,255,255,0.12)', width: '100%', opacity: isDownloadingAlbum ? 0.5 : 1 }]}
                  onPress={downloadAlbum}
                  disabled={isDownloadingAlbum}
                >
                  {isAlbumFullyDownloaded ? (
                    <Check color="#ffffff" size={20} strokeWidth={2.5} />
                  ) : (
                    <Download color="#fbefd9" size={20} />
                  )}
                  <Text style={[styles.ctaText, styles.ctaTextWithIcon, isAlbumFullyDownloaded && { color: '#ffffff' }]}>
                    {isDownloadingAlbum ? 'Descargando...' : isAlbumFullyDownloaded ? 'Álbum descargado' : 'Descargar Álbum'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.listDivider} />
            {album.tracks?.map((t, idx) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.row,
                  { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN },
                ]}
                activeOpacity={0.8}
                onPress={async () => {
                  await hapticSelection();
                  
                  if (!isConnected && !downloadCompleted[t.id]) {
                    setShowTrackNotDownloadedModal(true);
                    return;
                  }
                  
                  if (t.trackUrl) {
                    const tracksForPlaylist = album.tracks!.filter(tr => tr.trackUrl).map(tr => ({
                      id: tr.id,
                      title: tr.title,
                      subtitle: tr.subtitle || album.description,
                      trackUrl: tr.trackUrl,
                      imageUrl: album.imageUrl,
                      vinillo: album.vinillo,
                      color: album.colorBackground,
                    }));
                    
                    await playTrack({
                      id: t.id,
                      title: t.title,
                      subtitle: t.subtitle || album.description,
                      trackUrl: t.trackUrl,
                      imageUrl: album.imageUrl,
                      vinillo: album.vinillo,
                      color: album.colorBackground,
                    }, tracksForPlaylist, false);
                  }
                }}
                testID={`track-row-${idx + 1}`}
              >
                <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                  <Text 
                    style={[
                      styles.rowTitle, 
                      { color: current?.id === t.id ? (album.colorText || '#fbefd9') : '#fbefd9' }
                    ]} 
                    numberOfLines={1}
                  >
                    {t.title}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>{t.subtitle}</Text>
                </View>
                {downloadProgress[t.id] !== undefined ? (
                  <View style={{ paddingHorizontal: 8, paddingRight: 21 }}>
                    <Text style={{ color: '#fbefd9', fontSize: 16, fontWeight: '600' as const }}>
                      {Math.round(downloadProgress[t.id])}%
                    </Text>
                  </View>
                ) : downloadCompleted[t.id] ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar descarga"
                    style={{
                      width: 23,
                      height: 23,
                      borderRadius: 11.5,
                      backgroundColor: '#c9841e',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 20,
                    }}
                    testID={`download-complete-${idx + 1}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      hapticSelection();
                      setTrackToDelete({ id: t.id, title: t.title });
                      setShowDeleteTrackModal(true);
                    }}
                  >
                    <ArrowDown color="#ffffff" size={13} strokeWidth={3} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Descargar pista"
                    style={{ padding: 8, paddingRight: 21 }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    testID={`btn-download-track-${idx + 1}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      startDownload(t.id);
                    }}
                  >
                    <Download color="#fbefd9" size={20} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {isSkeleton && album && (
          <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: softColor }} testID="album-skeleton">
            <LinearGradient
              colors={[softColor, softColor, '#170501']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1, padding: 10 }}>
              <View style={[styles.headerRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                <View style={styles.skelCircle} />
              </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: imageSize, height: imageSize, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: imageSize, height: imageSize, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8 }} />
                </View>
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.6), marginTop: 16 }]} />
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.4), height: 14, marginTop: 8 }]} />
                <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <View style={styles.skelBtn} />
                  <View style={styles.skelBtn} />
                </View>
              </View>
              <View style={styles.listDivider} />
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={`skel-${i}`} style={[styles.row, { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN }]}>
                  <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.5) }]} />
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.35), height: 12, marginTop: 8, opacity: 0.6 }]} />
                  </View>
                </View>
              ))}
            </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
      <AlbumDownloadCompleteModal
        visible={showAlbumDownloadModal}
        onClose={() => setShowAlbumDownloadModal(false)}
        albumTitle={album.title}
      />
      {showDeleteAlbumModal && (
        <DeleteAlbumModal
          visible={showDeleteAlbumModal}
          onClose={() => setShowDeleteAlbumModal(false)}
          onConfirm={async () => {
            await removeAlbumDownload();
            setShowDeleteAlbumModal(false);
          }}
          albumTitle={album.title}
        />
      )}
      <TrackNotDownloadedModal
        visible={showTrackNotDownloadedModal}
        onClose={() => setShowTrackNotDownloadedModal(false)}
      />
      {showDeleteTrackModal && trackToDelete && (
        <DeleteTrackModal
          visible={showDeleteTrackModal}
          onClose={() => {
            setShowDeleteTrackModal(false);
            setTrackToDelete(null);
          }}
          onConfirm={async () => {
            if (trackToDelete) {
              await removeTrackDownload(trackToDelete.id);
            }
            setShowDeleteTrackModal(false);
            setTrackToDelete(null);
          }}
          trackTitle={trackToDelete.title}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, zIndex: 0 },
  headerRow: { paddingHorizontal: 44, paddingTop: 6, paddingBottom: 8, alignItems: 'flex-start' },
  title: { color: '#fbefd9', fontSize: 24, fontWeight: '700' as const, marginTop: 16 },
  subtitle: { color: '#fbefd9', fontSize: 14, marginTop: 6, opacity: 0.6 },
  ctaRow: { flexDirection: 'row', gap: 10 as unknown as number, marginTop: 28, width: '100%', paddingHorizontal: 16 },
  ctaBtn: { paddingHorizontal: 19, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fbefd9', fontSize: 17, fontWeight: '600' as const },
  ctaFlex: { flex: 1 },
  ctaTextWithIcon: { marginLeft: 8 },
  listDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 18, marginBottom: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 16, fontWeight: '500' as const },
  rowSubtitle: { color: '#fbefd9', fontSize: 12, marginTop: 2, opacity: 0.6 },
  skelCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.01)' },
  skelLine: { height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.01)' },
  skelBtn: { height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.01)', flex: 1 },
  downloadRow: { width: '100%', marginTop: 12 },
});
