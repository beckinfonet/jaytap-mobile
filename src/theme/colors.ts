export const colors = {
  light: {
    background: '#F7F8FA', // Very light cool gray
    surface: '#FFFFFF',
    text: '#1A1D23', // Dark gunmetal
    textSecondary: '#6E7687', // Cool gray
    textTertiary: '#9AA5B1',
    primary: '#2B6DE3', // Professional Blue
    primaryLight: '#EAF2FF', // Light blue background for primary elements
    accent: '#FF385C',
    border: '#E8ECF2', // Very subtle border
    inputBackground: '#F0F2F5',
    chipBackground: '#FFFFFF',
    chipBorder: '#E8ECF2',
    activeChipBackground: '#2B6DE3',
    activeChipText: '#FFFFFF',
    success: '#00C851',
    error: '#FF4444',
    cardShadow: '#1A1D23',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textTertiary: '#666666',
    primary: '#4A8BFF', // Brighter blue for dark mode
    primaryLight: 'rgba(74, 139, 255, 0.15)',
    accent: '#FF5C7C',
    border: '#2C2C2C',
    inputBackground: '#2C2C2C',
    chipBackground: '#2C2C2C',
    chipBorder: '#333333',
    activeChipBackground: '#4A8BFF',
    activeChipText: '#FFFFFF',
    success: '#00C851',
    error: '#FF4444',
    cardShadow: '#000000',
  },
};

export type ThemeColors = typeof colors.light;
