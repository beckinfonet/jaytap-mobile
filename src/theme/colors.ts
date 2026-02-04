export const colors = {
  light: {
    background: '#F0F2F5', // Slightly darker, cooler gray/beige mix for better contrast with white cards
    surface: '#FFFFFF',
    text: '#2D2D2D',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#2D2D2D', 
    primaryLight: '#F2EFE9', 
    accent: '#FF385C',
    border: '#E0E0E0',
    inputBackground: '#FFFFFF', // White input on gray background looks cleaner
    chipBackground: '#FFFFFF',
    chipBorder: '#E0E0E0',
    activeChipBackground: '#2D2D2D',
    activeChipText: '#FFFFFF',
    success: '#4CAF50',
    error: '#F44336',
    cardShadow: '#1A1A1A',
    buttonText: '#5D5045',
  },
  dark: {
    background: '#191A1D', // Softer dark gray (Gunmetal) - Less "Black"
    surface: '#25282F', // Lighter surface for contrast
    text: '#F5F5F5',
    textSecondary: '#A0A3A8',
    textTertiary: '#6B6F76',
    primary: '#FFFFFF',
    primaryLight: '#353941',
    accent: '#FF5C7C',
    border: '#2E3238',
    inputBackground: '#2E3238',
    chipBackground: '#2E3238',
    chipBorder: '#3E4349',
    activeChipBackground: '#E0E0E0',
    activeChipText: '#121212',
    success: '#66BB6A',
    error: '#EF5350',
    cardShadow: '#000000',
    buttonText: '#E0E0E0',
  },
};

export type ThemeColors = typeof colors.light;
