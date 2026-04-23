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
import { useAuth } from '../context/AuthContext';
import { ChatService, Conversation, Message } from '../services/ChatService';

interface ChatThreadScreenProps {
  conversation: Conversation;
  onBack: () => void;
  onConversationUpdate: () => void;
  onScheduleViewing?: () => void;
}

const REPORT_REASONS = [
  { value: 'profanity' as const, label: 'Profanity or offensive language' },
  { value: 'banned_words' as const, label: 'Banned words' },
  { value: 'violence' as const, label: 'Violence or threats' },
  { value: 'threat' as const, label: 'Threatening behavior' },
  { value: 'other' as const, label: 'Other' },
];

export const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({
  conversation,
  onBack,
  onConversationUpdate,
  onScheduleViewing,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<ReturnType<typeof ChatService.connectSocket> | null>(null);

  const isOwnMessage = (m: Message) => m.senderUid === user?.localId;

  const loadMessages = useCallback(async () => {
    try {
      const data = await ChatService.getMessages(conversation.id);
      setMessages(data);
      await ChatService.markAsRead(conversation.id);
      onConversationUpdate();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation.id, onConversationUpdate]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (user?.localId) {
      const socket = ChatService.connectSocket(user.localId, (data) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) => [...prev, data.message]);
          onConversationUpdate();
        }
      });
      socketRef.current = socket;
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
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
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send message');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report conversation',
      'Select a reason for reporting this conversation. Our team will review it.',
      [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => submitReport(r.value),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (reason: 'profanity' | 'banned_words' | 'violence' | 'threat' | 'other') => {
    try {
      await ChatService.reportConversation(conversation.id, reason);
      Alert.alert('Thank you', 'Your report has been submitted. We will review it shortly.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit report');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {conversation.property?.title || 'Chat'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {conversation.otherUser
            ? [conversation.otherUser.firstName, conversation.otherUser.lastName].filter(Boolean).join(' ') ||
              conversation.otherUser.email ||
              'User'
            : 'User'}
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
              placeholder="Type a message..."
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
