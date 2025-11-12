import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import { useTranslation } from 'react-i18next';
import {
	StyleSheet,
  Text,
  View,
  ScrollView,
	Dimensions,
  LayoutChangeEvent,
  TouchableOpacity,
  Animated,
	Easing,
  Platform,
  Pressable,
} from "react-native";
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import { useUserSession } from '@/providers/UserSession';
import { usePlayer } from '@/providers/PlayerProvider';
import { useAuraHertz, useUser, useCheckMembershipStatus } from '@/lib/api-hooks';
import { replaceNameVariable } from '@/lib/aura-utils';

import * as Haptics from 'expo-haptics';
import { Settings } from 'lucide-react-native';

import { SettingsModalContext } from './_layout';
import GlobalNavBar from '@/components/GlobalNavBar';
import OfflineBanner, { useOfflineBanner } from '@/components/OfflineBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

const hapticSelection = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.log('Haptic feedback error:', e);
    }
  }
};

const CACHE_EXPIRATION_DAYS = 7;
const IMAGE_CACHE_KEY_PREFIX = 'aura_image_cache_';

const getImageCacheKey = (url: string): string => {
  return `${IMAGE_CACHE_KEY_PREFIX}${url}`;
};

const shouldRefreshCache = async (url: string): Promise<boolean> => {
  try {
    const cacheKey = getImageCacheKey(url);
    const cachedDate = await AsyncStorage.getItem(cacheKey);
    
    if (!cachedDate) {
      return true;
    }
    
    const cachedTimestamp = parseInt(cachedDate, 10);
    const currentTimestamp = Date.now();
    const daysPassed = (currentTimestamp - cachedTimestamp) / (1000 * 60 * 60 * 24);
    
    console.log(`Cache check for image: ${url.substring(0, 50)}... Days passed: ${daysPassed.toFixed(2)}`);
    
    return daysPassed >= CACHE_EXPIRATION_DAYS;
  } catch (error) {
    console.log('Error checking cache:', error);
    return true;
  }
};

const markImageAsCached = async (url: string): Promise<void> => {
  try {
    const cacheKey = getImageCacheKey(url);
    const currentTimestamp = Date.now().toString();
    await AsyncStorage.setItem(cacheKey, currentTimestamp);
    console.log(`Image cached: ${url.substring(0, 50)}...`);
  } catch (error) {
    console.log('Error marking image as cached:', error);
  }
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = Math.round(screenWidth * 0.72 * 0.8);
const LEFT_PADDING = 40;
const ITEM_SPACING = 72;
const END_PADDING = Math.max(0, Math.floor(screenWidth - LEFT_PADDING - CARD_WIDTH));

interface AuraDataAudio {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  vinillo?: string;
  trackUrl?: string;
  colorBackground?: string;
  color?: string;
  tracks?: {
    trackUrl?: string;
    title?: string;
  }[];
}

type AlbumCardProps = { 
  album: AuraDataAudio; 
  imageSize: number; 
  onPress?: (a: AuraDataAudio) => void; 
  skeleton?: boolean 
};



const CoverWithVinyl = React.memo<{ 
  imageSize: number; 
  spinActive?: boolean; 
  vinylUrl?: string; 
  coverUrl?: string; 
  albumId?: string;
}>(function CoverWithVinyl({ imageSize, spinActive, vinylUrl, coverUrl }) {
  const [coverCachePolicy, setCoverCachePolicy] = useState<'disk' | 'memory-disk'>('memory-disk');
  const [vinylCachePolicy, setVinylCachePolicy] = useState<'disk' | 'memory-disk'>('memory-disk');
  const cacheCheckDone = useRef<boolean>(false);

  useEffect(() => {
    if (cacheCheckDone.current) return;
    cacheCheckDone.current = true;

    const checkCache = async () => {
      if (coverUrl) {
        const shouldRefreshCover = await shouldRefreshCache(coverUrl);
        setCoverCachePolicy(shouldRefreshCover ? 'memory-disk' : 'disk');
      }
      
      if (vinylUrl) {
        const shouldRefreshVinyl = await shouldRefreshCache(vinylUrl);
        setVinylCachePolicy(shouldRefreshVinyl ? 'memory-disk' : 'disk');
      }
    };

    checkCache();
  }, [coverUrl, vinylUrl]);
  const vinylSize = useMemo(() => {
    const size = Math.floor(imageSize * 0.7);
    return size;
  }, [imageSize]);
  const vinylLeft = useMemo(() => {
    const left = Math.floor(imageSize - vinylSize / 2);
    return left;
  }, [imageSize, vinylSize]);
  const vinylTop = useMemo(() => {
    const t = Math.floor((imageSize - vinylSize) / 2);
    return t;
  }, [imageSize, vinylSize]);

  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const currentRotation = useRef(0);

  const listenerRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (loopRef.current) {
      try {
        loopRef.current.stop();
      } catch {}
      loopRef.current = null;
    }
    
    if (listenerRef.current) {
      try {
        rotation.removeListener(listenerRef.current);
      } catch {}
      listenerRef.current = null;
    }
    
    if (spinActive) {
      const startValue = currentRotation.current % 1;
      try {
        rotation.stopAnimation();
        rotation.setValue(startValue);
      } catch {}
      
      listenerRef.current = rotation.addListener(({ value }) => {
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
    }
    
    return () => {
      if (listenerRef.current) {
        try {
          rotation.removeListener(listenerRef.current);
        } catch {}
        listenerRef.current = null;
      }
      if (loopRef.current) {
        try {
          loopRef.current.stop();
        } catch {}
        loopRef.current = null;
      }
      try {
        rotation.stopAnimation();
      } catch {}
    };
  }, [spinActive, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ position: "relative" as const, width: imageSize, height: imageSize }}>
      <Animated.View
        style={{ position: "absolute" as const, width: vinylSize, height: vinylSize, left: vinylLeft, top: vinylTop, transform: [{ rotate }] }}
      >
        <Image
          source={{
            uri: vinylUrl || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinillo/Expansio%CC%81n%20Matutina.png',
          }}
          style={{ width: vinylSize, height: vinylSize }}
          contentFit="contain"
          cachePolicy={vinylCachePolicy}
          testID={`vinyl-bg`}
          transition={0}
          onLoad={async () => {
            if (vinylUrl) {
              await markImageAsCached(vinylUrl);
            }
          }}
        />
      </Animated.View>
      
      <View
        style={{
          position: "absolute" as const,
          width: vinylSize,
          height: vinylSize,
          left: vinylLeft,
          top: vinylTop,
          borderRadius: vinylSize / 2,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <View
          style={{
            width: "99%",
            height: "100%",
            borderRadius: vinylSize / 2,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(0, 0, 0, 0.6)",
              "rgba(0, 0, 0, 0.3)",
              "rgba(0, 0, 0, 0.1)",
              "transparent"
            ]}
            start={{ x: 0.45, y: 0 }}
            end={{ x: 0.7, y: 0 }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: vinylSize / 2,
            }}
          />
        </View>
      </View>
      
      <View style={{ width: imageSize, height: imageSize, zIndex: 2 }}>
        <Image
          source={{
            uri: coverUrl || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers/Expansio%CC%81n%20Matutina.png',
          }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy={coverCachePolicy}
          accessible
          accessibilityLabel={`Imagen del álbum`}
          transition={0}
          onLoad={async () => {
            if (coverUrl) {
              await markImageAsCached(coverUrl);
            }
          }}
        />
      </View>
    </View>
  );
});

const AlbumCard = React.memo<AlbumCardProps>(function AlbumCard({ album, imageSize, onPress }) {
  const { current, isPlaying } = usePlayer();

  const isAlbumPlaying = useMemo(() => {
    if (!current || !isPlaying) return false;
    return current.id === album.id || current.id.startsWith(`${album.id}-`);
  }, [current, isPlaying, album.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={async () => { 
        await hapticSelection();
        onPress?.(album); 
      }}
      style={[styles.cardContainer]}
      testID={`album-card-${album.id}`}
    >
      <CoverWithVinyl 
        imageSize={imageSize} 
        spinActive={isAlbumPlaying} 
        vinylUrl={album.vinillo || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Vinillo/Expansio%CC%81n%20Matutina.png'} 
        coverUrl={album.imageUrl || 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers/Expansio%CC%81n%20Matutina.png'} 
        albumId={album.id}
      />
      <View style={[styles.textBlockColumn, { width: imageSize }]}>
       <View style={{
           flex: 1,
        overflow: 'hidden',
        marginLeft: 0,
        marginRight: -10,
       }}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            {album.title || ''}
          </Text>
        </View>
        <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail" testID={`album-subtitle-${album.id}`}>
          {album.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const CarouselSection = ({ title, data, imageSize, onSelect, topSpacing, bottomSpacing, loading = false, skeleton = false }: { 
  title: string; 
  data: AuraDataAudio[]; 
  imageSize: number; 
  onSelect: (a: AuraDataAudio) => void; 
  topSpacing?: number; 
  bottomSpacing?: number; 
  loading?: boolean;
  skeleton?: boolean 
}) => {
  const snapOffsets = useMemo(() => {
    const offsets = data.map((_, i) => i * (CARD_WIDTH + ITEM_SPACING));
    return offsets;
  }, [data]);
  const placeholderCount = Math.max(3, Math.min(6, data.length || 5));
  return (
    <View style={[styles.section, topSpacing ? { marginTop: topSpacing } : null, bottomSpacing != null ? { marginBottom: bottomSpacing } : null]}>
      {title && title.trim().length > 0 ? (
        <Text style={styles.sectionTitle} testID={`section-title-${title}`}>{title}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: END_PADDING }]}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={Platform.OS === 'ios'}
        alwaysBounceHorizontal={Platform.OS === 'ios'}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'never'}
        testID={`carousel-${title}`}
      >
        {!loading ? data.map((album, i) => {
          const isLast = i === data.length - 1;
          return (
            <View key={album.id} style={{ width: CARD_WIDTH, marginRight: isLast ? 0 : ITEM_SPACING }} testID={`carousel-item-${title}-${album.id}`}>
              <AlbumCard album={album} imageSize={imageSize} onPress={onSelect} />
            </View>
          );
        }) : (Array.from({ length: placeholderCount }).map((_, i) => {
          const isLast = i === placeholderCount - 1;
          return (
            <View key={`sk-${i}`} style={{ width: CARD_WIDTH, marginRight: isLast ? 0 : ITEM_SPACING }} testID={`carousel-skeleton-${title}-${i}`}>
              <SkeletonCard imageSize={imageSize} />
            </View>
          );
        }))}
      </ScrollView>
    </View>
  );
};

const SkeletonCard = React.memo<{ imageSize: number }>(function SkeletonCard({ imageSize }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);
  
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });
  
  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: imageSize, height: imageSize, backgroundColor: 'rgba(251, 239, 217, 0.01)', borderRadius: 8, overflow: 'hidden' }} testID="skeleton-image">
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(255, 165, 80, 0.05)',
              opacity: shimmerOpacity,
            }
          ]}
        />
      </View>
      <View style={{ width: Math.floor(imageSize * 0.8), height: 18, backgroundColor: 'rgba(251, 239, 217, 0.01)', marginTop: 10, borderRadius: 4, overflow: 'hidden' }} testID="skeleton-title">
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(255, 165, 80, 0.05)',
              opacity: shimmerOpacity,
            }
          ]}
        />
      </View>
      <View style={{ width: Math.floor(imageSize * 0.6), height: 14, backgroundColor: 'rgba(251, 239, 217, 0.01)', marginTop: 6, borderRadius: 4, overflow: 'hidden' }} testID="skeleton-subtitle">
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(255, 165, 80, 0.05)',
              opacity: shimmerOpacity,
            }
          ]}
        />
      </View>
    </View>
  );
});

export default function MusicPlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, updateMembershipStatus } = useUserSession();
  const { setSettingsModalVisible } = useContext(SettingsModalContext);
  const checkMembershipMutation = useCheckMembershipStatus();
  const [contentHeight, setContentHeight] = useState<number>(Math.max(screenHeight - 160, 400));
  
  // Estabilizar el paddingTop para evitar glitches durante transiciones
  const containerPaddingTop = useMemo(() => Math.max(insets.top, 24), [insets.top]);

  const { isOnline } = useOfflineBanner();
  const settingsButtonOpacity = useRef(new Animated.Value(1)).current;

  const isNavigatingRef = useRef<boolean>(false);

  const auraHertzQuery = useAuraHertz();
  const auraData = useMemo(() => auraHertzQuery.data || [], [auraHertzQuery.data]);

  const userQuery = useUser(session?.userId || '');
  const user = userQuery.data;

  const profileQuery = {
    data: { found: false, data: { names: '', wantToBeCalled: '' } },
    isLoading: false,
    error: null
  };

  const displayName = useMemo(() => {
    if (user) {
      return user.names || user.wantToBeCalled || '';
    }
    if (profileQuery.data?.found) {
      const { names, wantToBeCalled } = profileQuery.data.data;
      return names || wantToBeCalled || '';
    }
    return '';
  }, [user, profileQuery.data]);

  const userGender = useMemo(() => {
    const gender = user?.gender?.toLowerCase();
    return gender === 'woman' || gender === 'female' || gender === 'mujer' ? 'woman' : 'man';
  }, [user]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height ?? 0;
    if (h > 0) setContentHeight(h);
  }, []);





  const imageSize = useMemo(() => {
    const headerApprox = 60;
    const sectionsForSizing = 2;
    const perSectionAvailable = (contentHeight - sectionsForSizing * headerApprox) / sectionsForSizing;
    const textApprox = 56;
    const baseSize = Math.min(CARD_WIDTH, Math.max(120, Math.floor(perSectionAvailable - textApprox)));
    const adjusted = Math.max(90, Math.floor(baseSize * 0.8));
    return adjusted;
  }, [contentHeight]);

  const colorCache = useRef<Map<string, string>>(new Map());
  
  const formatAndCacheColor = useCallback((rawColor: string | undefined, itemId: string): string | undefined => {
    if (!rawColor) return undefined;
    
    const cacheKey = `${itemId}-${rawColor}`;
    if (colorCache.current.has(cacheKey)) {
      return colorCache.current.get(cacheKey);
    }
    
    const formattedColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    colorCache.current.set(cacheKey, formattedColor);
    return formattedColor;
  }, []);

  const forYouData: AuraDataAudio[] = useMemo(() => {
    if (!isOnline) {
      return [];
    }
    
    const instrumentalsData = auraData.find(item => item.instrumentals);
    const forYouItems = instrumentalsData?.forYou || [];
    
    return forYouItems.map((item, idx) => {
      const genderData = userGender === 'woman' ? 'woman' : 'man';
      const itemId = `forYou-${idx}`;
      const formattedColor = formatAndCacheColor(item.colorBackground?.[genderData], itemId);
      
      return {
        id: itemId,
        title: replaceNameVariable(item.title?.[genderData], user?.names, user?.wantToBeCalled),
        description: replaceNameVariable(item.description?.[genderData], user?.names, user?.wantToBeCalled),
        imageUrl: item.imageUrl?.[genderData],
        vinillo: item.vinillo?.[genderData],
        colorBackground: formattedColor,
        trackUrl: item.trackUrl?.[genderData],
      };
    });
  }, [auraData, userGender, user, isOnline, formatAndCacheColor]);



  const instrumentalData: AuraDataAudio[] = useMemo(() => {
    const instrumentalsData = auraData.find(item => item.instrumentals);
    if (!instrumentalsData?.instrumentals) return [];

    const albums: AuraDataAudio[] = [];
    Object.entries(instrumentalsData.instrumentals).forEach(([albumKey, albumArray]) => {
      if (Array.isArray(albumArray) && albumArray.length > 0) {
        const albumData = albumArray[0];
        const genderData = userGender === 'woman' ? 'woman' : 'man';
        
        const tracks = (albumData.tracks || []).map((track, trackIdx) => ({
          trackUrl: track.trackUrl?.[genderData],
          title: replaceNameVariable(track.title?.[genderData], user?.names, user?.wantToBeCalled),
        }));

        albums.push({
          id: albumKey,
          title: replaceNameVariable(albumData.title?.[genderData], user?.names, user?.wantToBeCalled),
          description: replaceNameVariable(albumData.description?.[genderData], user?.names, user?.wantToBeCalled),
          imageUrl: albumData.imageUrl?.[genderData],
          vinillo: albumData.vinillo?.[genderData],
          colorBackground: albumData.colorBackground?.[genderData] ? `#${albumData.colorBackground[genderData]}` : undefined,
          color: albumData.colorText?.[genderData] ? `#${albumData.colorText[genderData]}` : undefined,
          tracks,
        });
      }
    });

    return albums;
  }, [auraData, userGender, user]);



  const [downloadedInstrumentals, setDownloadedInstrumentals] = useState<Set<string>>(new Set());
  const [downloadedTracks, setDownloadedTracks] = useState<Record<string, boolean>>({});
  const [isLoadingDownloads, setIsLoadingDownloads] = useState<boolean>(true);

  useEffect(() => {
    const loadDownloadedData = async () => {
      try {
        const storedInstrumentals = await AsyncStorage.getItem('downloaded_instrumentals');
        if (storedInstrumentals) {
          setDownloadedInstrumentals(new Set(JSON.parse(storedInstrumentals)));
        }
        
        const storedTracks = await AsyncStorage.getItem('downloaded_tracks');
        if (storedTracks) {
          const tracks = JSON.parse(storedTracks);
          setDownloadedTracks(tracks);
          console.log('[Aura] Loaded downloaded tracks:', tracks);
        }
        
        setIsLoadingDownloads(false);
      } catch (error) {
        console.log('[Aura] Error loading downloaded data:', error);
        setIsLoadingDownloads(false);
      }
    };

    loadDownloadedData();
  }, []);

  useEffect(() => {
    const autoDownloadForYou = async () => {
      try {
        const autoDownloadKey = 'aura_for_you_auto_downloaded';
        const alreadyDownloaded = await AsyncStorage.getItem(autoDownloadKey);
        
        if (!alreadyDownloaded && forYouData.length > 0) {
          console.log('[Aura] Auto-downloading Para Ti instrumentales...');
          await AsyncStorage.setItem(autoDownloadKey, 'true');
          console.log('[Aura] Para Ti instrumentales marked as auto-downloaded');
        }
      } catch (error) {
        console.log('[Aura] Error auto-downloading Para Ti:', error);
      }
    };

    if (forYouData.length > 0) {
      autoDownloadForYou();
    }
  }, [forYouData]);

  const filteredInstrumentalData: AuraDataAudio[] = useMemo(() => {
    if (isOnline) {
      return instrumentalData;
    }
    
    return instrumentalData.filter(album => {
      if (downloadedInstrumentals.has(album.id)) {
        return true;
      }
      
      const hasAnyDownloadedTrack = album.tracks?.some((track, idx) => {
        const trackId = `${album.id}-track-${idx}`;
        const isDownloaded = downloadedTracks[trackId] === true;
        console.log(`[Aura] Checking track: ${trackId}, downloaded: ${isDownloaded}`);
        return isDownloaded;
      });
      
      console.log(`[Aura] Album ${album.id} hasAnyDownloadedTrack:`, hasAnyDownloadedTrack);
      return hasAnyDownloadedTrack || false;
    });
  }, [isOnline, instrumentalData, downloadedInstrumentals, downloadedTracks]);

  const hasAnyDownloadedContent = useMemo(() => {
    if (isOnline) return true;
    
    if (isLoadingDownloads) {
      return true;
    }
    
    const hasDownloadedTracks = Object.keys(downloadedTracks).some(
      trackId => downloadedTracks[trackId] === true
    );
    
    const hasDownloadedAlbums = downloadedInstrumentals.size > 0;
    const hasFilteredInstrumentals = filteredInstrumentalData.length > 0;
    
    const hasAnyContent = hasDownloadedTracks || hasDownloadedAlbums || hasFilteredInstrumentals;
    console.log('[hasAnyDownloadedContent] isOnline:', isOnline, 'isLoadingDownloads:', isLoadingDownloads, 'hasDownloadedTracks:', hasDownloadedTracks, 'hasDownloadedAlbums:', hasDownloadedAlbums, 'hasFilteredInstrumentals:', hasFilteredInstrumentals, 'hasAnyContent:', hasAnyContent);
    
    return hasAnyContent;
  }, [isOnline, isLoadingDownloads, downloadedTracks, downloadedInstrumentals, filteredInstrumentalData]);

  const separateInstrumentals = (data: AuraDataAudio[]): AuraDataAudio[][] => {
    const result: AuraDataAudio[][] = [];
    for (let i = 0; i < data.length; i += 4) {
      result.push(data.slice(i, i + 4));
    }
    return result;
  };

  const { playTrack } = usePlayer();

  const handleSelect = useCallback(async (a: AuraDataAudio) => {
    await hapticSelection();
    console.log('[handleSelect] Selected album:', a.id, a.title);
    console.log('[handleSelect] Selected album colorBackground:', a.colorBackground);
    
    if (a.trackUrl) {
      const tracksForPlaylist = forYouData.filter(item => item.trackUrl).map(item => {
        const itemColor = item.colorBackground;
        console.log('[handleSelect] Mapping track:', item.id, 'title:', item.title, 'colorBackground:', itemColor);
        return {
          id: item.id,
          title: item.title,
          subtitle: item.description,
          trackUrl: item.trackUrl,
          imageUrl: item.imageUrl,
          vinillo: item.vinillo,
          color: itemColor,
        };
      });
      
      console.log('[handleSelect] Full tracksForPlaylist:', JSON.stringify(tracksForPlaylist.map(t => ({ id: t.id, title: t.title, color: t.color })), null, 2));
      
      const trackToPlay = {
        id: a.id,
        title: a.title,
        subtitle: a.description,
        trackUrl: a.trackUrl,
        imageUrl: a.imageUrl,
        vinillo: a.vinillo,
        color: a.colorBackground,
      };
      
      console.log('[handleSelect] Track to play:', trackToPlay.id, trackToPlay.title);
      console.log('[handleSelect] Track to play color:', trackToPlay.color);
      
      await playTrack(trackToPlay, tracksForPlaylist, true);
    }
  }, [playTrack, forYouData]);

  const navigateToAlbumWithFade = useCallback(async (a: AuraDataAudio, animateEntry?: boolean) => {
    if (isNavigatingRef.current) return;
    
    await hapticSelection();
    console.log('Navigate to album:', a);
    
    isNavigatingRef.current = true;
    
    router.push({ 
      pathname: '/aura/album', 
      params: { 
        albumId: a.id,
        animateEntry: animateEntry ? '1' : '0' 
      } 
    });
    
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  }, [router]);

   return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.container, { paddingTop: containerPaddingTop }]}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{auraHertzQuery.isLoading ? 'Aura' : `Aura de ${displayName}`}</Text>
            <Pressable 
          style={styles.headerRight}
          onPress={async () => {
            if (Platform.OS !== 'web') {
              try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
            }
            
            if (session?.userId) {
              console.log('[Aura] Checking membership status on settings press...');
              checkMembershipMutation.mutateAsync(session.userId)
                .then((result) => {
                  updateMembershipStatus(result.isActive, result.subscriptionStatus);
                  console.log('[Aura] Membership status updated:', result.isActive);
                })
                .catch((error) => {
                  console.log('[Aura] Error checking membership:', error);
                });
            }
            
            setSettingsModalVisible(true);
          }}
          onPressIn={() => {
            Animated.timing(settingsButtonOpacity, {
              toValue: 0.5,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.timing(settingsButtonOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={{ opacity: settingsButtonOpacity }}>
            <Settings
              color="#fbefd9"
              size={28}
              strokeWidth={1.5}
              testID="header-settings-icon"
              accessibilityLabel="Configuración"
            />
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.animatedContentWrapper} testID="content-fade-wrapper">
          {!isOnline && !hasAnyDownloadedContent ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyMainTitle}>{t('aura.empty.title')}</Text>
              <Text style={styles.emptySubtitle}>{t('aura.empty.subtitle')}</Text>
              <Text style={styles.emptySubtitle2}>{t('aura.empty.subtitle2')}</Text>
            </View>
          ) : (
					  <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 140, justifyContent: 'flex-start' }}
              onLayout={onLayout}
						  showsVerticalScrollIndicator={false}
              testID="vertical-scroll"
            >
              {(forYouData.length > 0 || (auraHertzQuery.isLoading && isOnline)) && (
                <CarouselSection 
                  title="Para ti" 
                  data={forYouData} 
                  imageSize={imageSize} 
                  topSpacing={16} 
                  loading={auraHertzQuery.isLoading && isOnline} 
                  onSelect={handleSelect} 
                  skeleton={auraHertzQuery.isLoading && isOnline} 
                />
              )}
              {(auraHertzQuery.isLoading && isOnline) && filteredInstrumentalData.length === 0 ? (
                <CarouselSection 
                  key="instrumentales-skeleton" 
                  title="Instrumentales" 
                  data={[]} 
                  imageSize={imageSize} 
                  bottomSpacing={24} 
                  loading={true} 
                  onSelect={navigateToAlbumWithFade}  
                  skeleton={true} 
                />
              ) : (
                separateInstrumentals(filteredInstrumentalData).map((group, index) => (
                  <CarouselSection 
                    key={index} 
                    title={index === 0 ? 'Instrumentales' : ''} 
                    data={group} 
                    imageSize={imageSize} 
                    bottomSpacing={24} 
                    loading={false} 
                    onSelect={navigateToAlbumWithFade}  
                    skeleton={false} 
                  />
                ))
              )}
					  </ScrollView>
          )}
        </View>
        </View>

      </SafeAreaView>

      <GlobalNavBar />
      <OfflineBanner />
		</View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#170501', zIndex: 0 },
  safe: { flex: 1, backgroundColor: '#170501' },
  container: { flex: 1, paddingBottom: 0, marginBottom: -17, paddingTop: 30 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 44,
    paddingRight: 44,
    paddingTop: 30,
    marginBottom: 16,
    minHeight: 40,
  },
  headerTitle: {
    fontSize: 32.4,
    fontWeight: Platform.OS === 'android' ? '600' : '700',
    color: '#fbefd9',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsButton: { height: 40, marginTop: 5, marginRight: 1 }, 
  content: { flex: 1 },
  section: { marginBottom: 48, paddingBottom: 0 },
  sectionTitle: { fontSize: 22, fontFamily: "Geist-SemiBold", fontWeight: "700", color: "#fbefd9", marginBottom: 12, paddingHorizontal: LEFT_PADDING + 7 },
  scrollContent: { paddingHorizontal: LEFT_PADDING + 7 },
  cardContainer: { width: "100%" },
  textBlockColumn: { marginTop: 10, alignSelf: "flex-start" },
  cardTitle: { fontSize: 18, fontFamily: "Geist-SemiBold", fontWeight: '500' as const, color: "#fbefd9" },
  cardSubtitle: { marginTop: 4, fontSize: 13, fontFamily: "Geist-Regular", color: "#fbefd9", opacity: 0.6 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheetContainer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: "hidden" as const },
  sheetGrabberRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", marginBottom: 8 },
  sheetContent: { flex: 1, paddingHorizontal: 0, paddingTop: 32 },
  centerZone: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerBlock: { alignItems: "center", justifyContent: "center" },
  centerTextBlock: { marginTop: 12, alignItems: "flex-start", paddingHorizontal: 0 },
  centerTitle: { color: "#ffffff", fontSize: 28, fontFamily: "Geist-Medium", textAlign: "left" },
  centerSubtitle: { color: "#94a3b8", fontSize: 16, fontFamily: "Geist-Regular", lineHeight: 18, marginTop: 6, textAlign: "left" },
  controlsRow: { position: "absolute", left: 0, right: 0, bottom: 140, alignItems: "center", justifyContent: "center" },
  playButton: { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  coverRow: { paddingHorizontal: 0 },
  moreFab: { position: "absolute", right: 24, bottom: 28, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  moreDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" },
  controlsInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "64%", alignSelf: "center" },
  animatedContentWrapper: { flex: 1 },
  emptyStateContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: 400,
    marginTop: -90,
    paddingHorizontal: 44,
  },
  emptyMainTitle: { 
    width: '100%', 
    textAlign: 'center', 
    color: '#fbefd9', 
    fontSize: 32, 
    fontWeight: '700' as const, 
    marginBottom: 20, 
    marginTop: 40, 
    lineHeight: 38 
  },
  emptySubtitle: { 
    width: '100%', 
    textAlign: 'center', 
    color: 'rgba(251, 239, 217, 0.7)', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    lineHeight: Platform.OS === 'android' ? 22 : 24, 
    marginBottom: 16 
  },
  emptySubtitle2: { 
    width: '100%', 
    textAlign: 'center', 
    color: 'rgba(251, 239, 217, 0.7)', 
    fontSize: 16, 
    lineHeight: 24,
    marginBottom: 50 
  },
});
