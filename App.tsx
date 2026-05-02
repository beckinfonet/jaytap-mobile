import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Linking, Alert, BackHandler, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailsScreen } from './src/screens/PropertyDetailsScreen';
import { Tour3DScreen } from './src/screens/Tour3DScreen';
import { TourSelectionScreen } from './src/screens/TourSelectionScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { parseOobCodeFromResetInput } from './src/utils/parseOobCode';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AccountSettingsScreen } from './src/screens/AccountSettingsScreen';
import { CreateListingScreen } from './src/screens/CreateListingScreen';
import { LandlordApplicationScreen } from './src/screens/LandlordApplicationScreen';
import { LandlordApplicationQueueScreen } from './src/screens/LandlordApplicationQueueScreen';
import { RenterListingsScreen } from './src/screens/RenterListingsScreen';
import { OwnerListingsScreen } from './src/screens/OwnerListingsScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ScheduleViewingScreen } from './src/screens/ScheduleViewingScreen';
import { AppointmentsScreen } from './src/screens/AppointmentsScreen';
import { BottomNavigator, TabId } from './src/components/BottomNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { Property } from './src/types/Property';
import { PropertyService } from './src/services/PropertyService';
import { FavoritesService } from './src/services/FavoritesService';
import { ChatService } from './src/services/ChatService';
import { AuthPromptModal } from './src/components/AuthPromptModal';
import { RoleRefreshBanner } from './src/components/RoleRefreshBanner';
import { canFromUser } from './src/hooks/useRole';
import PropertyDetailsHost from './src/components/PropertyDetailsHost';
import ModerationQueueScreen from './src/screens/ModerationQueueScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTourUrl, setActiveTourUrl] = useState<string | null>(null);
  const [activePhotosUrl, setActivePhotosUrl] = useState<string | null>(null);
  const [propertyForTourSelection, setPropertyForTourSelection] = useState<Property | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isLandlordApplicationOpen, setIsLandlordApplicationOpen] = useState(false);
  const [isLandlordApplicationQueueOpen, setIsLandlordApplicationQueueOpen] = useState(false);
  // Phase 3 Plan 06 — moderation queue overlay + edit-on-behalf mod-context.
  // CR-02 fix: pendingModerationCount state was REMOVED — ProfileScreen owns the
  // count entirely (it has the AppState 'active' refresh + 60s cooldown ref). The
  // App.tsx-side fetcher had no AppState listener, no cooldown, and its prop
  // shadowed ProfileScreen's self-fetch path so the cooldown never ran. Letting
  // ProfileScreen own the state removes the precedence dance and fixes the
  // stale-badge regression after returning from background.
  //
  // moderationCountRefreshKey bumps when the queue overlay closes so ProfileScreen
  // (kept-alive under the overlay) can refresh its count without depending on
  // AppState 'active' alone — a moderator who approves/rejects then taps Back
  // expects the badge to reflect the new total immediately.
  const [isModerationQueueOpen, setIsModerationQueueOpen] = useState(false);
  const [moderatorContext, setModeratorContext] = useState<{ editingOwnerUid: string; reason?: string; ownerEmail?: string } | null>(null);
  const [moderationCountRefreshKey, setModerationCountRefreshKey] = useState(0);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isAdminVerificationMode, setIsAdminVerificationMode] = useState(false);
  const skipRenterListingsReopenRef = useRef(false);
  const [isRenterListingsOpen, setIsRenterListingsOpen] = useState(false);
  // Phase 2 D-09 / D-15: default tab for RenterListings ('My Listings'). Undefined means
  // "use the screen's own default" (Pending per D-09). 'rejected' is set by the Home
  // rejection-banner CTA path (D-15 — onOpenMyListingsRejectedTab below). Reset to
  // undefined on close so the next open lands on Pending again.
  const [renterListingsDefaultTab, setRenterListingsDefaultTab] =
    useState<'live' | 'pending' | 'rejected' | 'archived' | undefined>(undefined);
  const [renterListingsRefreshKey, setRenterListingsRefreshKey] = useState(0);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [homeViewMode, setHomeViewMode] = useState<'list' | 'map'>('list'); // Track view mode to restore after details
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordInitialOobCode, setResetPasswordInitialOobCode] = useState<string | null>(null);
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
  const [returnToProfileAfterFavorites, setReturnToProfileAfterFavorites] = useState(false);
  const [returnToProfileAfterAppointments, setReturnToProfileAfterAppointments] = useState(false);
  // Phase 4.5 nav fix: Landlord Application screens are launched from Profile and
  // must hop back to Profile on close (not collapse to Home). Mirrors the
  // returnToProfileAfterFavorites / returnToProfileAfterAppointments pattern above.
  const [returnToProfileAfterLandlordApplication, setReturnToProfileAfterLandlordApplication] = useState(false);
  const [returnToProfileAfterLandlordApplicationQueue, setReturnToProfileAfterLandlordApplicationQueue] = useState(false);
  const [ownerListingsUid, setOwnerListingsUid] = useState<string | null>(null);
  const [ownerListingsName, setOwnerListingsName] = useState<string>('');
  const [tabEverMounted, setTabEverMounted] = useState({
    favorites: false,
    appointments: false,
    accountSettings: false,
    profile: false,
    chat: false,
  });

  // Single source of truth for "is the main stack currently eclipsed by a full-screen overlay?"
  // Adding a new overlay = add its flag here. Code-review checklist: if you added a new
  // full-screen overlay state, did you add it to OVERLAY_FLAGS?
  // activeTourUrl / activePhotosUrl currently drive Tour3D via early-return (App.tsx:461-478),
  // so they don't strictly need to be here today — included for future-proofing per
  // CONTEXT D-10 (amended 2026-04-22) so a future refactor to a zIndex overlay Just Works.
  const OVERLAY_FLAGS = [
    !!selectedProperty,
    isRenterListingsOpen,
    !!user && isCreateListingOpen,
    !!activeTourUrl,
    !!activePhotosUrl,
    !!user && isModerationQueueOpen, // Phase 3 Plan 06 — moderation queue overlay
  ];
  const hideMainStackUnderOverlay = OVERLAY_FLAGS.some(Boolean);

  // Phase 3 Plan 06 — Profile entry-point role gate.
  // CR-02 fix: pending-count fetcher was removed; ProfileScreen owns the count
  // (self-fetch + AppState 'active' refresh with 60s cooldown). canViewModerationQueue
  // remains here so we only pass the onReviewModerationQueue callback down when the
  // user has the permission — keeping the role check at this layer also keeps the
  // OVERLAY_FLAGS gate (which references isModerationQueueOpen) free of dead UX paths.
  const canViewModerationQueue = canFromUser(user, 'viewModerationQueue');

  // Tab-tap takes precedence: clears every flag the show* priority ladder checks
  // so the target tab can always promote. Adding a new Profile sub-screen flag
  // requires adding its setter here.
  const resetProfileSubScreens = () => {
    setIsFavoritesOpen(false);
    setIsAppointmentsOpen(false);
    setIsAccountSettingsOpen(false);
    setIsProfileOpen(false);
    setIsChatOpen(false);
    setIsScheduleViewingOpen(false);
    setPropertyToSchedule(null);
    setReturnToProfileAfterFavorites(false);
    setReturnToProfileAfterAppointments(false);
    // Phase 4.5 nav fix: keep return-to-profile flags in sync when a tab tap
    // collapses Profile-rooted state.
    setReturnToProfileAfterLandlordApplication(false);
    setReturnToProfileAfterLandlordApplicationQueue(false);
  };

  // Handle deep linking for shared property links
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        // Firebase reset links include mode=resetPassword (avoid matching verifyEmail, etc.)
        if (url.toLowerCase().includes('mode=resetpassword')) {
          const oob = parseOobCodeFromResetInput(url);
          if (oob) {
            setShowLoginModal(false);
            setShowSignupModal(false);
            setShowForgotPasswordModal(false);
            setResetPasswordInitialOobCode(oob);
            setShowResetPasswordModal(true);
            return;
          }
        }

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
      setShowForgotPasswordModal(false);
      setShowResetPasswordModal(false);
      setResetPasswordInitialOobCode(null);
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

  useEffect(() => {
    if (!isCreateListingOpen || user) return;
    setAuthPromptMessage(t('auth.pleaseSignInToCreateListing'));
    setShowAuthPrompt(true);
    setIsCreateListingOpen(false);
  }, [isCreateListingOpen, user, t]);

  const [renterListingsEverMounted, setRenterListingsEverMounted] = useState(false);
  useEffect(() => {
    if (isRenterListingsOpen) {
      setRenterListingsEverMounted((m) => m || true);
    }
  }, [isRenterListingsOpen]);
  useEffect(() => {
    if (!user?.localId) {
      setRenterListingsEverMounted(false);
    }
  }, [user?.localId]);

  // Android hardware back button support
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (showResetPasswordModal) {
        setShowResetPasswordModal(false);
        setResetPasswordInitialOobCode(null);
        setShowLoginModal(true);
        return true;
      }
      if (showForgotPasswordModal) {
        setShowForgotPasswordModal(false);
        setShowLoginModal(true);
        return true;
      }
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
      // Phase 4.5 nav fix: Landlord Application overlays sit ABOVE Profile in
      // the visual stack, so handle them before selectedProperty/Profile.
      if (isLandlordApplicationQueueOpen) {
        setIsLandlordApplicationQueueOpen(false);
        if (returnToProfileAfterLandlordApplicationQueue) {
          setIsProfileOpen(true);
          setReturnToProfileAfterLandlordApplicationQueue(false);
        }
        return true;
      }
      // Phase 3 Plan 06 — moderation queue (sibling to landlord-app queue).
      if (isModerationQueueOpen) {
        setIsModerationQueueOpen(false);
        return true;
      }
      if (isLandlordApplicationOpen) {
        setIsLandlordApplicationOpen(false);
        if (returnToProfileAfterLandlordApplication) {
          setIsProfileOpen(true);
          setReturnToProfileAfterLandlordApplication(false);
        }
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
        if (returnToProfileAfterFavorites) {
          setIsProfileOpen(true);
          setReturnToProfileAfterFavorites(false);
        }
        return true;
      }
      if (isAppointmentsOpen) {
        setIsAppointmentsOpen(false);
        if (returnToProfileAfterAppointments) {
          setIsProfileOpen(true);
          setReturnToProfileAfterAppointments(false);
        }
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
    showForgotPasswordModal,
    showResetPasswordModal,
    showAuthPrompt,
    propertyForTourSelection,
    activeTourUrl,
    activePhotosUrl,
    isRenterListingsOpen,
    ownerListingsUid,
    isCreateListingOpen,
    isLandlordApplicationOpen,
    isLandlordApplicationQueueOpen,
    isModerationQueueOpen,
    selectedProperty,
    isScheduleViewingOpen,
    isFavoritesOpen,
    isAppointmentsOpen,
    isProfileOpen,
    isChatOpen,
    returnToProfileAfterFavorites,
    returnToProfileAfterAppointments,
    returnToProfileAfterLandlordApplication,
    returnToProfileAfterLandlordApplicationQueue,
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

  // Main-stack tab visibility (must run before any early return; drives tab keep-alive)
  const inMainStack = !selectedProperty;
  const showFavorites = inMainStack && isFavoritesOpen;
  const showAppointments = inMainStack && !isFavoritesOpen && isAppointmentsOpen;
  const showAccountSettings = inMainStack && !isFavoritesOpen && !isAppointmentsOpen && isAccountSettingsOpen;
  const showProfile = inMainStack && !isFavoritesOpen && !isAppointmentsOpen && !isAccountSettingsOpen && isProfileOpen;
  const showSchedule =
    inMainStack &&
    !isFavoritesOpen &&
    !isAppointmentsOpen &&
    !isAccountSettingsOpen &&
    !isProfileOpen &&
    isScheduleViewingOpen &&
    !!propertyToSchedule;
  const showChat =
    inMainStack &&
    !isFavoritesOpen &&
    !isAppointmentsOpen &&
    !isAccountSettingsOpen &&
    !isProfileOpen &&
    !(isScheduleViewingOpen && propertyToSchedule) &&
    isChatOpen;
  const showHome =
    inMainStack &&
    !isFavoritesOpen &&
    !isAppointmentsOpen &&
    !isAccountSettingsOpen &&
    !isProfileOpen &&
    !(isScheduleViewingOpen && propertyToSchedule) &&
    !isChatOpen;

  useEffect(() => {
    setTabEverMounted((m) => {
      const next = {
        favorites: m.favorites || showFavorites,
        appointments: m.appointments || showAppointments,
        accountSettings: m.accountSettings || showAccountSettings,
        profile: m.profile || showProfile,
        chat: m.chat || showChat,
      };
      if (
        next.favorites === m.favorites &&
        next.appointments === m.appointments &&
        next.accountSettings === m.accountSettings &&
        next.profile === m.profile &&
        next.chat === m.chat
      ) {
        return m;
      }
      return next;
    });
  }, [showFavorites, showAppointments, showAccountSettings, showProfile, showChat]);

  const onProfileBack = useCallback(() => setIsProfileOpen(false), []);
  const onProfileCreateListing = useCallback(() => {
    // Phase 4.5 pre-flight gate: route to LandlordApplicationScreen if the user lacks listing capability.
    if (!canFromUser(user, 'manageListings')) {
      Alert.alert(
        t('landlordApp.gateNeededTitle'),
        t('landlordApp.gateNeededMessage'),
      );
      setIsProfileOpen(false);
      // Phase 4.5 nav fix: pre-flight gate originated from Profile, so back
      // should return there rather than collapsing to Home.
      setReturnToProfileAfterLandlordApplication(true);
      setIsLandlordApplicationOpen(true);
      return;
    }
    setIsAdminVerificationMode(false);
    setPropertyToEdit(null);
    setIsCreateListingOpen(true);
  }, [user, t]);
  const onProfileApplyLandlord = useCallback(() => {
    setIsProfileOpen(false);
    setIsAccountSettingsOpen(false);
    // Phase 4.5 nav fix: launched from Profile (or AccountSettings, which itself
    // hops back to Profile) — back must return to Profile, not Home.
    setReturnToProfileAfterLandlordApplication(true);
    setIsLandlordApplicationOpen(true);
  }, []);
  const onProfileReviewLandlordApplications = useCallback(() => {
    setIsProfileOpen(false);
    // Phase 4.5 nav fix: admin queue is opened from Profile — back must return
    // to Profile, not Home.
    setReturnToProfileAfterLandlordApplicationQueue(true);
    setIsLandlordApplicationQueueOpen(true);
  }, []);
  // Phase 3 Plan 06 Task 04 — Profile entry-point dispatcher for the
  // moderation queue overlay. Closes Profile, opens the queue.
  const onProfileReviewModerationQueue = useCallback(() => {
    setIsProfileOpen(false);
    setIsModerationQueueOpen(true);
  }, []);
  const onProfileViewListings = useCallback(() => setIsRenterListingsOpen(true), []);
  // Phase 2 D-15 / MOD-09: HomeRejectionBanner CTA target. Opens RenterListings
  // ('My Listings') with the Rejected tab pre-selected so the owner lands on the
  // listings that need their attention. Plan 06 reads `defaultTab` on mount.
  const onOpenMyListingsRejectedTab = useCallback(() => {
    setRenterListingsDefaultTab('rejected');
    setIsRenterListingsOpen(true);
  }, []);
  // Phase 2 D-09: closing RenterListings resets the default-tab override so a
  // subsequent profile-tap (or any other open path) lands on Pending again.
  const onCloseRenterListings = useCallback(() => {
    setIsRenterListingsOpen(false);
    setRenterListingsDefaultTab(undefined);
  }, []);
  const onProfileViewFavorites = useCallback(() => {
    setReturnToProfileAfterFavorites(true);
    setIsProfileOpen(false);
    setIsFavoritesOpen(true);
  }, []);
  const onProfileViewAppointments = useCallback(() => {
    setReturnToProfileAfterAppointments(true);
    setIsProfileOpen(false);
    setIsAppointmentsOpen(true);
  }, []);
  const onProfileViewAccountSettings = useCallback(() => setIsAccountSettingsOpen(true), []);

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
      setAuthPromptMessage(t('auth.pleaseSignInToFavorite'));
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

  const mainStackScreenStyle = (visible: boolean) =>
    ({
      flex: 1,
      display: visible ? 'flex' : 'none',
      pointerEvents: visible ? 'auto' : 'none',
    }) as const;

  const fullScreenOverlayWrap = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 5,
  };

  return (
    <>
      <View style={{ flex: 1 }}>
        {/* Phase 1 ROLE-10 / D-13: sticky role-refresh banner mounted ABOVE the
            hideMainStackUnderOverlay branch so it persists across screen changes.
            DO NOT add this to OVERLAY_FLAGS — it's a top-level slot, not an overlay. */}
        <RoleRefreshBanner />
        {/* Keep main stack mounted under full-screen flows so Profile / Home are not torn down */}
        <View style={{ flex: 1, display: hideMainStackUnderOverlay ? 'none' : 'flex' }}>
          {(tabEverMounted.favorites || showFavorites) && (
            <View style={mainStackScreenStyle(showFavorites)}>
              <FavoritesScreen
                onBack={() => {
                  setIsFavoritesOpen(false);
                  if (returnToProfileAfterFavorites) {
                    setIsProfileOpen(true);
                    setReturnToProfileAfterFavorites(false);
                  }
                }}
                onSelectProperty={setSelectedProperty}
                onOpenTours={handleOpenTours}
                favoriteStatuses={favoriteStatuses}
                onFavorite={handleFavorite}
                favoriteLoading={favoriteLoading}
              />
            </View>
          )}
          {(tabEverMounted.appointments || showAppointments) && (
            <View style={mainStackScreenStyle(showAppointments)}>
              <AppointmentsScreen
                onBack={() => {
                  setIsAppointmentsOpen(false);
                  if (returnToProfileAfterAppointments) {
                    setIsProfileOpen(true);
                    setReturnToProfileAfterAppointments(false);
                  }
                }}
                propertyToOpen={propertyToSchedule}
                participantUid={undefined}
              />
            </View>
          )}
          {(tabEverMounted.accountSettings || showAccountSettings) && (
            <View style={mainStackScreenStyle(showAccountSettings)}>
              <AccountSettingsScreen
                onBack={() => setIsAccountSettingsOpen(false)}
                onAccountDeleted={() => {
                  setIsAccountSettingsOpen(false);
                  setIsProfileOpen(false);
                }}
                onApplyLandlord={onProfileApplyLandlord}
              />
            </View>
          )}
          {(tabEverMounted.profile || showProfile) && (
            <View style={mainStackScreenStyle(showProfile)}>
              <ProfileScreen
                onBack={onProfileBack}
                onCreateListing={onProfileCreateListing}
                onViewListings={onProfileViewListings}
                onViewFavorites={onProfileViewFavorites}
                onViewAppointments={onProfileViewAppointments}
                onViewAccountSettings={onProfileViewAccountSettings}
                onApplyLandlord={onProfileApplyLandlord}
                onReviewLandlordApplications={onProfileReviewLandlordApplications}
                onReviewModerationQueue={canViewModerationQueue ? onProfileReviewModerationQueue : undefined}
                moderationCountRefreshKey={moderationCountRefreshKey}
              />
            </View>
          )}
          {showSchedule && propertyToSchedule && (
            <View style={{ flex: 1 }}>
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
                  setReturnToProfileAfterAppointments(false);
                  setIsAppointmentsOpen(true);
                }}
              />
            </View>
          )}
          {(tabEverMounted.chat || showChat) && (
            <View style={mainStackScreenStyle(showChat)}>
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
            </View>
          )}
          <View style={mainStackScreenStyle(showHome)}>
            <HomeScreen
              onSelectProperty={setSelectedProperty}
              onOpenTours={handleOpenTours}
              onOpenProfile={() => {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToViewProfile'));
                  setShowAuthPrompt(true);
                } else {
                  setIsProfileOpen(true);
                }
              }}
              onOpenFavorites={() => {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToViewFavorites'));
                  setShowAuthPrompt(true);
                } else {
                  setReturnToProfileAfterFavorites(false);
                  setIsFavoritesOpen(true);
                }
              }}
              viewMode={homeViewMode}
              onViewModeChange={setHomeViewMode}
              onFavorite={handleFavorite}
              favoriteStatuses={favoriteStatuses}
              favoriteLoading={favoriteLoading}
              refreshKey={homeRefreshKey}
              onOpenMyListingsRejectedTab={onOpenMyListingsRejectedTab}
            />
          </View>
          <BottomNavigator
            activeTab={
              isFavoritesOpen ? 'favorites' : isProfileOpen ? 'profile' : isAppointmentsOpen ? 'profile' : isChatOpen ? 'chat' : 'home'
            }
            chatUnreadCount={chatUnreadCount}
            onTabChange={(tab: TabId) => {
              if (tab === 'add') {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToCreateListing'));
                  setShowAuthPrompt(true);
                  return;
                }
                // Phase 4.5 pre-flight gate.
                if (!canFromUser(user, 'manageListings')) {
                  Alert.alert(t('landlordApp.gateNeededTitle'), t('landlordApp.gateNeededMessage'));
                  // Phase 4.5 nav fix: tab-tap origin → back should NOT hop to
                  // Profile (user wasn't there). Explicitly clear the flag so
                  // a stale value doesn't leak from a prior Profile flow.
                  setReturnToProfileAfterLandlordApplication(false);
                  setIsLandlordApplicationOpen(true);
                  return;
                }
                setIsAdminVerificationMode(false);
                setPropertyToEdit(null);
                setIsCreateListingOpen(true);
                return;
              }
              if (tab === 'favorites') {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToViewFavorites'));
                  setShowAuthPrompt(true);
                  return;
                }
                resetProfileSubScreens();
                setIsFavoritesOpen(true);
                return;
              }
              if (tab === 'profile') {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToViewProfile'));
                  setShowAuthPrompt(true);
                  return;
                }
                resetProfileSubScreens();
                setIsProfileOpen(true);
                return;
              }
              if (tab === 'chat') {
                if (!user) {
                  setAuthPromptMessage(t('auth.pleaseSignInToViewChats'));
                  setShowAuthPrompt(true);
                  return;
                }
                resetProfileSubScreens();
                setIsChatOpen(true);
                return;
              }
              if (tab === 'home') {
                resetProfileSubScreens();
              }
            }}
          />
        </View>
        {selectedProperty && (
          <PropertyDetailsHost
            selectedProperty={selectedProperty}
            homeViewMode={homeViewMode}
            isFavorited={favoriteStatuses[selectedProperty.id] || false}
            isLoadingFavorite={favoriteLoading[selectedProperty.id] || false}
            onBack={() => setSelectedProperty(null)}
            onOpenTours={() => handleOpenTours(selectedProperty)}
            onOpenPhotos={(url) => setActivePhotosUrl(url)}
            onMessagePress={() => {
              if (!user) {
                setAuthPromptMessage(t('auth.pleaseSignInToMessage'));
                setShowAuthPrompt(true);
                return;
              }
              const ownerUid = selectedProperty.owner?.uid || (selectedProperty as any).ownerUid;
              if (ownerUid === user.localId) return;
              setPropertyToOpenChat(selectedProperty);
              setSelectedProperty(null);
              setIsChatOpen(true);
            }}
            onScheduleViewing={() => {
              if (!user) {
                setAuthPromptMessage(t('auth.pleaseSignInToSchedule'));
                setShowAuthPrompt(true);
                return;
              }
              const ownerUid = selectedProperty.owner?.uid || (selectedProperty as any).ownerUid;
              if (ownerUid === user.localId) return;
              setPropertyToSchedule(selectedProperty);
              setSelectedProperty(null);
              setIsScheduleViewingOpen(true);
            }}
            onFavorite={handleFavorite}
            onLandlordPress={(ownerUid, ownerName) => {
              setSelectedProperty(null);
              setOwnerListingsUid(ownerUid);
              setOwnerListingsName(ownerName);
            }}
            onAdminVerifyDocuments={(p) => {
              skipRenterListingsReopenRef.current = true;
              setPropertyToEdit(p);
              setIsAdminVerificationMode(true);
              setIsCreateListingOpen(true);
              setSelectedProperty(null);
            }}
            onEditListing={(property) => {
              setIsAdminVerificationMode(false);
              setPropertyToEdit(property);
              setSelectedProperty(null);
              setIsCreateListingOpen(true);
            }}
            // Phase 3 Plan 06 — mod footer "Edit on behalf" -> CreateListingScreen with moderatorContext.
            onEditOnBehalfPressed={(p) => {
              setIsAdminVerificationMode(false);
              setPropertyToEdit(p);
              setModeratorContext({
                editingOwnerUid: (p.owner?.uid || (p as any).ownerUid || '') as string,
                ownerEmail: p.owner?.email,
              });
              setSelectedProperty(null);
              setIsCreateListingOpen(true);
            }}
          />
        )}
        {(renterListingsEverMounted || isRenterListingsOpen) && (
          <View style={[
            fullScreenOverlayWrap,
            { display: isRenterListingsOpen ? 'flex' : 'none' },
            { pointerEvents: isRenterListingsOpen ? 'auto' : 'none' },
          ]}>
            <RenterListingsScreen
              onBack={onCloseRenterListings}
              defaultTab={renterListingsDefaultTab}
              onSelectProperty={(property) => {
                setSelectedProperty(property);
                setIsRenterListingsOpen(false);
              }}
              onOpenTours={handleOpenTours}
              onEditProperty={(property) => {
                setIsAdminVerificationMode(false);
                setPropertyToEdit(property);
                setIsRenterListingsOpen(false);
                setIsCreateListingOpen(true);
              }}
              refreshKey={renterListingsRefreshKey}
              onListingMutated={() => setHomeRefreshKey((k) => k + 1)}
            />
          </View>
        )}
        {!!user && isCreateListingOpen && (
          <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
            <CreateListingScreen
              onBack={() => {
                setIsCreateListingOpen(false);
                setPropertyToEdit(null);
                setIsAdminVerificationMode(false);
                // Phase 3 Plan 06 — clear mod-context so owner self-edit doesn't inherit it.
                setModeratorContext(null);
                skipRenterListingsReopenRef.current = false;
              }}
              onSuccess={() => {
                setIsCreateListingOpen(false);
                setPropertyToEdit(null);
                setIsAdminVerificationMode(false);
                setModeratorContext(null); // Phase 3 Plan 06 — D-12 status->'live' server-side
                // Refresh Home so newly-published listings (and edits that flip draft↔live) appear without remount.
                setHomeRefreshKey((k) => k + 1);
                if (!skipRenterListingsReopenRef.current) {
                  setRenterListingsRefreshKey((k) => k + 1);
                  setIsRenterListingsOpen(true);
                }
                skipRenterListingsReopenRef.current = false;
              }}
              propertyToEdit={propertyToEdit || undefined}
              verificationOnly={isAdminVerificationMode}
              moderatorContext={moderatorContext || undefined}
              // Phase 5 D-11: Hospitality contact recovery — close CreateListing, open AccountSettings
              onNavigateToAccountSettings={() => {
                setIsCreateListingOpen(false);
                setPropertyToEdit(null);
                setIsAdminVerificationMode(false);
                setModeratorContext(null);
                setIsAccountSettingsOpen(true);
              }}
            />
          </View>
        )}
        {/* Phase 4.5 — Landlord Application screen (user) */}
        {!!user && isLandlordApplicationOpen && (
          <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
            <LandlordApplicationScreen
              onBack={() => {
                setIsLandlordApplicationOpen(false);
                // Phase 4.5 nav fix: hop back to Profile when entry was a
                // Profile-rooted flow; otherwise fall through to Home (tab-tap
                // origin) — matches the Favorites/Appointments back pattern.
                if (returnToProfileAfterLandlordApplication) {
                  setIsProfileOpen(true);
                  setReturnToProfileAfterLandlordApplication(false);
                }
              }}
              onSubmitted={() => {
                setHomeRefreshKey((k) => k + 1); // refresh in case profile data changed
              }}
            />
          </View>
        )}
        {/* Phase 4.5 — Admin queue */}
        {!!user && isLandlordApplicationQueueOpen && (
          <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
            <LandlordApplicationQueueScreen
              onBack={() => {
                setIsLandlordApplicationQueueOpen(false);
                // Phase 4.5 nav fix: hop back to Profile (queue is only opened
                // from Profile today; flag stays correct even if a future
                // entry-point clears it explicitly).
                if (returnToProfileAfterLandlordApplicationQueue) {
                  setIsProfileOpen(true);
                  setReturnToProfileAfterLandlordApplicationQueue(false);
                }
              }}
            />
          </View>
        )}
        {/* Phase 3 Plan 06 — Moderation queue overlay (sibling to landlord-app queue). */}
        {!!user && isModerationQueueOpen && (
          <View style={[fullScreenOverlayWrap, { pointerEvents: 'auto' }]}>
            <ModerationQueueScreen
              onBack={() => {
                setIsModerationQueueOpen(false);
                // CR-02 fix: bump refresh key so ProfileScreen (kept-alive under
                // the overlay) refetches the pending-count badge when the moderator
                // returns from approving/rejecting.
                setModerationCountRefreshKey((k) => k + 1);
              }}
              onOpenPropertyDetails={(p) => setSelectedProperty(p)}
              onEditOnBehalf={(p) => {
                setIsModerationQueueOpen(false);
                setModerationCountRefreshKey((k) => k + 1);
                setIsAdminVerificationMode(false);
                setPropertyToEdit(p);
                setModeratorContext({
                  editingOwnerUid: (p.owner?.uid || (p as any).ownerUid || '') as string,
                  ownerEmail: p.owner?.email,
                });
                setIsCreateListingOpen(true);
              }}
            />
          </View>
        )}
      </View>

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
          setShowForgotPasswordModal(false);
          setShowResetPasswordModal(false);
          setResetPasswordInitialOobCode(null);
          setShowLoginModal(true);
        }}
        onSignup={() => {
          setShowAuthPrompt(false);
          setShowForgotPasswordModal(false);
          setShowResetPasswordModal(false);
          setResetPasswordInitialOobCode(null);
          setShowSignupModal(true);
        }}
        message={authPromptMessage}
      />

      {/* Auth: reset password, forgot password, login, signup (single full-screen stack) */}
      {(showResetPasswordModal ||
        showForgotPasswordModal ||
        showLoginModal ||
        showSignupModal) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: colors.background,
          }}
        >
          {showResetPasswordModal ? (
            <ResetPasswordScreen
              initialOobCode={resetPasswordInitialOobCode}
              onConsumedInitialOobCode={() => setResetPasswordInitialOobCode(null)}
              onBackToLogin={() => {
                setShowResetPasswordModal(false);
                setResetPasswordInitialOobCode(null);
                setShowLoginModal(true);
              }}
              onClose={() => {
                setShowResetPasswordModal(false);
                setResetPasswordInitialOobCode(null);
              }}
            />
          ) : showForgotPasswordModal ? (
            <ForgotPasswordScreen
              onOpenSetNewPassword={() => {
                setShowForgotPasswordModal(false);
                setShowResetPasswordModal(true);
              }}
              onBackToLogin={() => {
                setShowForgotPasswordModal(false);
                setShowLoginModal(true);
              }}
              onClose={() => setShowForgotPasswordModal(false)}
            />
          ) : showLoginModal ? (
            <LoginScreen
              onNavigateToForgotPassword={() => {
                setShowLoginModal(false);
                setShowForgotPasswordModal(true);
              }}
              onNavigateToSignup={() => {
                setShowLoginModal(false);
                setShowForgotPasswordModal(false);
                setShowResetPasswordModal(false);
                setResetPasswordInitialOobCode(null);
                setShowSignupModal(true);
              }}
              onClose={() => setShowLoginModal(false)}
            />
          ) : (
            <SignupScreen
              onNavigateToLogin={() => {
                setShowSignupModal(false);
                setShowForgotPasswordModal(false);
                setShowResetPasswordModal(false);
                setResetPasswordInitialOobCode(null);
                setShowLoginModal(true);
              }}
              onClose={() => setShowSignupModal(false)}
            />
          )}
        </View>
      )}
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export default App;
