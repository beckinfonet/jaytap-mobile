import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Property, Tour } from '../data/mockProperties';

interface TourSelectionScreenProps {
    property: Property;
    onSelectTour: (url: string) => void;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export const TourSelectionScreen: React.FC<TourSelectionScreenProps> = ({ property, onSelectTour, onClose }) => {
    const { colors, isDark } = useTheme();

    const renderTourItem = ({ item }: { item: Tour }) => (
        <TouchableOpacity
            style={[styles.tourCard, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
            onPress={() => onSelectTour(item.url)}
            activeOpacity={0.9}
        >
            <View style={styles.thumbnailContainer}>
                {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                    <View style={[styles.placeholderThumbnail, { backgroundColor: colors.inputBackground }]}>
                        <Text style={{ fontSize: 40 }}>👓</Text>
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <View style={[styles.playButton, { backgroundColor: '#6C63FF' }]}>
                        <Text style={[styles.playIcon, { color: '#FFF' }]}>▶</Text>
                    </View>
                    <View style={styles.interactiveLabel}>
                        <Text style={styles.interactiveLabelText}>360° VIEW</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.tourTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.tourSubtitle, { color: colors.textSecondary }]}>Interactive 3D Walkthrough</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Select 3D Tour</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    <FlatList
                        data={property.tours}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTourItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        padding: 20,
    },
    tourCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    thumbnailContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    placeholderThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    interactiveLabel: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    interactiveLabelText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    playIcon: {
        fontSize: 24,
        marginLeft: 4, // Visual center correction
        color: '#333',
    },
    cardContent: {
        padding: 16,
    },
    tourTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    tourSubtitle: {
        fontSize: 14,
    }
});

