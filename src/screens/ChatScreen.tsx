import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ChatService, Conversation } from '../services/ChatService';
import { Property } from '../types/Property';
import { ChatThreadScreen } from './ChatThreadScreen';
import { ChatComposeScreen } from './ChatComposeScreen';

interface ChatScreenProps {
  onBack: () => void;
  propertyToOpen?: Property | null;
  onClearPropertyToOpen?: () => void;
  onUnreadCountChange?: (count: number) => void;
  onScheduleViewing?: (property: Property, participantUid?: string) => void;
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatScreen: React.FC<ChatScreenProps> = ({
  onBack,
  propertyToOpen,
  onClearPropertyToOpen,
  onUnreadCountChange,
  onScheduleViewing,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [initialConversationFromProperty, setInitialConversationFromProperty] = useState<Conversation | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const loadConversations = useCallback(async () => {
    if (!user?.localId) {
      setLoading(false);
      return;
    }
    try {
      const data = await ChatService.getConversations();
      setConversations(data);
      const total = data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setTotalUnread(total);
      onUnreadCountChange?.(total);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      Alert.alert(t('common.error'), error?.response?.data?.message || t('chat.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.localId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // When opening from property: show compose screen (no conversation created until user sends)

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleBackFromThread = () => {
    setSelectedConversation(null);
    setInitialConversationFromProperty(null);
    loadConversations();
  };

  const handleBackFromCompose = () => {
    onClearPropertyToOpen?.();
  };

  // Android hardware back button support for nested screens
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (propertyToOpen?.id && user?.localId) {
        onClearPropertyToOpen?.();
        return true;
      }
      if (selectedConversation) {
        setSelectedConversation(null);
        setInitialConversationFromProperty(null);
        loadConversations();
        return true;
      }
      onBack();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [propertyToOpen, selectedConversation, user?.localId, onBack, onClearPropertyToOpen, loadConversations]);

  const handleConversationCreated = (conv: Conversation) => {
    setSelectedConversation(conv);
    onClearPropertyToOpen?.();
    loadConversations();
  };

  // Show compose screen when opening from property (no conversation created yet)
  if (propertyToOpen?.id && user?.localId) {
    return (
      <ChatComposeScreen
        property={propertyToOpen}
        onBack={handleBackFromCompose}
        onConversationCreated={handleConversationCreated}
        onScheduleViewing={onScheduleViewing ? () => onScheduleViewing(propertyToOpen) : undefined}
      />
    );
  }

  if (selectedConversation) {
    return (
      <ChatThreadScreen
        conversation={selectedConversation}
        onBack={handleBackFromThread}
        onConversationUpdate={loadConversations}
        onScheduleViewing={
          onScheduleViewing && selectedConversation.property?.id
            ? () => {
                const prop = selectedConversation.property!;
                const isOwner = selectedConversation.listingOwnerUid === user?.localId;
                const propertyForSchedule: Property = {
                  id: prop.id,
                  title: prop.title || 'Listing',
                  address: prop.address || '',
                  price: 0,
                  currency: '$',
                  description: '',
                  specs: { beds: 0, baths: 0, sqft: 0 },
                  features: [],
                  imageUrl: prop.imageUrl || '',
                  is3DTourAvailable: false,
                  tours: [],
                  type: 'rent',
                  owner: { uid: selectedConversation.listingOwnerUid },
                };
                onScheduleViewing(propertyForSchedule, isOwner ? selectedConversation.participantUid : undefined);
              }
            : undefined
        }
      />
    );
  }

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backButtonText, { color: colors.text }]}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.title')}</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherName = item.otherUser
      ? [item.otherUser.firstName, item.otherUser.lastName].filter(Boolean).join(' ') || item.otherUser.email || 'User'
      : 'User';
    const imageUrl = item.property?.imageUrl;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accent + '30' }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {item.property?.title?.charAt(0) || '?'}
            </Text>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={[styles.conversationTitle, { color: colors.text }]} numberOfLines={1}>
              {item.property?.title || 'Listing'}
            </Text>
            <Text style={[styles.conversationTime, { color: colors.textSecondary }]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <Text style={[styles.conversationSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {otherName}
          </Text>
          {item.lastMessage ? (
            <Text style={[styles.conversationPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          ) : null}
        </View>
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('auth.pleaseSignInToViewChats')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('chat.empty')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {t('chat.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 16 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
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
  conversationContent: { flex: 1, marginLeft: 12 },
  conversationRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  conversationTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  conversationTime: { fontSize: 12 },
  conversationSubtitle: { fontSize: 13, marginBottom: 2 },
  conversationPreview: { fontSize: 13, opacity: 0.9 },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
