import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Property } from '../types/Property';

interface DeleteListingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  property: Property | null;
}

export const DeleteListingModal: React.FC<DeleteListingModalProps> = ({
  visible,
  onClose,
  onConfirm,
  property,
}) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error: any) {
      console.error('Delete listing error:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to delete listing. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const themeStyles = {
    background: isDark ? '#000000' : '#F2F2F7',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#3C3C4399',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    danger: '#FF453A',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: themeStyles.surface }]}>
          <Text style={[styles.title, { color: themeStyles.danger }]}>
            ⚠️ Delete Listing
          </Text>
          <Text style={[styles.message, { color: themeStyles.text }]}>
            Are you sure you want to delete this listing?
          </Text>
          {property && (
            <View style={[styles.propertyInfo, { backgroundColor: themeStyles.background, borderColor: themeStyles.border }]}>
              <Text style={[styles.propertyTitle, { color: themeStyles.text }]} numberOfLines={2}>
                {property.title}
              </Text>
              <Text style={[styles.propertyAddress, { color: themeStyles.textSecondary }]} numberOfLines={1}>
                {property.address}
              </Text>
            </View>
          )}
          <Text style={[styles.warningText, { color: themeStyles.textSecondary }]}>
            This action cannot be undone. The listing will be permanently removed.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeStyles.border }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: themeStyles.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: themeStyles.danger }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  propertyInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

