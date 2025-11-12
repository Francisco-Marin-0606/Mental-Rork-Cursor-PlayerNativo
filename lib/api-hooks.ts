import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, BFFUser, BFFComment, BFFCommentsResponse, BFFCreateCommentRequest, BFFAppVersionResponse, BFFLatestSubscriptionResponse } from './api-client';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiClient.user.getById(userId),
    enabled: !!userId && userId.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<BFFUser> }) =>
      apiClient.user.update(userId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
}

export function useAudiosByUserId(userId: string) {
  return useQuery({
    queryKey: ['audios', userId],
    queryFn: () => apiClient.audio.getByUserId(userId),
    enabled: !!userId,
    placeholderData: (previousData) => previousData,
  });
}



export function useAllAudiosByUserId(userId: string) {
  return useQuery({
    queryKey: ['audios', 'all', userId],
    queryFn: () => apiClient.audio.getAllByUserId(userId),
    enabled: !!userId,
  });
}

export function useUpdateAudioCustomData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, audioRequestId, customData }: { userId: string; audioRequestId: string; customData: Record<string, unknown> }) =>
      apiClient.audio.updateCustomData(userId, audioRequestId, customData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audios', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['audios', 'all', variables.userId] });
    },
  });
}

export function useAudioRequestsByUserId(userId: string) {
  return useQuery({
    queryKey: ['audioRequests', userId],
    queryFn: () => apiClient.audioRequest.findByUserId(userId),
    enabled: !!userId && userId.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateAudioRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.audioRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audioRequests'] });
    },
  });
}

export function useAuraHertz() {
  return useQuery({
    queryKey: ['auraHertz'],
    queryFn: () => apiClient.auraHertz.getAll(),
    staleTime: 1000 * 60 * 60,
    placeholderData: (previousData) => previousData,
  });
}

export function useComments(params?: { state?: string; portal?: number; page?: number; language?: string; userId?: string }) {
  return useQuery<BFFCommentsResponse, Error>({
    queryKey: ['comments', params],
    queryFn: async () => {
      if (!params || !params.portal) {
        console.log('[useComments] No params or portal provided, returning empty response');
        return { comments: [], pagination: { currentPage: 1, totalPages: 0, totalComments: 0, commentsPerPage: 10, hasNextPage: false, hasPreviousPage: false } };
      }
      console.log('[useComments] Fetching comments with params:', params);
      try {
        const response = await apiClient.usersFeedback.getComments(params);
        console.log('[useComments] Response received:', {
          commentsCount: response.comments?.length || 0,
          currentPage: response.pagination?.currentPage,
          totalPages: response.pagination?.totalPages,
        });
        return response;
      } catch (error: any) {
        console.error('[useComments] Error fetching comments:', error.message);
        return { comments: [], pagination: { currentPage: 1, totalPages: 0, totalComments: 0, commentsPerPage: 10, hasNextPage: false, hasPreviousPage: false } };
      }
    },
    enabled: !!params && !!params.portal,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BFFCreateCommentRequest) => apiClient.usersFeedback.createComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BFFComment> }) =>
      apiClient.usersFeedback.updateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.usersFeedback.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['appSettings'],
    queryFn: () => apiClient.appSettings.findAll(),
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useRequestSettings(userId: string) {
  return useQuery({
    queryKey: ['requestSettings', userId],
    queryFn: () => apiClient.requestSettings.findByUserId(userId),
    enabled: !!userId,
  });
}

export function useEnableAura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.user.enableAura(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useFormQuestions(userId: string) {
  return useQuery({
    queryKey: ['formQuestions', userId],
    queryFn: () => apiClient.formQuestions.findByUserId(userId),
    enabled: !!userId,
  });
}

export function useStreamingEvents() {
  return useQuery({
    queryKey: ['streamingEvents'],
    queryFn: () => apiClient.streamingEvents.findAll(),
  });
}

export function useOracle(userId: string, date: string) {
  return useQuery({
    queryKey: ['oracle', userId, date],
    queryFn: () => apiClient.oracle.getByDate(userId, date),
    enabled: !!userId && !!date,
  });
}

export function usePaymentInfo() {
  return useQuery({
    queryKey: ['paymentInfo'],
    queryFn: () => apiClient.payments.getSubscriptionInfo(),
  });
}

export function useActiveMembership() {
  return useQuery({
    queryKey: ['membership', 'active'],
    queryFn: () => apiClient.payments.getActiveMembership(),
  });
}

export function useAppVersion() {
  return useQuery<BFFAppVersionResponse, Error>({
    queryKey: ['appVersion'],
    queryFn: () => apiClient.appVersion.getLatestVersion(),
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Auth hooks
export function useRequestLoginCode() {
  return useMutation({
    mutationFn: (email: string) => apiClient.auth.requestLoginCode(email),
  });
}

export function useVerifyLoginCode() {
  return useMutation({
    mutationFn: (data: { email: string; loginCode: string }) => apiClient.auth.verifyLoginCode(data),
  });
}

export function useLatestSubscription() {
  return useQuery<BFFLatestSubscriptionResponse, Error>({
    queryKey: ['latestSubscription'],
    queryFn: () => apiClient.payments.getLatestSubscription(),
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useCheckMembershipStatus() {
  return useMutation({
    mutationFn: async (userId: string) => {
      console.warn('\n============================================');
      console.warn('[useCheckMembershipStatus] 🚀 INICIANDO CONSULTA DE MEMBRESÍA');
      console.warn('============================================');
      console.warn('[useCheckMembershipStatus] 📤 ENVIANDO:', { userId });
      console.warn('[useCheckMembershipStatus] ⏰ Timestamp:', new Date().toISOString());
      
      try {
        console.warn('[useCheckMembershipStatus] 📡 Obteniendo datos del usuario:');
        console.warn('[useCheckMembershipStatus]   1. GET /user/' + userId);
        
        const user = await apiClient.user.getById(userId);
        
        console.warn('[useCheckMembershipStatus] 📥 DATOS RECIBIDOS:');
        console.warn('[useCheckMembershipStatus] ===== USER DATA =====');
        console.warn('[useCheckMembershipStatus] userId:', user._id);
        console.warn('[useCheckMembershipStatus] email:', user.email);
        console.warn('[useCheckMembershipStatus] lastMembership:', JSON.stringify(user.lastMembership, null, 2));
        console.warn('[useCheckMembershipStatus] membershipPaymentDate:', user.lastMembership?.membershipPaymentDate);
        console.warn('[useCheckMembershipStatus] billingDate:', user.lastMembership?.billingDate);
        console.warn('[useCheckMembershipStatus] membershipType:', user.lastMembership?.type);
        
        if (user.lastMembership?.type === 'free') {
          console.warn('[useCheckMembershipStatus] 🆓 Usuario con membresía FREE detectado');
          console.warn('[useCheckMembershipStatus] ✅ Retornando isActive: true sin consultar Stripe');
          console.warn('[useCheckMembershipStatus] ===== RESULTADO FINAL =====');
          console.warn('[useCheckMembershipStatus] isActive: true');
          console.warn('[useCheckMembershipStatus] subscriptionStatus: free');
          console.warn('[useCheckMembershipStatus] ✅ CONSULTA EXITOSA (FREE USER)');
          console.warn('============================================\n');
          return { isActive: true, subscriptionStatus: 'free' };
        }
        
        console.warn('[useCheckMembershipStatus] 💳 Usuario con membresía de PAGO detectado');
        console.warn('[useCheckMembershipStatus] 📡 Consultando Stripe:');
        console.warn('[useCheckMembershipStatus]   2. GET /payments/latest-subscription');
        
        const subscriptionData = await apiClient.payments.getLatestSubscription();
        
        console.warn('[useCheckMembershipStatus] ===== SUBSCRIPTION DATA =====');
        console.warn('[useCheckMembershipStatus] success:', subscriptionData?.success);
        console.warn('[useCheckMembershipStatus] message:', subscriptionData?.message);
        console.warn('[useCheckMembershipStatus] subscription:', JSON.stringify(subscriptionData?.subscription, null, 2));
        console.warn('[useCheckMembershipStatus] status:', subscriptionData?.subscription?.status);
        
        let isActive = false;
        if (user.lastMembership?.membershipPaymentDate && user.lastMembership?.billingDate) {
          const now = new Date();
          
          const paymentDateStr = user.lastMembership.membershipPaymentDate.endsWith('Z') 
            ? user.lastMembership.membershipPaymentDate 
            : user.lastMembership.membershipPaymentDate + 'Z';
          const billingDateStr = user.lastMembership.billingDate.endsWith('Z') 
            ? user.lastMembership.billingDate 
            : user.lastMembership.billingDate + 'Z';
          
          const paymentDate = new Date(paymentDateStr);
          const billingDate = new Date(billingDateStr);
          
          isActive = now >= paymentDate && now <= billingDate;
          
          console.warn('[useCheckMembershipStatus] ===== CÁLCULO DE isActive =====');
          console.warn('[useCheckMembershipStatus] paymentDate (original):', user.lastMembership.membershipPaymentDate);
          console.warn('[useCheckMembershipStatus] paymentDate (UTC):', paymentDate.toISOString());
          console.warn('[useCheckMembershipStatus] billingDate (original):', user.lastMembership.billingDate);
          console.warn('[useCheckMembershipStatus] billingDate (UTC):', billingDate.toISOString());
          console.warn('[useCheckMembershipStatus] now:', now.toISOString());
          console.warn('[useCheckMembershipStatus] now >= paymentDate:', now >= paymentDate);
          console.warn('[useCheckMembershipStatus] now <= billingDate:', now <= billingDate);
          console.warn('[useCheckMembershipStatus] ✅ isActive:', isActive);
        } else {
          console.warn('[useCheckMembershipStatus] ⚠️ Missing membership dates, membership is NOT active');
          console.warn('[useCheckMembershipStatus] membershipPaymentDate exists:', !!user.lastMembership?.membershipPaymentDate);
          console.warn('[useCheckMembershipStatus] billingDate exists:', !!user.lastMembership?.billingDate);
        }
        
        const subscriptionStatus = subscriptionData?.subscription?.status || null;
        
        console.warn('[useCheckMembershipStatus] ===== RESULTADO FINAL =====');
        console.warn('[useCheckMembershipStatus] isActive:', isActive);
        console.warn('[useCheckMembershipStatus] subscriptionStatus:', subscriptionStatus);
        console.warn('[useCheckMembershipStatus] ✅ CONSULTA EXITOSA');
        console.warn('============================================\n');
        
        return { isActive, subscriptionStatus };
      } catch (error: any) {
        console.error('\n============================================');
        console.error('[useCheckMembershipStatus] ❌ ERROR EN CONSULTA');
        console.error('============================================');
        console.error('[useCheckMembershipStatus] Error message:', error.message);
        console.error('[useCheckMembershipStatus] Error name:', error.name);
        console.error('[useCheckMembershipStatus] Error stack:', error.stack);
        console.error('[useCheckMembershipStatus] Response status:', error?.response?.status);
        console.error('[useCheckMembershipStatus] Response data:', JSON.stringify(error?.response?.data, null, 2));
        console.error('[useCheckMembershipStatus] Full error:', JSON.stringify(error, null, 2));
        console.error('[useCheckMembershipStatus] 📥 ENVIANDO RESPUESTA POR DEFECTO: { isActive: false, subscriptionStatus: null }');
        console.error('============================================\n');
        return { isActive: false, subscriptionStatus: null };
      }
    },
  });
}
