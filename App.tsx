import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailsScreen } from './src/screens/PropertyDetailsScreen';
import { Tour3DScreen } from './src/screens/Tour3DScreen';
import { TourSelectionScreen } from './src/screens/TourSelectionScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { RenterListingsScreen } from './src/screens/RenterListingsScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Property } from './src/types/Property';
import { PropertyService } from './src/services/PropertyService';
import { AuthPromptModal } from './src/components/AuthPromptModal';

function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);
  const [propertyForTourSelection, setPropertyForTourSelection] = useState<Property | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isRenterListingsOpen, setIsRenterListingsOpen] = useState(false);
  const [homeViewMode, setHomeViewMode] = useState<'list' | 'map'>('list'); // Track view mode to restore after details
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('Please sign in to continue');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Handle deep linking for shared property links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        console.log('Deep link received:', url);
        
        // Parse URL: https://www.bizdinkonush.com/property/{id}
        const propertyMatch = url.match(/\/property\/([^\/\?]+)/);
        if (propertyMatch && propertyMatch[1]) {
          const propertyId = propertyMatch[1];
          
          // Fetch property details
          const property = await PropertyService.getPropertyById(propertyId);
          if (property) {
            setSelectedProperty(property);
          } else {
            Alert.alert('Property Not Found', 'The property you are looking for could not be found.');
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
        Alert.alert('Error', 'Failed to open property link.');
      }
    };

    // Handle initial URL (when app is opened via link)
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    getInitialUrl();

    // Listen for incoming links (when app is already running)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [user]); // Re-run when user changes (after login)

  // Close login/signup modals when user successfully authenticates
  useEffect(() => {
    if (user) {
      setShowLoginModal(false);
      setShowSignupModal(false);
      setShowAuthPrompt(false);
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // No longer forcing authentication - users can browse without login

  const handleOpenTours = (property: Property) => {
    if (property.tours && property.tours.length > 0) {
        if (property.tours.length === 1) {
            setPropertyForTourSelection(property);
        } else {
            setPropertyForTourSelection(property);
        }
    }
  };

  const handleTourSelected = (url: string) => {
      setPropertyForTourSelection(null); // Close selection
      setActiveTourUrl(url); // Open viewer
  };

  const handleFavorite = (property: Property) => {
    if (!user) {
      setAuthPromptMessage('Please sign in to favorite listings');
      setShowAuthPrompt(true);
      return;
    }
    // TODO: Implement favorite functionality
    Alert.alert('Favorite', `Favoriting ${property.title} - Feature coming soon!`);
  };

  // Top-most layer: Full screen 3D Viewer
  if (activeTourUrl) {
    return (
      <Tour3DScreen 
        url={activeTourUrl} 
        onClose={() => setActiveTourUrl(null)} 
      />
    );
  }

  if (isRenterListingsOpen) {
    return (
      <RenterListingsScreen
        onBack={() => setIsRenterListingsOpen(false)}
        onSelectProperty={setSelectedProperty}
        onOpenTours={handleOpenTours}
        onEditProperty={(property) => {
          setPropertyToEdit(property);
          setIsRenterListingsOpen(false);
          setIsCreateListingOpen(true);
        }}
      />
    );
  }

  if (isCreateListingOpen) {
    // Require authentication for creating listings
    if (!user) {
      setAuthPromptMessage('Please sign in to create a listing');
      setShowAuthPrompt(true);
      setIsCreateListingOpen(false);
      return null;
    }
    return (
      <CreateListingScreen
        onBack={() => {
          setIsCreateListingOpen(false);
          setPropertyToEdit(null);
        }}
        onSuccess={() => {
          setIsCreateListingOpen(false);
          setPropertyToEdit(null);
          setIsRenterListingsOpen(true); // Navigate to listings after successful creation/update
        }}
        propertyToEdit={propertyToEdit || undefined}
      />
    );
  }

  if (isProfileOpen) {
    // Require authentication for viewing profile
    if (!user) {
      setAuthPromptMessage('Please sign in to view your profile');
      setShowAuthPrompt(true);
      setIsProfileOpen(false);
      return null;
    }
    return (
      <ProfileScreen
        onBack={() => setIsProfileOpen(false)}
        onCreateListing={() => setIsCreateListingOpen(true)}
        onViewListings={() => setIsRenterListingsOpen(true)}
      />
    );
  }

  return (
    <>
      {selectedProperty ? (
        <PropertyDetailsScreen 
          property={selectedProperty} 
          onBack={() => {
            setSelectedProperty(null);
            // View mode will be restored by HomeScreen's internal state
          }}
          onOpenTours={() => handleOpenTours(selectedProperty)}
          returnToMap={homeViewMode === 'map'}
          onFavorite={handleFavorite}
        />
      ) : (
        <HomeScreen 
          onSelectProperty={setSelectedProperty} 
          onOpenTours={handleOpenTours}
          onOpenProfile={() => {
            if (!user) {
              setAuthPromptMessage('Please sign in to view your profile');
              setShowAuthPrompt(true);
            } else {
              setIsProfileOpen(true);
            }
          }}
          viewMode={homeViewMode}
          onViewModeChange={setHomeViewMode}
          onFavorite={handleFavorite}
        />
      )}
      
      {/* Modal Layer: Tour Selection */}
      {propertyForTourSelection && (
          <TourSelectionScreen
              property={propertyForTourSelection}
              onSelectTour={handleTourSelected}
              onClose={() => setPropertyForTourSelection(null)}
          />
      )}

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onLogin={() => {
          setShowAuthPrompt(false);
          setShowLoginModal(true);
        }}
        onSignup={() => {
          setShowAuthPrompt(false);
          setShowSignupModal(true);
        }}
        message={authPromptMessage}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: colors.background }}>
          <LoginScreen 
            onNavigateToSignup={() => {
              setShowLoginModal(false);
              setShowSignupModal(true);
            }}
            onClose={() => setShowLoginModal(false)}
          />
        </View>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: colors.background }}>
          <SignupScreen 
            onNavigateToLogin={() => {
              setShowSignupModal(false);
              setShowLoginModal(true);
            }}
            onClose={() => setShowSignupModal(false)}
          />
        </View>
      )}
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
      <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
