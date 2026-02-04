import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

interface ProfileScreenProps {
  onBack: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout failed', error);
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.iconText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View>
            <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                </View>
                <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
                <Text style={[styles.role, { color: colors.textSecondary }]}>User</Text>
            </View>

            <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Alert.alert('Coming Soon', 'Settings feature coming soon!')}
            >
                <Text style={[styles.menuText, { color: colors.text }]}>⚙️  Settings</Text>
                <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Alert.alert('Coming Soon', 'Favorites feature coming soon!')}
            >
                <Text style={[styles.menuText, { color: colors.text }]}>♡  Favorites</Text>
                <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]} 
            onPress={handleLogout}
        >
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
      padding: 20,
      flex: 1, // Take up remaining space
      justifyContent: 'space-between', // Push content apart
  },
  profileCard: {
      padding: 24,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      marginBottom: 16,
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  avatarText: {
      fontSize: 32,
      fontWeight: 'bold',
  },
  email: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
  },
  role: {
      fontSize: 14,
  },
  menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16, // Added margin bottom instead of gap
  },
  menuText: {
      fontSize: 16,
      fontWeight: '500',
  },
  arrow: {
      fontSize: 20,
      fontWeight: 'bold',
  },
  logoutButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
  },
  logoutText: {
      color: '#EF4444',
      fontSize: 16,
      fontWeight: '600',
  }
});

