import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Linking, Alert, BackHandler, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailsScreen } from './src/screens/PropertyDetailsScreen';
import { Tour3DScreen } from './src/screens/Tour3DScreen';
import { TourSelectionScreen } from './src/screens/TourSelectionScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AccountSettingsScreen } from './src/screens/AccountSettingsScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { RenterListingsScreen } from './src/screens/RenterListingsScreen';
import { OwnerListingsScreen } from './src/screens/OwnerListingsScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ScheduleViewingScreen } from './src/screens/ScheduleViewingScreen';
import { AppointmentsScreen } from './src/screens/AppointmentsScreen';
import { BottomNavigator, TabId } from './src/components/BottomNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Property } from './src/types/Property';
import { PropertyService } from './src/services/PropertyService';
import { FavoritesService } from './src/services/FavoritesService';
import { ChatService } from './src/services/ChatService';
import { AuthPromptModal } from './src/components/AuthPromptModal';

function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);
  const [activePhotosUrl, setActivePhotosUrl] = useState<string | null>(null);
  const [propertyForTourSelection, setPropertyForTourSelection] = useState<Property | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isRenterListingsOpen, setIsRenterListingsOpen] = useState(false);
  const [homeViewMode, setHomeViewMode] = useState<'list' | 'map'>('list'); // Track view mode to restore after details
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('Please sign in to continue');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [favoriteStatuses, setFavoriteStatuses] = useState<Record<string, boolean>>({});
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<Record<string, boolean>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [propertyToOpenChat, setPropertyToOpenChat] = useState<Property | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isScheduleViewingOpen, setIsScheduleViewingOpen] = useState(false);
  const [propertyToSchedule, setPropertyToSchedule] = useState<Property | null>(null);
  const [participantUidForSchedule, setParticipantUidForSchedule] = useState<string | undefined>();
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [ownerListingsUid, setOwnerListingsUid] = useState<string | null>(null);
  const [ownerListingsName, setOwnerListingsName] = useState<string>('');

  // Handle deep linking for shared property links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        // Parse URL: https://www.moveinplatform.com/property/{id} (also supports legacy bizdinkonush.com links)
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

  // Load chat unread count for badge
  useEffect(() => {
    const loadChatUnread = async () => {
      if (!user?.localId) {
        setChatUnreadCount(0);
        return;
      }
      try {
        const count = await ChatService.getUnreadCount();
        setChatUnreadCount(count);
      } catch {
        setChatUnreadCount(0);
      }
    };
    loadChatUnread();
    const interval = setInterval(loadChatUnread, 60000);
    return () => clearInterval(interval);
  }, [user?.localId]);

  // Android hardware back button support
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (showLoginModal) {
        setShowLoginModal(false);
        return true;
      }
      if (showSignupModal) {
        setShowSignupModal(false);
        return true;
      }
      if (showAuthPrompt) {
        setShowAuthPrompt(false);
        return true;
      }
      if (propertyForTourSelection) {
        setPropertyForTourSelection(null);
        return true;
      }
      if (activeTourUrl) {
        setActiveTourUrl(null);
        return true;
      }
      if (activePhotosUrl) {
        setActivePhotosUrl(null);
        return true;
      }
      if (isRenterListingsOpen) {
        setIsRenterListingsOpen(false);
        return true;
      }
      if (ownerListingsUid) {
        setOwnerListingsUid(null);
        setOwnerListingsName('');
        return true;
      }
      if (isCreateListingOpen) {
        setIsCreateListingOpen(false);
        setPropertyToEdit(null);
        return true;
      }
      if (selectedProperty) {
        setSelectedProperty(null);
        return true;
      }
      if (isScheduleViewingOpen) {
        setIsScheduleViewingOpen(false);
        setPropertyToSchedule(null);
        setParticipantUidForSchedule(undefined);
        return true;
      }
      if (isFavoritesOpen) {
        setIsFavoritesOpen(false);
        return true;
      }
      if (isAppointmentsOpen) {
        setIsAppointmentsOpen(false);
        return true;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return true;
      }
      if (isChatOpen) {
        setIsChatOpen(false);
        setPropertyToOpenChat(null);
        return true;
      }
      return false; // Let default behavior (exit app) when on home
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    showLoginModal,
    showSignupModal,
    showAuthPrompt,
    propertyForTourSelection,
    activeTourUrl,
    activePhotosUrl,
    isRenterListingsOpen,
    ownerListingsUid,
    isCreateListingOpen,
    selectedProperty,
    isScheduleViewingOpen,
    isFavoritesOpen,
    isAppointmentsOpen,
    isProfileOpen,
    isChatOpen,
  ]);

  // Load favorite statuses when user logs in
  useEffect(() => {
    const loadFavoriteStatuses = async () => {
      if (!user) {
        setFavoriteStatuses({});
        return;
      }

      try {
        // Get all user favorites at once
        const favorites = await FavoritesService.getFavorites();
        const statuses: Record<string, boolean> = {};

        // Create a map of favorite property IDs
        if (favorites && Array.isArray(favorites)) {
          favorites.forEach((fav: Property) => {
            if (fav && fav.id) {
              statuses[fav.id] = true;
            }
          });
        }

        setFavoriteStatuses(statuses);
      } catch (error: any) {
        // Silently handle errors - user might not have favorites yet or backend might be unavailable
        // Don't crash the app or show errors for this
        setFavoriteStatuses({});
      }
    };

    // Only load if user is authenticated
    if (user?.localId) {
      loadFavoriteStatuses();
    } else {
      setFavoriteStatuses({});
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

  const handleFavorite = async (property: Property) => {
    if (!user) {
      setAuthPromptMessage('Please sign in to favorite listings');
      setShowAuthPrompt(true);
      return;
    }

    // Set loading state
    setFavoriteLoading(prev => ({ ...prev, [property.id]: true }));

    try {
      const result = await FavoritesService.toggleFavorite(property.id);
      // Update local state
      setFavoriteStatuses(prev => ({
        ...prev,
        [property.id]: result.isFavorited,
      }));
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Don't show alert, just log the error
    } finally {
      // Clear loading state
      setFavoriteLoading(prev => ({ ...prev, [property.id]: false }));
    }
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

  // Top-most layer: Full screen Ricoh 360 Photos
  if (activePhotosUrl) {
    return (
      <Tour3DScreen
        url={activePhotosUrl}
        onClose={() => setActivePhotosUrl(null)}
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

  if (ownerListingsUid) {
    return (
      <OwnerListingsScreen
        ownerUid={ownerListingsUid}
        ownerName={ownerListingsName}
        onBack={() => {
          setOwnerListingsUid(null);
          setOwnerListingsName('');
        }}
        onSelectProperty={(property) => {
          setSelectedProperty(property);
          setOwnerListingsUid(null);
          setOwnerListingsName('');
        }}
        onOpenTours={handleOpenTours}
        onFavorite={handleFavorite}
        isFavorited={(id) => favoriteStatuses[id] || false}
        favoriteLoading={(id) => favoriteLoading[id] || false}
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
          onOpenPhotos={(url) => setActivePhotosUrl(url)}
          onMessagePress={() => {
            if (!user) {
              setAuthPromptMessage('Please sign in to message the listing owner');
              setShowAuthPrompt(true);
              return;
            }
            const ownerUid = selectedProperty.owner?.uid || (selectedProperty as any).ownerUid;
            if (ownerUid === user.localId) {
              return; // Cannot message own listing - button disabled
            }
            setPropertyToOpenChat(selectedProperty);
            setSelectedProperty(null);
            setIsChatOpen(true);
          }}
          onScheduleViewing={() => {
            if (!user) {
              setAuthPromptMessage('Please sign in to schedule a viewing');
              setShowAuthPrompt(true);
              return;
            }
            const ownerUid = selectedProperty.owner?.uid || (selectedProperty as any).ownerUid;
            if (ownerUid === user.localId) return;
            setPropertyToSchedule(selectedProperty);
            setSelectedProperty(null);
            setIsScheduleViewingOpen(true);
          }}
          returnToMap={homeViewMode === 'map'}
          onFavorite={handleFavorite}
          isFavorited={favoriteStatuses[selectedProperty.id] || false}
          isLoading={favoriteLoading[selectedProperty.id] || false}
          onLandlordPress={(ownerUid, ownerName) => {
            setSelectedProperty(null);
            setOwnerListingsUid(ownerUid);
            setOwnerListingsName(ownerName);
          }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {isFavoritesOpen ? (
            <FavoritesScreen
              onBack={() => setIsFavoritesOpen(false)}
              onSelectProperty={setSelectedProperty}
              onOpenTours={handleOpenTours}
              favoriteStatuses={favoriteStatuses}
              onFavorite={handleFavorite}
              favoriteLoading={favoriteLoading}
            />
          ) : isAppointmentsOpen ? (
            <AppointmentsScreen
              onBack={() => setIsAppointmentsOpen(false)}
              propertyToOpen={propertyToSchedule}
              participantUid={undefined}
            />
          ) : isAccountSettingsOpen ? (
            <AccountSettingsScreen
              onBack={() => setIsAccountSettingsOpen(false)}
              onAccountDeleted={() => {
                setIsAccountSettingsOpen(false);
                setIsProfileOpen(false);
              }}
            />
          ) : isProfileOpen ? (
            <ProfileScreen
              onBack={() => setIsProfileOpen(false)}
              onCreateListing={() => setIsCreateListingOpen(true)}
              onViewListings={() => setIsRenterListingsOpen(true)}
              onViewFavorites={() => {
                setIsProfileOpen(false);
                setIsFavoritesOpen(true);
              }}
              onViewAppointments={() => {
                setIsProfileOpen(false);
                setIsAppointmentsOpen(true);
              }}
              onViewAccountSettings={() => setIsAccountSettingsOpen(true)}
            />
          ) : isScheduleViewingOpen && propertyToSchedule ? (
            <ScheduleViewingScreen
              property={propertyToSchedule}
              participantUid={participantUidForSchedule}
              onBack={() => {
                setIsScheduleViewingOpen(false);
                setPropertyToSchedule(null);
                setParticipantUidForSchedule(undefined);
              }}
              onSuccess={() => {
                setIsScheduleViewingOpen(false);
                setPropertyToSchedule(null);
                setParticipantUidForSchedule(undefined);
                setIsAppointmentsOpen(true);
              }}
            />
          ) : isChatOpen ? (
            <ChatScreen
              onBack={() => {
                setIsChatOpen(false);
                setPropertyToOpenChat(null);
              }}
              propertyToOpen={propertyToOpenChat}
              onClearPropertyToOpen={() => setPropertyToOpenChat(null)}
              onUnreadCountChange={setChatUnreadCount}
              onScheduleViewing={(property, participantUid) => {
                setPropertyToSchedule(property);
                setParticipantUidForSchedule(participantUid);
                setIsChatOpen(false);
                setPropertyToOpenChat(null);
                setIsScheduleViewingOpen(true);
              }}
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
              onOpenFavorites={() => {
                if (!user) {
                  setAuthPromptMessage('Please sign in to view favorites');
                  setShowAuthPrompt(true);
                } else {
                  setIsFavoritesOpen(true);
                }
              }}
              viewMode={homeViewMode}
              onViewModeChange={setHomeViewMode}
              onFavorite={handleFavorite}
              favoriteStatuses={favoriteStatuses}
              favoriteLoading={favoriteLoading}
            />
          )}
          <BottomNavigator
            activeTab={
              isFavoritesOpen ? 'favorites' : isProfileOpen ? 'profile' : isAppointmentsOpen ? 'profile' : isChatOpen ? 'chat' : 'home'
            }
            chatUnreadCount={chatUnreadCount}
            onTabChange={(tab: TabId) => {
              if (tab === 'add') {
                if (!user) {
                  setAuthPromptMessage('Please sign in to create a listing');
                  setShowAuthPrompt(true);
                  return;
                }
                setIsCreateListingOpen(true);
                return;
              }
              if (tab === 'favorites') {
                if (!user) {
                  setAuthPromptMessage('Please sign in to view favorites');
                  setShowAuthPrompt(true);
                  return;
                }
                setIsFavoritesOpen(true);
                setIsProfileOpen(false);
                setIsChatOpen(false);
                return;
              }
              if (tab === 'profile') {
                if (!user) {
                  setAuthPromptMessage('Please sign in to view your profile');
                  setShowAuthPrompt(true);
                  return;
                }
                setIsProfileOpen(true);
                setIsFavoritesOpen(false);
                setIsChatOpen(false);
                return;
              }
              if (tab === 'chat') {
                if (!user) {
                  setAuthPromptMessage('Please sign in to view your chats');
                  setShowAuthPrompt(true);
                  return;
                }
                setIsChatOpen(true);
                setIsFavoritesOpen(false);
                setIsProfileOpen(false);
                return;
              }
              if (tab === 'home') {
                setIsFavoritesOpen(false);
                setIsProfileOpen(false);
                setIsChatOpen(false);
              }
            }}
          />
        </View>
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
