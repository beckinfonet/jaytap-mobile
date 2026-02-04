import React from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Tour3DScreenProps {
  url: string;
  onClose: () => void;
}

export const Tour3DScreen: React.FC<Tour3DScreenProps> = ({ url, onClose }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <StatusBar hidden />
      
      {/* WebView Container */}
      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: url }}
          style={styles.webView}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          )}
        />
      </View>

      {/* Close Button Overlay */}
      <SafeAreaView style={styles.controlsContainer} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2, // Visual adjustment for X center
  },
});

