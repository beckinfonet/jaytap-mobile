import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Eye, ChevronRight } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { formatTourHeroCount } from '../utils/formatTourHeroCount';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // Screen minus content padding

interface TourHeroCardProps {
  isActive: boolean;
  tourCount: number;
  isDark: boolean;
  inputBackground: string;
  textSecondary: string;
  borderColor: string;
  onPress: () => void;
}

export function TourHeroCard({
  isActive,
  tourCount,
  isDark,
  inputBackground,
  textSecondary,
  borderColor,
  onPress,
}: TourHeroCardProps) {
  const { t, language } = useLanguage();
  const titleColor = isActive ? '#FFF' : textSecondary;
  const subtitleColor = isActive ? 'rgba(255,255,255,0.9)' : textSecondary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isActive ? 'transparent' : inputBackground }]}
      onPress={isActive ? onPress : undefined}
      disabled={!isActive}
      activeOpacity={0.9}
    >
      {isActive && (
        <View style={styles.gradientLayer} pointerEvents="none">
          <Svg
            style={styles.gradientSvg}
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <Defs>
              <SvgLinearGradient id="tourCardGradAndroid" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={isDark ? '#4C1D95' : '#5B21B6'} />
                <Stop offset="1" stopColor={isDark ? '#7C3AED' : '#8B5CF6'} />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="url(#tourCardGradAndroid)" />
          </Svg>
        </View>
      )}
      <View style={styles.topRow}>
        {isActive && (
          <View style={[styles.premiumTag, { backgroundColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.25)' }]}>
            <View style={styles.premiumDot} />
            <Text style={styles.premiumText}>{t('tour.heroPremium')}</Text>
          </View>
        )}
        {isActive && (
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {formatTourHeroCount(tourCount, language, t)}
          </Text>
        )}
      </View>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : borderColor }]}>
          <Eye size={18} color={isActive ? '#FFF' : textSecondary} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail">
            {t('tour.heroTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1} ellipsizeMode="tail">
            {t('tour.heroSubtitle')}
          </Text>
        </View>
        {isActive && (
          <View style={styles.chevron}>
            <ChevronRight size={20} color="#FFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    maxWidth: '100%',
    borderRadius: 20,
    padding: 12,
    paddingBottom: 14,
    minHeight: 110,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  gradientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientSvg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    flexShrink: 0,
  },
  premiumDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  chevron: {
    marginLeft: 4,
  },
});
