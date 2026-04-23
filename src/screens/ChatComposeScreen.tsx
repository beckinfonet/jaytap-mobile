import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Calendar } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ChatService, Conversation } from '../services/ChatService';
import { Property } from '../types/Property';

interface ChatComposeScreenProps {
  property: Property;
  onBack: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  onScheduleViewing?: () => void;
}

/**
 * Compose screen for starting a new chat with a listing owner.
 * Does NOT create a conversation until the user sends their first message.
 */
export const ChatComposeScreen: React.FC<ChatComposeScreenProps> = ({
  property,
  onBack,
  onConversationCreated,
  onScheduleViewing,
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const owner = (property as any).owner;
  const ownerName = owner
    ? [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim() || owner.email || 'Listing owner'
    : 'Listing owner';
  const imageUrl = property.imageUrl || (property.images && property.images[0]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    try {
      // Create conversation only when user actually sends a message
      const conv = await ChatService.createOrGetConversation(property.id);
      await ChatService.sendMessage(conv.id, text);
      onConversationCreated(conv);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send message');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const renderHeader = () => (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {property.title || 'Listing'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {ownerName}
        </Text>
      </View>
      {onScheduleViewing ? (
        <TouchableOpacity onPress={onScheduleViewing} style={styles.scheduleButton}>
          <Calendar size={20} color={colors.accent} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      <View style={styles.composeContent}>
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {property.title?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          <View style={styles.previewText}>
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
              {property.title}
            </Text>
            <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
              Message {ownerName} about this listing
            </Text>
          </View>
        </View>
        <KeyboardAvoidingView style={styles.keyboardView}>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
              placeholder="Type your message..."
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
      </View>
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
  scheduleButton: { padding: 8 },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerSubtitle: { fontSize: 13 },
  composeContent: { flex: 1 },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 48, height: 48 },
  avatarText: { fontSize: 18, fontWeight: '600' },
  previewText: { flex: 1, marginLeft: 12 },
  previewTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  previewSubtitle: { fontSize: 13 },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
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
