import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUserSession } from '@/providers/UserSession';
import { apiClient, BFFCreateCommentRequest } from '@/lib/api-client';
import { useUser, useCreateComment } from '@/lib/api-hooks';


const { height: screenHeight } = Dimensions.get('window');

export interface Comment {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
  userId?: string;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  comments?: Comment[];
  videoHeight?: number;
  videoProgress?: Animated.Value;
  userLevel?: string | number;
  portal?: number;
}

export default function CommentsModal({
  visible,
  onClose,
  comments = [],
  videoHeight = screenHeight * 0.35,
  videoProgress,
  userLevel,
  portal,
}: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const { session } = useUserSession();
  const [commentText, setCommentText] = useState<string>('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const translateY = useRef(new Animated.Value(0)).current;
  
  const getUserQuery = useUser(session?.userId || '');
  const createCommentMutation = useCreateComment();
  

  
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 30) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };
  
  const loadComments = useCallback(async (page: number) => {
    if (!portal) {
      console.log('[CommentsModal] No portal available, cannot load comments');
      return;
    }
    
    try {
      console.log('[CommentsModal] Loading comments for page:', page, 'portal:', portal);
      const response = await apiClient.usersFeedback.getComments({
        state: 'APPROVED',
        portal,
        page,
        language: 'es',
      });
      
      console.log('[CommentsModal] Comments loaded:', {
        page,
        commentsCount: response.comments?.length || 0,
        hasNextPage: response.pagination?.hasNextPage,
        currentPage: response.pagination?.currentPage,
        totalPages: response.pagination?.totalPages,
      });
      
      if (response.comments && Array.isArray(response.comments)) {
        const newComments = response.comments.map(comment => ({
          id: comment._id,
          author: comment.author,
          text: comment.content,
          timeAgo: formatTimeAgo(comment.createdAt),
          userId: comment.userId,
        }));
        
        if (page === 1) {
          setLocalComments(newComments);
        } else {
          setLocalComments(prev => [...prev, ...newComments]);
        }
        
        setHasMorePages(response.pagination?.hasNextPage || false);
      }
    } catch (error: any) {
      console.error('[CommentsModal] Error loading comments:', {
        error: error.message,
        portal,
        page,
      });
    }
  }, [portal]);
  
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      if (videoProgress) {
        videoProgress.setValue(1);
      }
      if (comments.length > 0) {
        setLocalComments(comments);
      } else {
        setCurrentPage(1);
        setLocalComments([]);
        setHasMorePages(false);
        if (portal) {
          loadComments(1);
        }
      }
    }
  }, [visible, translateY, videoProgress, portal, comments, loadComments]);
  
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMorePages) {
      console.log('[CommentsModal] Cannot load more:', { isLoadingMore, hasMorePages });
      return;
    }
    
    console.log('[CommentsModal] Loading more comments, next page:', currentPage + 1);
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    await loadComments(nextPage);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMorePages, currentPage, loadComments]);
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          
          if (videoProgress) {
            const modalFullHeight = screenHeight * 0.7;
            const progress = Math.max(0, Math.min(1, 1 - (gestureState.dy / modalFullHeight)));
            videoProgress.setValue(progress);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 280,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            if (videoProgress) {
              videoProgress.setValue(0);
            }
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
          if (videoProgress) {
            Animated.spring(videoProgress, {
              toValue: 1,
              useNativeDriver: false,
              tension: 50,
              friction: 8,
            }).start();
          }
        }
      },
    })
  ).current;

  const handleClose = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !session?.userId || !portal) {
      console.log('[CommentsModal] Cannot submit comment:', { hasText: !!commentText.trim(), hasUserId: !!session?.userId, hasPortal: !!portal });
      return;
    }
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    
    const wantToBeCalled = getUserQuery.data?.wantToBeCalled || getUserQuery.data?.names || 'Usuario';
    const tempId = `temp-${Date.now()}`;
    
    const optimisticComment: Comment = {
      id: tempId,
      author: wantToBeCalled,
      text: commentText.trim(),
      timeAgo: 'Ahora',
      userId: session.userId,
    };
    
    setLocalComments(prev => [optimisticComment, ...prev]);
    setCommentText('');
    Keyboard.dismiss();
    
    try {
      const commentData: BFFCreateCommentRequest = {
        content: commentText.trim(),
        author: wantToBeCalled,
        portal,
        userId: session.userId,
        state: 'PENDING' as const,
        publishedAt: new Date().toISOString(),
        likeCount: 0,
      };
      
      console.log('\n===== [CommentsModal] CREATING COMMENT =====');
      console.log('[CommentsModal] Comment data being sent:', JSON.stringify(commentData, null, 2));
      console.log('[CommentsModal] Field types:', {
        content: typeof commentData.content,
        author: typeof commentData.author,
        portal: typeof commentData.portal + ' (value: ' + commentData.portal + ')',
        userId: typeof commentData.userId,
        state: typeof commentData.state,
        publishedAt: typeof commentData.publishedAt,
        likeCount: typeof commentData.likeCount,
      });
      console.log('===== END REQUEST DATA =====\n');
      
      await createCommentMutation.mutateAsync(commentData);
      
      console.log('[CommentsModal] Comment created successfully');
      
      await loadComments(1);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('\n===== [CommentsModal] ERROR CREATING COMMENT =====');
      console.error('[CommentsModal] Error message:', error?.message || 'Unknown error');
      console.error('[CommentsModal] Error status:', error?.response?.status || 'No status');
      console.error('[CommentsModal] Error response data:', JSON.stringify(error?.response?.data || {}, null, 2));
      console.error('[CommentsModal] Error response headers:', JSON.stringify(error?.response?.headers || {}, null, 2));
      console.error('[CommentsModal] Full error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        config: {
          url: error?.config?.url,
          method: error?.config?.method,
          data: error?.config?.data,
        },
      });
      console.error('===== END ERROR =====\n');
      
      setLocalComments(prev => prev.filter(c => c.id !== tempId));
    }
  }, [commentText, session?.userId, portal, getUserQuery.data, createCommentMutation, loadComments]);
  
  const sortedComments = useMemo(() => {
    const userComments = localComments.filter(c => c.userId === session?.userId);
    const otherComments = localComments.filter(c => c.userId !== session?.userId);
    return [...userComments, ...otherComments];
  }, [localComments, session?.userId]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#ff8c42" />
        <Text style={styles.loadingText}>Cargando más comentarios...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderComment = useCallback(({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{item.author}</Text>
        <Text style={styles.commentTime}>{item.timeAgo}</Text>
      </View>
      <Text style={styles.commentText}>{item.text}</Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      transparent={true}
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.spacer} />
        <Animated.View style={[styles.content, { transform: [{ translateY }] }]}>
          <View style={styles.header}>
            <View {...panResponder.panHandlers} style={styles.dragHandlerContainer}>
              <View style={styles.dragHandler} />
            </View>
            <View style={styles.headerInner}>
              <Text style={styles.title}>Comentarios</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                testID="close-comments"
                activeOpacity={0.7}
              >
                <X color="#ffffff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={sortedComments}
            renderItem={renderComment}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />

          <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 15 : (insets.bottom || 20) }]}>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !commentText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim()}
                activeOpacity={0.7}
              >
                <ArrowUp 
                  color={!commentText.trim() ? "#a6a6a6" : "#ffffff"}
                  size={20} 
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  spacer: {
    height: screenHeight * 0.3,
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandlerContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dragHandler: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    backgroundColor: '#1a1a1a',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: -13,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  commentItem: {
    marginBottom: 24,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  inputContainer: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(150, 150, 150, 0.4)',
  },
  input: {
    color: '#ffffff',
    fontSize: 15,
    maxHeight: 100,
    minHeight: 20,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c9841e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(201, 132, 30, 0.4)',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
