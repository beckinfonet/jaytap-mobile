import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { Gated } from '../Gated';
import type { SectionProps } from './types';
import { commonStyles } from './styles';

/**
 * MediaSection — Phase 4 FORM-05 + FORM-03 preservation.
 *
 * LOAD-BEARING: this component preserves Phase 3's two admin-gated wrap sites verbatim
 * (see 03-05-SUMMARY §Six Migrated Sites + PROJECT.md Key Decisions row 124 D-08).
 *
 *   1. The Matterport-tours section is wrapped by an editMatterportUrl guard (whole-section scope, D-08 hide-entirely)
 *   2. The panoramic-URL input is wrapped by an editPanoramicUrl guard (element scope — only the single TextInput)
 *
 * MUST-NOT regressions:
 *   - videoUrl, instagramUrl, instagramHint, Images block: OUTSIDE all wraps (visible to non-admin)
 *   - The JSX in this file MUST contain exactly two admin-guard wrappers — this is an acceptance criterion
 *   - ./scripts/check-role-grep.sh MUST exit 0 after this file lands
 *
 * Image and tour state live in the orchestrator (RESEARCH §Pattern 2); this
 * component receives mutation callbacks (onSelectImages / onRemoveImage /
 * onAddTour / onRemoveTour) because the ImagePicker native module lives in
 * CreateListingScreen.
 *
 * Private sub-component styles (imagePickerButton, imagesGrid, imageItem,
 * imageThumbnail, removeImageButton, removeImageText, addTourButton,
 * addTourButtonText, toursList, tourItem, tourInfo, tourTitle, tourUrl,
 * removeTourButton, removeTourText) are colocated in a bottom-of-file
 * StyleSheet.create per the plan's action section — transcribed verbatim from
 * CreateListingScreen.tsx:1304-1402 to preserve pixel behavior.
 */
export interface MediaSectionProps extends SectionProps {
  onSelectImages: () => void | Promise<void>;
  onRemoveImage: (index: number) => void;
  onAddTour: () => void;
  onRemoveTour: (tourId: string) => void;
}

export function MediaSection({
  values,
  onChange,
  errors: _errors,
  onSelectImages,
  onRemoveImage,
  onAddTour,
  onRemoveTour,
}: MediaSectionProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <>
      {/* Images — always visible (no Gated wrap) */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.images')}
        </Text>
        <Text style={[commonStyles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
          {t('createListing.addImagesHintCount', { current: String(values.selectedImages.length) })}
        </Text>
        <TouchableOpacity
          style={[
            styles.imagePickerButton,
            { backgroundColor: colors.inputBackground, borderColor: colors.border },
          ]}
          onPress={onSelectImages}
          disabled={values.selectedImages.length >= 40}
          accessibilityRole="button"
          accessibilityLabel={t('createListing.selectImages')}
          accessibilityState={{ disabled: values.selectedImages.length >= 40 }}
        >
          <Text style={[styles.imagePickerButtonText, { color: colors.text }]}>
            {`📷 ${
              values.selectedImages.length >= 40
                ? t('createListing.maxImagesReached')
                : t('createListing.selectImages')
            }`}
          </Text>
        </TouchableOpacity>

        {values.selectedImages.length > 0 && (
          <View style={styles.imagesGrid}>
            {values.selectedImages.map((image, index) => (
              <View key={index} style={styles.imageItem}>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => onRemoveImage(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove image ${index + 1}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Matterport 3D Tours — admin only (D-08) — WHOLE SECTION wrap */}
      <Gated action="editMatterportUrl">
        <View style={commonStyles.section}>
          <Text
            style={[commonStyles.sectionTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            {t('createListing.tours3d')}
          </Text>
          <Text style={[commonStyles.hint, { color: colors.textSecondary, marginBottom: 12 }]}>
            {t('createListing.matterportHint')}
          </Text>

          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.tourTitle')}
            placeholderTextColor={colors.textSecondary}
            value={values.tourTitle}
            onChangeText={(v) => onChange('tourTitle', v)}
          />
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.matterportUrlExample')}
            placeholderTextColor={colors.textSecondary}
            value={values.tourUrl}
            onChangeText={(v) => onChange('tourUrl', v)}
            keyboardType="url"
          />
          <TouchableOpacity
            style={[
              styles.addTourButton,
              { backgroundColor: colors.primary, borderColor: colors.border },
            ]}
            onPress={onAddTour}
            accessibilityRole="button"
            accessibilityLabel={t('createListing.add3dTour')}
          >
            <Text
              style={[styles.addTourButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}
            >
              {t('createListing.add3dTour')}
            </Text>
          </TouchableOpacity>

          {values.tours.length > 0 && (
            <View style={styles.toursList}>
              {values.tours.map((tour) => (
                <View
                  key={tour.id}
                  style={[
                    styles.tourItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.tourInfo}>
                    <Text
                      style={[styles.tourTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {tour.title}
                    </Text>
                    <Text
                      style={[styles.tourUrl, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {tour.url}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeTourButton}
                    onPress={() => onRemoveTour(tour.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove tour ${tour.title}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={[styles.removeTourText, { color: colors.textSecondary }]}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </Gated>

      {/* Links — section title + videoUrl + editPanoramicUrl-guarded panoramic TextInput + instagramUrl + hint (all except panoramic TextInput outside wrap) */}
      <View style={commonStyles.section}>
        <Text
          style={[commonStyles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {t('createListing.links')}
        </Text>

        <TextInput
          style={[
            commonStyles.input,
            { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
          ]}
          placeholder={t('createListing.videoUrl')}
          placeholderTextColor={colors.textSecondary}
          value={values.videoUrl}
          onChangeText={(v) => onChange('videoUrl', v)}
          keyboardType="url"
        />

        {/* Panoramic URL — admin only (D-08) — ELEMENT-SCOPED wrap around ONLY this TextInput */}
        <Gated action="editPanoramicUrl">
          <TextInput
            style={[
              commonStyles.input,
              { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
            ]}
            placeholder={t('createListing.panoramicUrl')}
            placeholderTextColor={colors.textSecondary}
            value={values.panoramicPhotosUrl}
            onChangeText={(v) => onChange('panoramicPhotosUrl', v)}
            keyboardType="url"
          />
        </Gated>

        <TextInput
          style={[
            commonStyles.input,
            { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
          ]}
          placeholder={t('createListing.instagramUrl')}
          placeholderTextColor={colors.textSecondary}
          value={values.instagramUrl}
          onChangeText={(v) => onChange('instagramUrl', v)}
          keyboardType="url"
        />

        <Text style={[commonStyles.hint, { color: colors.textSecondary }]}>
          {t('createListing.instagramHint')}
        </Text>
      </View>
    </>
  );
}

// Private sub-component styles — transcribed verbatim from
// CreateListingScreen.tsx:1304-1402 to preserve pixel behavior. Dynamic color
// values are applied inline via useTheme() in the consumer; static layout /
// sizing / shadow values live here.
const styles = StyleSheet.create({
  imagePickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  imageItem: {
    width: (Dimensions.get('window').width - 60) / 3, // 3 columns with margins
    height: (Dimensions.get('window').width - 60) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addTourButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addTourButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toursList: {
    marginTop: 12,
    gap: 8,
  },
  tourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tourInfo: {
    flex: 1,
    marginRight: 12,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tourUrl: {
    fontSize: 12,
  },
  removeTourButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTourText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
