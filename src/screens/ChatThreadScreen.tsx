import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Flag, Calendar } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type { Socket } from 'socket.io-client';
import { ChatService, Conversation, Message } from '../services/ChatService';
import type { TranslationKeys } from '../locales';

interface ChatThreadScreenProps {
  conversation: Conversation;
  onBack: () => void;
  onConversationUpdate: () => void;
  onScheduleViewing?: () => void;
}

const REPORT_REASONS: Array<{ value: 'profanity' | 'banned_words' | 'violence' | 'threat' | 'other'; labelKey: TranslationKeys }> = [
  { value: 'profanity', labelKey: 'chat.reportProfanity' },
  { value: 'banned_words', labelKey: 'chat.reportBanned' },
  { value: 'violence', labelKey: 'chat.reportViolence' },
  { value: 'threat', labelKey: 'chat.reportThreatening' },
  { value: 'other', labelKey: 'chat.reportOther' },
];

export const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({
  conversation,
  onBack,
  onConversationUpdate,
  onScheduleViewing,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);

  const isOwnMessage = (m: Message) => m.senderUid === user?.localId;

  const loadMessages = useCallback(async () => {
    try {
      const data = await ChatService.getMessages(conversation.id);
      setMessages(data);
      await ChatService.markAsRead(conversation.id);
      onConversationUpdate();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('chat.loadMessagesFailed'));
    } finally {
      setLoading(false);
    }
  }, [conversation.id, onConversationUpdate]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user?.localId) return;

    // ChatService.connectSocket is async (HF-04: it reads the Firebase ID
    // token from AsyncStorage and sends it as `auth: { token }`). Wrap in an
    // inner async IIFE so the useEffect cleanup function can still run
    // synchronously even if the socket isn't connected yet.
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const s = await ChatService.connectSocket((data) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) => [...prev, data.message]);
          onConversationUpdate();
        }
      });
      if (cancelled) {
        // The effect was cleaned up while we were awaiting the connection.
        s.disconnect();
        return;
      }
      socket = s;
      socketRef.current = s;
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [user?.localId, conversation.id, onConversationUpdate]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    try {
      const newMsg = await ChatService.sendMessage(conversation.id, text);
      setMessages((prev) => [...prev, newMsg]);
      onConversationUpdate();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('chat.sendFailed'));
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleReport = () => {
    Alert.alert(
      t('chat.reportTitle'),
      t('chat.reportReason'),
      [
        ...REPORT_REASONS.map((r) => ({
          text: t(r.labelKey),
          onPress: () => submitReport(r.value),
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const submitReport = async (reason: 'profanity' | 'banned_words' | 'violence' | 'threat' | 'other') => {
    try {
      await ChatService.reportConversation(conversation.id, reason);
      Alert.alert(t('common.thankYou'), t('chat.reportSubmitted'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('chat.reportFailed'));
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {conversation.property?.title || t('chat.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {conversation.otherUser
            ? [conversation.otherUser.firstName, conversation.otherUser.lastName].filter(Boolean).join(' ') ||
              conversation.otherUser.email ||
              t('chat.user')
            : t('chat.user')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {onScheduleViewing && (
          <TouchableOpacity onPress={onScheduleViewing} style={styles.scheduleButton}>
            <Calendar size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleReport} style={styles.reportButton}>
          <Flag size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const own = isOwnMessage(item);
    return (
      <View style={[styles.messageRow, own ? styles.messageRowOwn : styles.messageRowOther]}>
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: own ? colors.accent : colors.surface,
              borderColor: own ? colors.accent : colors.border,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: own ? '#FFF' : colors.text }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
              placeholder={t('chat.typeMessageThread')}
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.accent }]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16 },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerSubtitle: { fontSize: 13 },
  scheduleButton: { padding: 8 },
  reportButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 8 },
  messageRowOwn: { alignItems: 'flex-end' },
  messageRowOther: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: { fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
