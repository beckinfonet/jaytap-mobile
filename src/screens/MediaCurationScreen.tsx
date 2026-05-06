/**
 * Phase 3 Plan 03-05 — MediaCurationScreen (mod-only).
 *
 * Mounted as a full-screen overlay from App.tsx state machine when a
 * moderator picks "Curate media" on a listing in the moderation queue
 * (or taps the NeedsMediaBanner CTA — Plan 03-06 wires the entry-points).
 *
 * Renders: header (X close + title) → photo grid (3-col, 1:1 tiles, +
 * add tile, per-tile delete-X with scrim, "Not saved" pending badge) →
 * video grid (same shape, cap 5) → tour URL input (https-only validation
 * on blur) → 2-button action footer (Save photos secondary, Approve &
 * publish primary; Approve disabled when listing.media.photos.length === 0).
 *
 * Three-layer mod gate (T-04 mitigation):
 *   1. App.tsx mount conditional `!!user && isMediaCurationOpen`
 *   2. useRole().can('approveListings') early return inside this component
 *   3. MediaCurationService capability gate before any API call
 *
 * Theme: 100% useTheme() tokens. Two new revision-2 W6 tokens consumed:
 * `colors.onAccent` (text on accent CTA) + `colors.scrim` (delete-X
 * overlay + loading-overlay backdrop). ZERO hex / rgba literals in this
 * file (CLAUDE.md "no hardcoded colors" mandate; Phase 3 acceptance ≤ 0).
 *
 * Pattern composition (PATTERNS.md §"src/screens/MediaCurationScreen.tsx"):
 *  - Pattern A — header + SafeAreaView (LandlordApplicationScreen.tsx)
 *  - Pattern B — prop signature
 *  - Pattern C — ImagePicker invocation (LandlordApplicationScreen.tsx:109-132)
 *  - Pattern D — FormData multipart (RESEARCH §Code Example 3)
 *  - Pattern E — RejectionBanner / mod-context banner
 *  - Pattern F — 2-button action footer (PropertyDetailsScreen.tsx:1481-1537)
 *  - Pattern G — 409 race-toast handling (PropertyDetailsScreen.tsx:308-313)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'react-native-image-picker';
import {
  X,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../hooks/useRole';
import { commonStyles } from '../components/ContextualListingFlow/styles';
import {
  MediaCurationService,
  PendingAsset,
} from '../services/MediaCurationService';
import { PropertyService } from '../services/PropertyService';

interface MediaCurationScreenProps {
  listingId: string;
  onClose: () => void;
  /** Fires after a successful POST /approve so the parent can refresh queue + close. */
  onApproveSuccess?: () => void;
}

// Photo grid sizing (UI-SPEC §"Photo grid sizing" lines 319-324).
const TILE_GAP = 8;
const SCROLL_PADDING_X = 20;
const NUM_COLUMNS = 3;

const PHOTOS_CAP = 40;
const VIDEOS_CAP = 5;

export const MediaCurationScreen: React.FC<MediaCurationScreenProps> = ({
  listingId,
  onClose,
  onApproveSuccess,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<any | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingAsset[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingAsset[]>([]);
  const [tourUrlDraft, setTourUrlDraft] = useState<string>('');
  const [tourUrlValid, setTourUrlValid] = useState<boolean>(true);
  const [submittingSave, setSubmittingSave] = useState<boolean>(false);
  const [submittingApprove, setSubmittingApprove] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState<boolean>(true);

  // ---------------------------------------------------------------------
  // UI-SPEC §Surface 1 line 272 + RESEARCH §Open Question #2 RESOLVED YES.
  // Belt-and-suspenders mod gate. App.tsx mount conditional already gates
  // this screen behind !!user && isMediaCurationOpen, but the screen
  // itself returns null if the role is missing — closes a deep-link or
  // hot-reload race where the screen could mount before the role check.
  // ---------------------------------------------------------------------
  if (!can('approveListings')) {
    console.error(
      '[MediaCurationScreen] mounted by non-mod — gating closed (belt-and-suspenders)',
    );
    return null;
  }

  // Photo / video tile dimensions — recomputed once per render via useMemo
  // because Dimensions.get('window') is a synchronous read (rotation handling
  // is out of scope for Phase 3; UI-SPEC §"Out of Scope").
  const tileSize = useMemo(() => {
    const screenW = Dimensions.get('window').width;
    return (
      (screenW - SCROLL_PADDING_X * 2 - TILE_GAP * (NUM_COLUMNS - 1)) /
      NUM_COLUMNS
    );
  }, []);

  // -- Effect: fetch the listing on mount ---------------------------------
  useEffect(() => {
    let mounted = true;
    setLoadingListing(true);
    (async () => {
      try {
        // NOTE: PropertyService method is `getPropertyById` in this codebase
        // (plan body referenced `getById` — Rule 1 deviation; using actual name).
        const data = await PropertyService.getPropertyById(listingId);
        if (!mounted) return;
        setListing(data);
        setTourUrlDraft(data?.media?.tourUrl || '');
      } catch (err: any) {
        if (mounted) {
          setLoadError(err?.message || 'Failed to load listing');
        }
      } finally {
        if (mounted) setLoadingListing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listingId]);

  // ---------------------------------------------------------------------
  // Picker invocation (UI-SPEC §"Picker config (locked)" lines 388-403 +
  // Pitfall 1 — `assetRepresentationMode: 'compatible'` so HEIC images
  // come back as JPEG; quality 0.85 to avoid the iOS 17 quality:1 HEIC
  // bug). Cap-overflow truncation with cap.toast.{photos,videos}.
  // ---------------------------------------------------------------------
  const handlePickMedia = useCallback(() => {
    if (!ImagePicker || !ImagePicker.launchImageLibrary) {
      Alert.alert(
        t('common.error'),
        t('moderation.mediaCuration.error.pickerUnavailable'),
      );
      return;
    }
    const existingPhotosCount =
      (listing?.media?.photos?.length || 0) + pendingPhotos.length;
    const existingVideosCount =
      (listing?.media?.videos?.length || 0) + pendingVideos.length;

    if (existingPhotosCount >= PHOTOS_CAP && existingVideosCount >= VIDEOS_CAP) {
      Alert.alert(
        t('common.info'),
        t('moderation.mediaCuration.cap.toast.photos', {
          taken: '0',
          requested: '0',
        }),
      );
      return;
    }

    ImagePicker.launchImageLibrary(
      {
        mediaType: 'mixed',
        selectionLimit: 0,
        // Pitfall 1: HEIC → JPEG conversion. Default 'current' returns the raw
        // HEIC blob which the backend doesn't accept (multer fileFilter rejects
        // image/heic). 'compatible' transcodes to JPEG so multipart uploads
        // succeed without a server-side decoder.
        assetRepresentationMode: 'compatible',
        // PhotoQuality lib type is a literal union 0..1 in 0.1 steps — 0.85 is
        // not assignable. Plan's 0.85 intent ("avoid HEIC bug at quality:1")
        // is preserved by 0.8, which matches LandlordApplicationScreen's
        // existing call site (the only other ImagePicker invocation in the
        // codebase). [Rule 1 - Bug] auto-fix: corrected from plan body 0.85.
        quality: 0.8,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert(t('common.error'), response.errorMessage);
          return;
        }
        const assets = response.assets ?? [];
        const newPhotos = assets.filter((a) => a.type?.startsWith('image/'));
        const newVideos = assets.filter((a) => a.type?.startsWith('video/'));

        const photoSlots = Math.max(0, PHOTOS_CAP - existingPhotosCount);
        const videoSlots = Math.max(0, VIDEOS_CAP - existingVideosCount);
        const takenPhotos = Math.min(newPhotos.length, photoSlots);
        const takenVideos = Math.min(newVideos.length, videoSlots);

        if (takenPhotos < newPhotos.length) {
          Alert.alert(
            t('common.info'),
            t('moderation.mediaCuration.cap.toast.photos', {
              taken: String(takenPhotos),
              requested: String(newPhotos.length),
            }),
          );
        }
        if (takenVideos < newVideos.length) {
          Alert.alert(
            t('common.info'),
            t('moderation.mediaCuration.cap.toast.videos', {
              taken: String(takenVideos),
              requested: String(newVideos.length),
            }),
          );
        }

        if (takenPhotos > 0) {
          setPendingPhotos((prev) => [
            ...prev,
            ...newPhotos.slice(0, takenPhotos).map((a) => ({
              uri: a.uri!,
              type: a.type,
              fileName: a.fileName,
            })),
          ]);
        }
        if (takenVideos > 0) {
          setPendingVideos((prev) => [
            ...prev,
            ...newVideos.slice(0, takenVideos).map((a) => ({
              uri: a.uri!,
              type: a.type,
              fileName: a.fileName,
            })),
          ]);
        }
      },
    );
  }, [listing, pendingPhotos, pendingVideos, t]);

  // -- Save handler (UI-SPEC §"Action footer" Save button) ----------------
  const tourUrlChanged = useMemo(
    () => tourUrlDraft !== (listing?.media?.tourUrl || ''),
    [tourUrlDraft, listing],
  );
  const hasPendingMedia = pendingPhotos.length > 0 || pendingVideos.length > 0;
  const isSaveEnabled = !submittingSave && (hasPendingMedia || tourUrlChanged);

  const validateTourUrl = useCallback((value: string): boolean => {
    if (!value) return true; // empty is valid (server treats undefined as "leave alone")
    try {
      const u = new URL(value);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  const handleTourUrlBlur = useCallback(() => {
    setTourUrlValid(validateTourUrl(tourUrlDraft));
  }, [tourUrlDraft, validateTourUrl]);

  const handleSave = useCallback(async () => {
    if (submittingSave) return;
    const tourUrlToSend =
      tourUrlChanged && tourUrlDraft ? tourUrlDraft : undefined;
    if (!hasPendingMedia && !tourUrlToSend) return;

    if (tourUrlToSend && !validateTourUrl(tourUrlToSend)) {
      setTourUrlValid(false);
      Alert.alert(
        t('common.error'),
        t('moderation.mediaCuration.error.invalidTourUrl'),
      );
      return;
    }

    setSubmittingSave(true);
    try {
      const updated = await MediaCurationService.uploadMedia(
        listingId,
        pendingPhotos,
        pendingVideos,
        tourUrlToSend,
      );
      setListing(updated);
      setPendingPhotos([]);
      setPendingVideos([]);
      setTourUrlDraft(updated?.media?.tourUrl || '');
      Alert.alert(
        t('common.success'),
        t('moderation.mediaCuration.save.success'),
      );
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      // Pattern G — 409 race-toast handling.
      if (status === 409) {
        Alert.alert(
          t('moderation.race.title'),
          t('moderation.race.toast'),
        );
        try {
          const refreshed = await PropertyService.getPropertyById(listingId);
          setListing(refreshed);
        } catch (_e) {
          /* best-effort refetch; original error already surfaced */
        }
      } else if (code === 'MEDIA_INVALID_TYPE') {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.invalidType'),
        );
      } else if (code === 'MEDIA_INVALID_TOUR_URL') {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.invalidTourUrl'),
        );
      } else if (
        code === 'MEDIA_FILE_TOO_LARGE' ||
        code === 'MEDIA_TOO_MANY_FILES'
      ) {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.tooLarge'),
        );
      } else {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.uploadFailed'),
        );
      }
    } finally {
      setSubmittingSave(false);
    }
  }, [
    listingId,
    pendingPhotos,
    pendingVideos,
    tourUrlDraft,
    tourUrlChanged,
    hasPendingMedia,
    submittingSave,
    validateTourUrl,
    t,
  ]);

  // -- Approve handler (D-12 — disabled until photos.length > 0) ----------
  const isApproveEnabled =
    !submittingApprove && (listing?.media?.photos?.length ?? 0) > 0;

  const handleApprove = useCallback(async () => {
    if (submittingApprove) return;
    if (!listing || (listing.media?.photos?.length ?? 0) === 0) return;
    setSubmittingApprove(true);
    try {
      await PropertyService.approveListing(listingId);
      onApproveSuccess?.();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (code === 'MEDIA_REQUIRED') {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.mediaRequired'),
        );
        try {
          const refreshed = await PropertyService.getPropertyById(listingId);
          setListing(refreshed);
        } catch (_e) {
          /* best-effort */
        }
      } else if (status === 409) {
        Alert.alert(
          t('moderation.race.title'),
          t('moderation.race.toast'),
        );
      } else {
        Alert.alert(
          t('common.error'),
          t('moderation.mediaCuration.error.uploadFailed'),
        );
      }
    } finally {
      setSubmittingApprove(false);
    }
  }, [listingId, listing, submittingApprove, t, onApproveSuccess]);

  // -- Per-tile delete handlers ------------------------------------------
  const handleDeleteSavedAsset = useCallback(
    async (url: string, kind: 'photo' | 'video') => {
      try {
        const updated = await MediaCurationService.deleteMediaAsset(
          listingId,
          url,
          kind,
        );
        setListing(updated);
      } catch (err: any) {
        if (err?.response?.status === 409) {
          Alert.alert(
            t('moderation.race.title'),
            t('moderation.race.toast'),
          );
        } else {
          Alert.alert(
            t('common.error'),
            t('moderation.mediaCuration.error.uploadFailed'),
          );
        }
      }
    },
    [listingId, t],
  );

  const handleRemovePending = useCallback(
    (index: number, kind: 'photo' | 'video') => {
      if (kind === 'photo') {
        setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
      } else {
        setPendingVideos((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [],
  );

  // -- Derived: photo / video counts for section labels ------------------
  const savedPhotos: string[] = listing?.media?.photos ?? [];
  const savedVideos: string[] = listing?.media?.videos ?? [];
  const totalPhotos = savedPhotos.length + pendingPhotos.length;
  const totalVideos = savedVideos.length + pendingVideos.length;
  const showAddPhotoTile = totalPhotos < PHOTOS_CAP;
  const showAddVideoTile = totalVideos < VIDEOS_CAP;
  const isPhotoSectionEmpty = totalPhotos === 0;

  // ---------------------------------------------------------------------
  // RENDER — UI-SPEC §Surface 1 ASCII diagram lines 277-309
  // ---------------------------------------------------------------------

  // -- Sub-renderer: a single saved (server-URL) photo / video tile -------
  const renderSavedTile = (
    url: string,
    kind: 'photo' | 'video',
    keyPrefix: string,
  ) => (
    <View
      key={`${keyPrefix}-${url}`}
      style={[
        styles.tile,
        {
          width: tileSize,
          height: tileSize,
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={{ uri: url }}
        style={styles.tileImage}
        resizeMode="cover"
      />
      {kind === 'video' && (
        <View
          style={[
            styles.videoOverlayCenter,
            { backgroundColor: colors.scrim },
          ]}
        >
          <VideoIcon size={32} color={colors.onAccent} />
        </View>
      )}
      <TouchableOpacity
        accessibilityLabel={t('moderation.mediaCuration.delete.a11y')}
        onPress={() => handleDeleteSavedAsset(url, kind)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        style={[styles.deleteX, { backgroundColor: colors.scrim }]}
      >
        <X size={14} color={colors.onAccent} />
      </TouchableOpacity>
    </View>
  );

  // -- Sub-renderer: a pending (not-yet-uploaded) tile --------------------
  const renderPendingTile = (
    asset: PendingAsset,
    kind: 'photo' | 'video',
    index: number,
    keyPrefix: string,
  ) => (
    <View
      key={`${keyPrefix}-pending-${index}-${asset.uri}`}
      style={[
        styles.tile,
        {
          width: tileSize,
          height: tileSize,
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={{ uri: asset.uri }}
        style={[styles.tileImage, { opacity: 0.85 }]}
        resizeMode="cover"
      />
      {kind === 'video' && (
        <View
          style={[
            styles.videoOverlayCenter,
            { backgroundColor: colors.scrim },
          ]}
        >
          <VideoIcon size={32} color={colors.onAccent} />
        </View>
      )}
      <View
        style={[
          styles.pendingBadge,
          { backgroundColor: colors.warning },
        ]}
      >
        <Text style={[styles.pendingBadgeText, { color: colors.onWarning }]}>
          {t('moderation.mediaCuration.pending.badge')}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityLabel={t('moderation.mediaCuration.delete.a11y')}
        onPress={() => handleRemovePending(index, kind)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        style={[styles.deleteX, { backgroundColor: colors.scrim }]}
      >
        <X size={14} color={colors.onAccent} />
      </TouchableOpacity>
    </View>
  );

  // -- Sub-renderer: the `+` add tile -------------------------------------
  const renderAddTile = (key: string) => (
    <TouchableOpacity
      key={key}
      onPress={handlePickMedia}
      accessibilityLabel={t('moderation.mediaCuration.empty.title')}
      style={[
        styles.addTile,
        {
          width: tileSize,
          height: tileSize,
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
        },
      ]}
    >
      <Plus size={32} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar barStyle="default" />

      {/* UI-SPEC §Surface 1 lines 312-317 — Header band (X close + title). */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onClose}
          accessibilityLabel={t('moderation.mediaCuration.header.close.a11y')}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.headerClose}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[
            commonStyles.sectionTitle,
            { color: colors.text, marginBottom: 0 },
          ]}
          numberOfLines={1}
        >
          {t('moderation.mediaCuration.header.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loadingListing && !listing ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Text style={{ color: colors.textSecondary }}>{loadError}</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={[
            commonStyles.scrollContent,
            { paddingBottom: 140 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* UI-SPEC §Surface 1 lines 319-339 — Photo grid. */}
          <View style={commonStyles.section}>
            <Text
              style={[commonStyles.sectionLabel, { color: colors.text }]}
            >
              {t('moderation.mediaCuration.photos.section', {
                count: String(totalPhotos),
              })}
            </Text>
            <View style={styles.grid}>
              {savedPhotos.map((url) => renderSavedTile(url, 'photo', 'photo'))}
              {pendingPhotos.map((a, i) =>
                renderPendingTile(a, 'photo', i, 'photo'),
              )}
              {showAddPhotoTile && renderAddTile('add-photo')}
            </View>

            {/* UI-SPEC §Surface 1 lines 384-395 — Empty state under photo grid. */}
            {isPhotoSectionEmpty && (
              <View style={styles.emptyState}>
                <ImageIcon size={48} color={colors.textTertiary} />
                <Text
                  style={[styles.emptyTitle, { color: colors.text }]}
                >
                  {t('moderation.mediaCuration.empty.title')}
                </Text>
                <Text
                  style={[
                    styles.emptyBody,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t('moderation.mediaCuration.empty.body')}
                </Text>
              </View>
            )}
          </View>

          {/* UI-SPEC §Surface 1 lines 341-345 — Video grid. */}
          <View style={commonStyles.section}>
            <Text
              style={[commonStyles.sectionLabel, { color: colors.text }]}
            >
              {t('moderation.mediaCuration.videos.section', {
                count: String(totalVideos),
              })}
            </Text>
            <View style={styles.grid}>
              {savedVideos.map((url) => renderSavedTile(url, 'video', 'video'))}
              {pendingVideos.map((a, i) =>
                renderPendingTile(a, 'video', i, 'video'),
              )}
              {showAddVideoTile && renderAddTile('add-video')}
            </View>
          </View>

          {/* UI-SPEC §Surface 1 lines 347-358 — Tour URL input (single line + hint + invalid caption). */}
          <View style={commonStyles.section}>
            <Text
              style={[commonStyles.sectionLabel, { color: colors.text }]}
            >
              {t('moderation.mediaCuration.tourUrl.label')}
            </Text>
            <TextInput
              style={[
                commonStyles.input,
                {
                  borderColor: tourUrlValid ? colors.border : colors.error,
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                },
              ]}
              value={tourUrlDraft}
              onChangeText={(v) => {
                setTourUrlDraft(v);
                if (!tourUrlValid) setTourUrlValid(true); // clear stale invalid on edit
              }}
              onBlur={handleTourUrlBlur}
              placeholder={t('moderation.mediaCuration.tourUrl.placeholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {tourUrlValid ? (
              <Text
                style={[
                  styles.fieldHint,
                  { color: colors.textSecondary },
                ]}
              >
                {t('moderation.mediaCuration.tourUrl.hint')}
              </Text>
            ) : (
              <Text
                style={[
                  styles.fieldError,
                  { color: colors.error },
                ]}
              >
                {t('moderation.mediaCuration.tourUrl.invalid')}
              </Text>
            )}
          </View>
        </KeyboardAwareScrollView>
      )}

      {/* UI-SPEC §Surface 1 lines 360-382 — Action footer (sticky bottom). */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isSaveEnabled}
            style={[
              styles.footerButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                opacity: isSaveEnabled ? 1 : 0.5,
              },
            ]}
          >
            {submittingSave ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={[styles.footerButtonText, { color: colors.text }]}>
                {t('moderation.mediaCuration.save.button')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleApprove}
            disabled={!isApproveEnabled}
            style={[
              styles.footerButton,
              {
                backgroundColor: colors.success,
                opacity: isApproveEnabled ? 1 : 0.5,
              },
            ]}
          >
            {submittingApprove ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : (
              <Text
                style={[styles.footerButtonText, { color: colors.onAccent }]}
              >
                {t('moderation.mediaCuration.approve.button')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* UI-SPEC §Surface 1 line 376 — Disabled-hint below the row. Render
            ONLY when Approve is disabled because of the photos-empty rule
            (D-12). Suppress while submitting (transient disabled state). */}
        {!submittingApprove && (listing?.media?.photos?.length ?? 0) === 0 && (
          <Text
            style={[
              styles.footerHint,
              { color: colors.textSecondary },
            ]}
          >
            {t('moderation.mediaCuration.approve.disabled.hint')}
          </Text>
        )}
      </View>

      {/* UI-SPEC §"Loading state — upload progress" — translucent backdrop
          above the screen body when a save is in flight. colors.scrim is
          the W6 token replacing the previously grandfathered rgba literal. */}
      {submittingSave && (
        <View
          style={[styles.loadingBackdrop, { backgroundColor: colors.scrim }]}
        >
          <ActivityIndicator size="large" color={colors.onAccent} />
          <Text
            style={[styles.loadingLabel, { color: colors.onAccent }]}
          >
            {t('moderation.mediaCuration.save.loading')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// =====================================================================
// Styles — token-free dimensions only. All colors come from useTheme()
// at the consumption site (CLAUDE.md "no hardcoded colors" mandate).
// Hex literal budget: 0; rgba literal budget: 0 (revision 2 W6 acceptance).
// =====================================================================
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerClose: { padding: 4, marginRight: 12 },
  headerSpacer: { flex: 1 },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: { width: '100%', height: '100%' },
  videoOverlayCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addTile: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  emptyBody: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  fieldHint: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginTop: 6 },
  fieldError: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerRow: { flexDirection: 'row', gap: 12 },
  footerButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: { fontSize: 16, fontWeight: '600' },
  footerHint: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    paddingTop: 8,
    textAlign: 'center',
  },
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: { fontSize: 14, fontWeight: '600' },
});

export default MediaCurationScreen;
