import axios from 'axios';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './AuthService';

const PRODUCTION_URL = 'https://jaytap-services-production.up.railway.app/api';
const PRODUCTION_WS = 'https://jaytap-services-production.up.railway.app';
const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
const LOCAL_WS = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const API_URL = PRODUCTION_URL;
const WS_URL = PRODUCTION_WS;

const getHeaders = async () => {
  const userData = await AuthService.getUserData();
  const uid = userData?.localId;
  return uid ? { 'x-firebase-uid': uid } : {};
};

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
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/chats/unread-count`, { headers });
    return response.data.count ?? 0;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/chats`, { headers });
    return response.data.map((c: any) => ({ ...c, id: c._id || c.id }));
  },

  createOrGetConversation: async (propertyId: string): Promise<Conversation> => {
    const headers = await getHeaders();
    const response = await axios.post(`${API_URL}/chats`, { propertyId }, { headers });
    const c = response.data;
    return { ...c, id: c._id || c.id };
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const headers = await getHeaders();
    const response = await axios.get(`${API_URL}/chats/${conversationId}/messages`, { headers });
    return response.data.map((m: any) => ({ ...m, id: m._id || m.id }));
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    const headers = await getHeaders();
    const response = await axios.post(
      `${API_URL}/chats/${conversationId}/messages`,
      { text },
      { headers }
    );
    const m = response.data;
    return { ...m, id: m._id || m.id };
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    const headers = await getHeaders();
    await axios.patch(`${API_URL}/chats/${conversationId}/read`, {}, { headers });
  },

  reportConversation: async (
    conversationId: string,
    reason: 'profanity' | 'banned_words' | 'violence' | 'threat' | 'other',
    details?: string
  ): Promise<void> => {
    const headers = await getHeaders();
    await axios.post(
      `${API_URL}/chats/${conversationId}/report`,
      { reason, details },
      { headers }
    );
  },

  connectSocket: (firebaseUid: string, onNewMessage: (data: { conversationId: string; message: Message }) => void): Socket => {
    const socket = io(WS_URL, {
      path: '/socket.io',
      auth: { firebaseUid },
      transports: ['websocket', 'polling'],
    });
    socket.on('new_message', onNewMessage);
    return socket;
  },
};
