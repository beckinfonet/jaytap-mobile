import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    if (isLoginView) {
      return <LoginScreen onNavigateToSignup={() => setIsLoginView(false)} />;
    }
    return <SignupScreen onNavigateToLogin={() => setIsLoginView(true)} />;
  }

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
        />
      ) : (
        <HomeScreen 
          onSelectProperty={setSelectedProperty} 
          onOpenTours={handleOpenTours}
          onOpenProfile={() => setIsProfileOpen(true)}
          viewMode={homeViewMode}
          onViewModeChange={setHomeViewMode}
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
