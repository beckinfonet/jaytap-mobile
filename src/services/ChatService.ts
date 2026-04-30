import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { apiClient } from './apiClient';

// Phase 1 Plan 11 (ROLE-05, HF-04): HTTP migrated to shared apiClient;
// socket.io handshake switched from the legacy uid-based handshake to
// `auth: { token }` (the Firebase ID token from AsyncStorage 'userToken').
// Backend (Plan 07) JWKS-verifies the token and only auto-joins
// `user:<verified_sub>` (T-1-05 mitigation). The legacy `auth.firebaseUid`
// payload is dual-accepted on the server until Phase 6 (D-05).
//
// AuthService stays on direct axios (Firebase Identity Toolkit, not backend).

// WebSocket URL — apiClient is HTTP-only, so socket.io still needs an explicit
// origin. Keep PRODUCTION/LOCAL alternatives commented in case of future dev
// switching, mirroring the previous shape.
const PRODUCTION_WS = 'https://jaytap-services-production.up.railway.app';
const LOCAL_WS = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
void LOCAL_WS;

const WS_URL = PRODUCTION_WS;

export interface Conversation {
  id: string;
  propertyId: string;
  listingOwnerUid: string;
  participantUid: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderUid?: string;
  unreadCount: number;
  property?: { id: string; title: string; address: string; imageUrl?: string };
  otherUser?: { uid: string; firstName?: string; lastName?: string; email?: string };
}

export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  text: string;
  createdAt: string;
}

export const ChatService = {
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/chats/unread-count');
    return response.data.count ?? 0;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get('/chats');
    return response.data.map((c: any) => ({ ...c, id: c._id || c.id }));
  },

  createOrGetConversation: async (propertyId: string): Promise<Conversation> => {
    const response = await apiClient.post('/chats', { propertyId });
    const c = response.data;
    return { ...c, id: c._id || c.id };
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/chats/${conversationId}/messages`);
    return response.data.map((m: any) => ({ ...m, id: m._id || m.id }));
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    const response = await apiClient.post(
      `/chats/${conversationId}/messages`,
      { text }
    );
    const m = response.data;
    return { ...m, id: m._id || m.id };
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    await apiClient.patch(`/chats/${conversationId}/read`, {});
  },

  reportConversation: async (
    conversationId: string,
    reason: 'profanity' | 'banned_words' | 'violence' | 'threat' | 'other',
    details?: string
  ): Promise<void> => {
    await apiClient.post(
      `/chats/${conversationId}/report`,
      { reason, details }
    );
  },

  /**
   * HF-04: socket.io handshake now sends the Firebase ID token (not the uid).
   * The backend (Plan 07) JWKS-verifies it and only auto-joins
   * `user:<verified_sub>`, mitigating cross-room subscription (T-1-05).
   *
   * The function is async because we read the token from AsyncStorage at
   * connect time. Call sites must `await` the returned Promise<Socket>.
   */
  connectSocket: async (
    onNewMessage: (data: { conversationId: string; message: Message }) => void
  ): Promise<Socket> => {
    const token = await AsyncStorage.getItem('userToken');
    const socket = io(WS_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('new_message', onNewMessage);
    return socket;
  },
};
