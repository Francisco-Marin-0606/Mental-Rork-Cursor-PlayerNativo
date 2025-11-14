import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BFF_BASE_URL = 'https://mental-bff-m2iw9.ondigitalocean.app';

const TOKEN_STORAGE_KEY = '@app:jwt-token:v1';

export interface BFFUser {
  _id: string;
  email: string;
  name?: string;
  names?: string;
  lastnames?: string;
  wantToBeCalled?: string;
  gender?: string;
  birthdate?: string;
  isPremium?: boolean;
  auraEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  features?: {
    nextAvailableForm?: {
      value?: string;
      enabled?: boolean;
    };
  };
  lastMembership?: {
    type?: 'monthly' | 'yearly' | 'free';
    membershipPaymentDate?: string;
    billingDate?: string;
    [key: string]: unknown;
  };
}

export interface BFFAudioRequest {
  _id: string;
  userId: string;
  isAvailable: boolean;
  status?: string;
  hypnosisName?: string;
  audioMotive?: {
    frontAnalysis?: string;
    fullAnalysis?: string;
    postHypnosis?: string;
    questions?: {
      question?: string;
      answer?: string;
    }[];
    voice?: string;
    export?: string;
    generatedSections?: unknown[];
    generatedText?: unknown[];
  };
  userLevel?: string;
  userData?: {
    _id?: string;
    email?: string;
    names?: string;
    lastnames?: string;
    wantToBeCalled?: string;
    gender?: string;
    birthdate?: string;
  };
  settings?: Record<string, unknown>;
  version?: string;
  publicationDate?: string;
  errorStatus?: unknown[];
  stepData?: Record<string, unknown>;
  requestDate?: string;
  membershipDate?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface BFFAudio {
  audioUrl: string;
  audioRequestId: string;
  title: string;
  description?: string | null;
  publicationDate: string;
  imageUrl?: string;
  formattedDuration?: string;
  position?: number;
  customData?: {
    name?: string;
    [key: string]: unknown;
  };
  userLevel?: string;
}

export interface BFFFormQuestion {
  _id: string;
  userId: string;
  questionId: string;
  answer: string;
  createdAt: string;
}

export interface BFFStreamingEvent {
  _id: string;
  title: string;
  tag?: string;
  description?: string;
  scheduledAt?: string;
}

export interface BFFAppSettings {
  _id: string;
  eventsAvailable?: boolean;
  tabs?: {
    audios?: {
      available?: boolean;
      components?: Record<string, unknown>;
    };
    events?: {
      available?: boolean;
      components?: Record<string, unknown>;
    };
    chat?: {
      available?: boolean;
      components?: Record<string, unknown>;
    };
    profile?: {
      available?: boolean;
      components?: Record<string, unknown>;
    };
  };
  availableRegistration?: boolean;
  firstHypnosisEnabled?: boolean;
  versionFirstHypnosisEnabled?: string;
  textbuton?: string;
  redirectStripe?: {
    linkStripe?: string;
    enabledStripe?: boolean;
  };
}

export interface BFFRequestSettingsQuestion {
  type: string;
  question: string;
  description?: string;
  referenceQuestion?: string;
  templateHandler?: boolean;
  customizable?: boolean;
  header?: string;
}

export interface BFFRequestSettings {
  _id: string;
  userId?: string;
  userLevel?: string;
  year?: string;
  month?: string;
  appSettings?: {
    questions?: BFFRequestSettingsQuestion[];
    formSettings?: Record<string, unknown>;
    videoIntro?: string;
    _v?: number;
  };
  generativeFormSettings?: Record<string, unknown>;
  labSettings?: Record<string, unknown>;
  exportSettings?: Record<string, unknown>;
  templateSettings?: Record<string, unknown>;
  customization?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface BFFChat {
  _id: string;
  userId: string;
  chatId: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
}

export interface BFFOracle {
  _id: string;
  userId: string;
  date: string;
  content: string;
}

export interface BFFAuraHertzData {
  _id: string;
  aura?: {
    focus?: string[];
    action?: string[];
    calm?: string[];
    sleep?: string[];
  };
  hertz?: {
    [level: string]: string[];
  };
  instrumentals?: {
    [albumKey: string]: Array<{
      title?: {
        man?: string;
        woman?: string;
      };
      description?: {
        man?: string;
        woman?: string;
      };
      imageUrl?: {
        man?: string;
        woman?: string;
      };
      vinillo?: {
        man?: string;
        woman?: string;
      };
      colorBackground?: {
        man?: string;
        woman?: string;
      };
      colorText?: {
        man?: string;
        woman?: string;
      };
      frecuencia?: {
        man?: string;
        woman?: string;
      };
      tracks?: Array<{
        title?: {
          man?: string;
          woman?: string;
        };
        trackUrl?: {
          man?: string;
          woman?: string;
        };
      }>;
    }>;
  };
  forYou?: Array<{
    title?: {
      man?: string;
      woman?: string;
    };
    description?: {
      man?: string;
      woman?: string;
    };
    trackUrl?: {
      man?: string;
      woman?: string;
    };
    imageUrl?: {
      man?: string;
      woman?: string;
    };
    vinillo?: {
      man?: string;
      woman?: string;
    };
    colorBackground?: {
      man?: string;
      woman?: string;
    };
  }>;
  forYouEn?: Array<{
    title?: {
      man?: string;
      woman?: string;
    };
    description?: {
      man?: string;
      woman?: string;
    };
    trackUrl?: {
      man?: string;
      woman?: string;
    };
    imageUrl?: {
      man?: string;
      woman?: string;
    };
    vinillo?: {
      man?: string;
      woman?: string;
    };
    colorBackground?: {
      man?: string;
      woman?: string;
    };
  }>;
}

export interface BFFComment {
  _id: string;
  content: string;
  author: string;
  portal: number;
  userId: string;
  createdAt: string;
  likeCount: number;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  language: string;
  sortPriority?: number;
}

export interface BFFCreateCommentRequest {
  content: string;
  author: string;
  portal: number;
  userId: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  publishedAt: string;
  likeCount: number;
}

export interface BFFCommentsResponse {
  comments: BFFComment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalComments: number;
    commentsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface BFFAppVersionResponse {
  _id: string;
  latestVersion: string;
  minRequiredVersion: string;
  latestBuildNumbers: {
    android: number;
    ios: number;
  };
  minRequiredBuildNumbers: {
    android: number;
    ios: number;
  };
}

export interface BFFLatestSubscriptionResponse {
  success: boolean;
  message: string;
  email: string;
  subscription: {
    context: string;
    subscriptionId: string;
    customerId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: string;
    currency: string;
    amount: number;
    canceledAt?: string;
  };
}

export interface BFFCancelSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string;
    currentPeriodEnd: string;
  };
}

export interface BFFHypnosisImage {
  _id: string;
  userLevel: string;
  backgroundVideoPlayer: string;
  levelImage: string;
  onboardingVideo?: string;
  createdAt: string;
  updatedAt: string;
}

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BFF_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (!this.token) {
          try {
            this.token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
          } catch (e) {}
        }

        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          await this.clearToken();
        }

        return Promise.reject(error);
      }
    );
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.error('Error saving token:', e);
    }
  }

  async clearToken(): Promise<void> {
    this.token = null;
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing token:', e);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  get axios(): AxiosInstance {
    return this.client;
  }

  private async getDeviceHeaders() {
    let ipAddress = 'unknown';
    try {
      if (Platform.OS !== 'web') {
        ipAddress = await Network.getIpAddressAsync();
      }
    } catch (e) {

    }

    const deviceId = Device.deviceName || Device.modelName || 'unknown';
    const deviceType = Device.deviceType === Device.DeviceType.PHONE ? 'phone' :
                      Device.deviceType === Device.DeviceType.TABLET ? 'tablet' : 'unknown';
    const osVersion = Platform.OS + ' ' + Platform.Version;
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    

    return {
      'deviceId': deviceId,
      'ipAddress': ipAddress,
      'deviceType': deviceType,
      'osVersion': osVersion,
      'appVersion': appVersion,
    };
  }

  auth = {
    // Paso 1: Enviar código de verificación al email
    requestLoginCode: async (email: string) => {

      try {
        const response = await this.client.post('/auth/loginCode', 
          { email }
        );

        // Si recibimos status 200 o 201, el código fue enviado exitosamente
        if (response.status === 200 || response.status === 201) {
          return { 
            success: true, 
            message: 'Code sent successfully'
          };
        }
        
        return { success: true, message: 'Code sent' };
      } catch (error: any) {
        if (error.response?.status === 404) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Email not found' 
          };
        }
        
        // Para cualquier otro error, lo propagamos
        throw error;
      }
    },
    // Paso 2: Verificar código y hacer login
    verifyLoginCode: async (data: { email: string; loginCode: string }) => {
      try {
        const deviceHeaders = await this.getDeviceHeaders();
        
        const response = await this.client.post('/auth/login', 
          data,
          {
            headers: {
              'Content-Type': 'application/json',
              ...deviceHeaders,
            }
          }
        );
        
        // Si recibimos 200 o 201, el login fue exitoso
        if (response.status === 200 || response.status === 201) {
          const data = response.data;
          
          // Extraer token y userId de la respuesta
          // El BFF puede devolver diferentes estructuras
          const token = data?.token || data?.access_token || data?.accessToken;
          const userId = data?.userId || data?.user_id || data?.user?.id || data?.user?._id;
          
          if (!token || !userId) {
            console.error('[APIClient] Missing token or userId in response:', { token: !!token, userId: !!userId });
            throw new Error('Invalid response: missing token or userId');
          }
          
          return {
            success: true,
            token,
            userId,
            message: data?.message || 'Login successful'
          };
        }
        
        // Si llegamos aquí con otro status, es un error
        throw new Error('Unexpected status code: ' + response.status);
      } catch (error: any) {
        throw error;
      }
    },
  };

  audioRequest = {
    create: async (data: Record<string, unknown>) => {
      try {
        console.log('[APIClient audioRequest.create] Starting request...');
        console.log('[APIClient audioRequest.create] Payload:', JSON.stringify(data, null, 2));
        
        const response = await this.client.post<BFFAudioRequest>('/audioRequest/createAudioRequest', data);
        
        console.log('[APIClient audioRequest.create] Response received successfully');
        console.log('[APIClient audioRequest.create] Response status:', response.status);
        console.log('[APIClient audioRequest.create] Response data type:', typeof response.data);
        
        // Handle string responses that should be JSON
        if (typeof response.data === 'string') {
          console.log('[APIClient audioRequest.create] WARNING: Received string response');
          console.log('[APIClient audioRequest.create] First 200 chars:', (response.data as string).substring(0, 200));
          
          const dataStr = response.data as string;
          
          // Check if it's "Event published" success message
          if (dataStr.trim() === 'Event published') {
            console.log('[APIClient audioRequest.create] SUCCESS: Event was published successfully');
            // Return a mock successful response since server confirmed the event was published
            return {
              _id: 'pending',
              userId: data.userId as string,
              email: data.email as string,
              isAvailable: false,
              status: 'created',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as BFFAudioRequest;
          }
          
          // Check if it's JSON
          if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(dataStr);
              console.log('[APIClient audioRequest.create] Successfully parsed string as JSON');
              return parsed as BFFAudioRequest;
            } catch (parseError) {
              console.error('[APIClient audioRequest.create] Failed to parse JSON:', parseError);
              console.error('[APIClient audioRequest.create] Raw string:', dataStr);
              throw new Error('Server returned invalid JSON: ' + parseError);
            }
          } else {
            // Plain text error from server
            console.error('[APIClient audioRequest.create] Server returned unexpected plain text:', dataStr);
            throw new Error('Server error: ' + dataStr);
          }
        }
        
        return response.data;
      } catch (error: any) {
        console.error('[APIClient audioRequest.create] ===== CAUGHT ERROR =====');
        console.error('[APIClient audioRequest.create] Error type:', typeof error);
        console.error('[APIClient audioRequest.create] Error name:', error?.name);
        console.error('[APIClient audioRequest.create] Error message:', error?.message);
        console.error('[APIClient audioRequest.create] Error response status:', error?.response?.status);
        console.error('[APIClient audioRequest.create] Error response data type:', typeof error?.response?.data);
        console.error('[APIClient audioRequest.create] Error response data:', error?.response?.data);
        console.error('[APIClient audioRequest.create] Error response headers:', error?.response?.headers);
        
        // If the error response is a string (HTML or plain text)
        if (error?.response?.data && typeof error.response.data === 'string') {
          const errorStr = error.response.data as string;
          console.error('[APIClient audioRequest.create] Server returned non-JSON error response');
          console.error('[APIClient audioRequest.create] First 300 chars:', errorStr.substring(0, 300));
          
          // Check if it's HTML
          if (errorStr.trim().toLowerCase().startsWith('<!doctype') || errorStr.trim().toLowerCase().startsWith('<html')) {
            throw new Error('Server error: Received HTML response instead of JSON. The endpoint might not exist or the server is down.');
          }
          
          throw new Error('Server error: ' + errorStr.substring(0, 200));
        }
        
        throw error;
      }
    },
    findByUserId: async (userId: string) => {
      const response = await this.client.get<{ audiorequests: BFFAudioRequest[] }>(`/audioRequest/findAudioRequestByUserId/${userId}`);
      return response.data.audiorequests || [];
    },
    updateIsAvailable: async (id: string) => {
      const response = await this.client.patch<BFFAudioRequest>(
        `/audioRequest/updateIsAvailable/${id}`,
        { isAvailable: false }
      );
      return response.data;
    },
    findById: async (audioRequestId: string) => {
      const response = await this.client.get<BFFAudioRequest>(`/audioRequest/findByAudioRequestId/${audioRequestId}`);
      return response.data;
    },
  };

  audio = {
    getByUserId: async (userId: string) => {
      console.log('\n============================================');
      console.log('[APIClient audio.getByUserId] REQUEST START');
      console.log('============================================');
      console.log('[APIClient audio.getByUserId] userId:', userId);
      console.log('[APIClient audio.getByUserId] Full URL:', `${this.client.defaults.baseURL}/audio/getAudiosByUserId/${userId}`);
      console.log('[APIClient audio.getByUserId] Token present:', !!this.token);
      console.log('============================================\n');
      
      const response = await this.client.get<{
        audios: BFFAudio[];
        levelAudios: BFFAudio[];
      }>(`/audio/getAudiosByUserId/${userId}`);
      
      console.log('\n============================================');
      console.log('[APIClient audio.getByUserId] RESPONSE RECEIVED');
      console.log('============================================');
      console.log('[APIClient audio.getByUserId] response.status:', response.status);
      console.log('[APIClient audio.getByUserId] response.data type:', typeof response.data);
      console.log('[APIClient audio.getByUserId] response.data keys:', Object.keys(response.data || {}));
      console.log('[APIClient audio.getByUserId] response.data.audios exists:', 'audios' in (response.data || {}));
      console.log('[APIClient audio.getByUserId] response.data.levelAudios exists:', 'levelAudios' in (response.data || {}));
      console.log('[APIClient audio.getByUserId] response.data.audios isArray:', Array.isArray(response.data?.audios));
      console.log('[APIClient audio.getByUserId] response.data.levelAudios isArray:', Array.isArray(response.data?.levelAudios));
      console.log('[APIClient audio.getByUserId] response.data.audios length:', Array.isArray(response.data?.audios) ? response.data.audios.length : 'N/A');
      console.log('[APIClient audio.getByUserId] response.data.levelAudios length:', Array.isArray(response.data?.levelAudios) ? response.data.levelAudios.length : 'N/A');
      
      if (response.data?.audios && Array.isArray(response.data.audios)) {
        const audiosWithoutUserLevel = response.data.audios.filter(audio => !audio.userLevel);
        const audiosWithUserLevel = response.data.audios.filter(audio => audio.userLevel);
        console.log('[APIClient audio.getByUserId] audios array ANALYSIS:');
        console.log('[APIClient audio.getByUserId] - Total audios:', response.data.audios.length);
        console.log('[APIClient audio.getByUserId] - Audios WITHOUT userLevel (hipnosis anteriores):', audiosWithoutUserLevel.length);
        console.log('[APIClient audio.getByUserId] - Audios WITH userLevel:', audiosWithUserLevel.length);
        if (audiosWithoutUserLevel.length > 0) {
          console.log('[APIClient audio.getByUserId] - Hipnosis anteriores first item:', JSON.stringify(audiosWithoutUserLevel[0], null, 2));
        }
      }
      
      if (response.data?.levelAudios && Array.isArray(response.data.levelAudios)) {
        console.log('[APIClient audio.getByUserId] levelAudios array details:');
        console.log('[APIClient audio.getByUserId] - Count:', response.data.levelAudios.length);
        if (response.data.levelAudios.length > 0) {
          console.log('[APIClient audio.getByUserId] - First item:', JSON.stringify(response.data.levelAudios[0], null, 2));
          console.log('[APIClient audio.getByUserId] - First item audioRequestId:', response.data.levelAudios[0]?.audioRequestId);
        }
      } else {
        console.log('[APIClient audio.getByUserId] WARNING: levelAudios is NOT an array or does not exist');
        console.log('[APIClient audio.getByUserId] levelAudios value:', response.data?.levelAudios);
      }
      
      console.log('[APIClient audio.getByUserId] FULL response.data:', JSON.stringify(response.data, null, 2));
      console.log('============================================\n');
      
      return response.data;
    },
    getAllByUserId: async (userId: string) => {
      const response = await this.client.get<{
        audios: BFFAudio[];
        levelAudios: BFFAudio[];
      }>(`/audio/getAllAudiosByUserId/${userId}`);
      return response.data;
    },
    updateCustomData: async (userId: string, audioRequestId: string, customData: Record<string, unknown>) => {
      const response = await this.client.patch<BFFAudio>(
        `/audio/updateAudioElement/customData/${userId}/${audioRequestId}`,
        customData
      );
      return response.data;
    },
  };

  chat = {
    startConversation: async (data: { userId: string; userEmail: string; message: string; file?: File }) => {
      const formData = new FormData();
      formData.append('userId', data.userId);
      formData.append('userEmail', data.userEmail);
      formData.append('message', data.message);
      if (data.file) {
        formData.append('file', data.file);
      }
      const response = await this.client.post<{ chatId: string }>('/chat/startConversation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    sendMessage: async (data: { chatId: string; message: string; file?: File }) => {
      const formData = new FormData();
      formData.append('chatId', data.chatId);
      formData.append('message', data.message);
      if (data.file) {
        formData.append('file', data.file);
      }
      const response = await this.client.post('/chat/sendMessageToAssistant', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
  };

  formQuestions = {
    findByUserId: async (userId: string) => {
      const response = await this.client.get<BFFFormQuestion[]>(`/formQuestions/findByUserId/${userId}`);
      return response.data;
    },
  };

  streamingEvents = {
    findAll: async () => {
      const response = await this.client.get<BFFStreamingEvent[]>('/streamingEvents/findAll');
      return response.data;
    },
  };

  user = {
    getById: async (userId: string) => {
      console.warn('\n========================================');
      console.warn('[APIClient user.getById] 🚀 REQUEST');
      console.warn('========================================');
      console.warn('[APIClient user.getById] 📤 ENVIANDO:');
      console.warn('[APIClient user.getById] URL:', `${this.client.defaults.baseURL}/user/${userId}`);
      console.warn('[APIClient user.getById] userId:', userId);
      console.warn('[APIClient user.getById] Token presente:', !!this.token);
      console.warn('[APIClient user.getById] Timestamp:', new Date().toISOString());
      
      try {
        const response = await this.client.get<BFFUser>(`/user/${userId}`);
        
        console.warn('[APIClient user.getById] 📥 RESPUESTA RECIBIDA:');
        console.warn('[APIClient user.getById] Status:', response.status);
        console.warn('[APIClient user.getById] Data type:', typeof response.data);
        console.warn('[APIClient user.getById] Full response:', JSON.stringify(response.data, null, 2));
        
        // Check if response is valid
        if (!response.data) {
          console.error('[APIClient user.getById] ⚠️ WARNING: Empty response data');
          throw new Error('Empty server response');
        }
        
        // Handle string responses (should not happen with proper axios config)
        if (typeof response.data === 'string') {
          console.error('[APIClient user.getById] ⚠️ WARNING: Received string instead of JSON');
          const dataStr = response.data as string;
          console.error('[APIClient user.getById] First 100 chars:', dataStr.substring(0, 100));
          
          // Try to parse if it looks like JSON
          if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(dataStr) as BFFUser;
              console.warn('[APIClient user.getById] ✅ Successfully parsed string as JSON');
              return parsed;
            } catch (parseError) {
              console.error('[APIClient user.getById] ❌ Failed to parse response as JSON:', parseError);
              throw new Error('Invalid JSON response from server');
            }
          } else {
            console.error('[APIClient user.getById] ❌ Response is not JSON, raw value:', dataStr);
            throw new Error('Server returned non-JSON response');
          }
        }
        
        console.warn('[APIClient user.getById] ✅ SUCCESS');
        console.warn('========================================\n');
        return response.data;
      } catch (error: any) {
        console.error('\n========================================');
        console.error('[APIClient user.getById] ❌ ERROR');
        console.error('========================================');
        console.error('[APIClient user.getById] Error message:', error.message);
        console.error('[APIClient user.getById] Error name:', error.name);
        console.error('[APIClient user.getById] Error status:', error?.response?.status);
        if (error?.response?.data) {
          console.error('[APIClient user.getById] Error response data type:', typeof error.response.data);
          console.error('[APIClient user.getById] Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('[APIClient user.getById] Error stack:', error?.stack);
        console.error('========================================\n');
        throw error;
      }
    },
    update: async (userId: string, data: Partial<BFFUser>) => {
      console.log('[APIClient] Updating user:', { userId, data });
      try {
        const response = await this.client.patch<BFFUser>(`/user/${userId}`, data);
        console.log('[APIClient] update response.status:', response.status);
        console.log('[APIClient] update response.data type:', typeof response.data);
        
        // Check if response is valid
        if (!response.data) {
          console.log('[APIClient] WARNING: Empty response data');
          throw new Error('Empty server response');
        }
        
        // Handle string responses
        if (typeof response.data === 'string') {
          console.log('[APIClient] WARNING: Received string instead of JSON');
          const dataStr = response.data as string;
          console.log('[APIClient] First 100 chars:', dataStr.substring(0, 100));
          
          // Try to parse if it looks like JSON
          if (dataStr.trim().startsWith('{') || dataStr.trim().startsWith('[')) {
            try {
              return JSON.parse(dataStr) as BFFUser;
            } catch (parseError) {
              console.log('[APIClient] Failed to parse response as JSON:', parseError);
              throw new Error('Invalid JSON response from server');
            }
          } else {
            console.log('[APIClient] Response is not JSON, raw value:', dataStr);
            throw new Error('Server returned non-JSON response');
          }
        }
        
        console.log('[APIClient] User updated successfully');
        return response.data;
      } catch (error: any) {
        console.log('[APIClient] update error:', error.message);
        console.log('[APIClient] update error status:', error?.response?.status);
        if (error?.response?.data) {
          console.log('[APIClient] update error response data:', error.response.data);
        }
        throw error;
      }
    },
    emailExists: async (email: string) => {
      const response = await this.client.get<{ exists: boolean }>(`/user/emailExist/${email}`);
      return response.data;
    },
    createTrialUser: async (email: string) => {
      const response = await this.client.post<BFFUser>('/user/createTrialUser', { email });
      return response.data;
    },
    sendAbandonedCart: async (data: { email: string }) => {
      const response = await this.client.post('/user/sendAbandonedCart', data);
      return response.data;
    },
    onboardingMailRegister: async (data: { email: string }) => {
      const response = await this.client.post('/user/onboardingMailRegister', data);
      return response.data;
    },
    restorePurchase: async (data: { email: string }) => {
      const response = await this.client.patch('/user/restorePurchase', data);
      return response.data;
    },
    enableAura: async () => {
      const response = await this.client.patch<BFFUser>('/user/enableAura');
      return response.data;
    },
  };

  appSettings = {
    findAll: async () => {
      console.log('[APIClient appSettings.findAll] Fetching app settings...');
      const response = await this.client.get<BFFAppSettings[]>('/appSettings/findAll');
      console.log('[APIClient appSettings.findAll] Response received:', response.data);
      return response.data;
    },
  };

  requestSettings = {
    findByUserId: async (userId: string) => {
      const response = await this.client.get<BFFRequestSettings[]>(`/requestSettings/findByUserId/${userId}`);
      return response.data;
    },
    getAllLevelRequestSettings: async () => {
      const response = await this.client.get<BFFRequestSettings[]>('/requestSettings/getAllLevelRequestSettings');
      return response.data;
    },
    getFirstUserLevel: async () => {
      const response = await this.client.get<BFFRequestSettings>('/requestSettings/getFirstUserLevel');
      return response.data;
    },
  };

  payments = {
    cancelSubscription: async (data: {
      email: string;
      userName: string;
      cancelAtPeriodEnd?: boolean;
      cancelReason?: string;
      context?: string;
    }) => {
      const response = await this.client.post('/payments/cancel-subscription', data);
      return response.data;
    },
    getSubscriptionInfo: async () => {
      const response = await this.client.get('/payments/subscription-info');
      return response.data;
    },
    getActiveMembership: async () => {
      const response = await this.client.get('/payments/memberships/active');
      return response.data;
    },
    getLatestMembership: async () => {
      const response = await this.client.get('/payments/memberships/latest');
      return response.data;
    },
    getLatestMembershipByEmail: async () => {
      const response = await this.client.get('/payments/memberships/latest-by-email');
      return response.data;
    },
    getAllSubscriptions: async () => {
      const response = await this.client.get('/payments/all-subscriptions');
      return response.data;
    },
    getLatestSubscription: async () => {
      console.warn('\n========================================');
      console.warn('[APIClient payments.getLatestSubscription] 🚀 REQUEST');
      console.warn('========================================');
      console.warn('[APIClient payments.getLatestSubscription] 📤 ENVIANDO:');
      console.warn('[APIClient payments.getLatestSubscription] URL:', `${this.client.defaults.baseURL}/payments/latest-subscription`);
      console.warn('[APIClient payments.getLatestSubscription] Token presente:', !!this.token);
      console.warn('[APIClient payments.getLatestSubscription] Timestamp:', new Date().toISOString());
      
      try {
        const response = await this.client.get<BFFLatestSubscriptionResponse>('/payments/latest-subscription');
        
        console.warn('[APIClient payments.getLatestSubscription] 📥 RESPUESTA RECIBIDA:');
        console.warn('[APIClient payments.getLatestSubscription] Status:', response.status);
        console.warn('[APIClient payments.getLatestSubscription] Data type:', typeof response.data);
        console.warn('[APIClient payments.getLatestSubscription] Full response:', JSON.stringify(response.data, null, 2));
        console.warn('[APIClient payments.getLatestSubscription] ✅ SUCCESS');
        console.warn('========================================\n');
        
        return response.data;
      } catch (error: any) {
        console.error('\n========================================');
        console.error('[APIClient payments.getLatestSubscription] ❌ ERROR');
        console.error('========================================');
        console.error('[APIClient payments.getLatestSubscription] Error message:', error.message);
        console.error('[APIClient payments.getLatestSubscription] Error name:', error.name);
        console.error('[APIClient payments.getLatestSubscription] Error status:', error?.response?.status);
        if (error?.response?.data) {
          console.error('[APIClient payments.getLatestSubscription] Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('[APIClient payments.getLatestSubscription] Error stack:', error?.stack);
        console.error('========================================\n');
        throw error;
      }
    },
  };

  appVersion = {
    getLatestVersion: async () => {
      const response = await this.client.get<{
        _id: string;
        latestVersion: string;
        minRequiredVersion: string;
        latestBuildNumbers: {
          android: number;
          ios: number;
        };
        minRequiredBuildNumbers: {
          android: number;
          ios: number;
        };
      }>('/appVersion/latestVersion');
      return response.data;
    },
  };

  oracle = {
    getByDate: async (userId: string, date: string) => {
      const response = await this.client.get<BFFOracle>(`/oracle/userId/${userId}/date/${date}`);
      return response.data;
    },
  };

  auraHertz = {
    getAll: async () => {
      const response = await this.client.get<BFFAuraHertzData[]>('/aura-hertz');
      return response.data;
    },
  };

  usersFeedback = {
    getComments: async (params?: { state?: string; portal?: number; page?: number; language?: string; userId?: string }) => {
      try {
        console.log('[APIClient usersFeedback.getComments] Request params:', JSON.stringify(params, null, 2));
        const response = await this.client.get<BFFCommentsResponse>('/users-feedback/comments', { params });
        console.log('[APIClient usersFeedback.getComments] Response received:', {
          status: response.status,
          hasComments: !!response.data?.comments,
          commentsCount: response.data?.comments?.length || 0,
          hasPagination: !!response.data?.pagination,
        });
        return response.data;
      } catch (error: any) {
        console.error('[APIClient usersFeedback.getComments] ERROR:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          params,
        });
        throw error;
      }
    },
    getCommentById: async (id: string) => {
      const response = await this.client.get<BFFComment>(`/users-feedback/comments/${id}`);
      return response.data;
    },
    createComment: async (data: BFFCreateCommentRequest) => {
      const response = await this.client.post<BFFComment>('/users-feedback/comments', data);
      return response.data;
    },
    updateComment: async (id: string, data: Partial<BFFComment>) => {
      const response = await this.client.patch<BFFComment>(`/users-feedback/comments/${id}`, data);
      return response.data;
    },
    deleteComment: async (id: string) => {
      const response = await this.client.delete(`/users-feedback/comments/${id}`);
      return response.data;
    },
  };

  hypnosisImages = {
    getByLevel: async (userLevel: string) => {
      console.warn('\n========================================');
      console.warn('[APIClient hypnosisImages.getByLevel] 🚀 REQUEST');
      console.warn('========================================');
      console.warn('[APIClient hypnosisImages.getByLevel] 📤 ENVIANDO:');
      console.warn('[APIClient hypnosisImages.getByLevel] URL:', `${this.client.defaults.baseURL}/hypnosis-images/level/${userLevel}`);
      console.warn('[APIClient hypnosisImages.getByLevel] userLevel:', userLevel);
      console.warn('[APIClient hypnosisImages.getByLevel] Token presente:', !!this.token);
      console.warn('[APIClient hypnosisImages.getByLevel] Timestamp:', new Date().toISOString());
      
      try {
        const response = await this.client.get<BFFHypnosisImage>(`/hypnosis-images/level/${userLevel}`);
        
        console.warn('[APIClient hypnosisImages.getByLevel] 📥 RESPUESTA RECIBIDA:');
        console.warn('[APIClient hypnosisImages.getByLevel] Status:', response.status);
        console.warn('[APIClient hypnosisImages.getByLevel] Data type:', typeof response.data);
        console.warn('[APIClient hypnosisImages.getByLevel] Full response:', JSON.stringify(response.data, null, 2));
        console.warn('[APIClient hypnosisImages.getByLevel] ✅ SUCCESS');
        console.warn('========================================\n');
        
        return response.data;
      } catch (error: any) {
        console.error('\n========================================');
        console.error('[APIClient hypnosisImages.getByLevel] ❌ ERROR');
        console.error('========================================');
        console.error('[APIClient hypnosisImages.getByLevel] Error message:', error.message);
        console.error('[APIClient hypnosisImages.getByLevel] Error name:', error.name);
        console.error('[APIClient hypnosisImages.getByLevel] Error status:', error?.response?.status);
        if (error?.response?.data) {
          console.error('[APIClient hypnosisImages.getByLevel] Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('[APIClient hypnosisImages.getByLevel] Error stack:', error?.stack);
        console.error('========================================\n');
        throw error;
      }
    },
  };
}

export const apiClient = new APIClient();
export default apiClient;
