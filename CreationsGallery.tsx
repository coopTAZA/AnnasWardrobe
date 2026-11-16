import { useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Creation = {
  name: string;
  uri: string;
  modifiedAt: number;
  available: boolean;
};

type GalleryContents = {
  creations: Creation[];
  hasError: boolean;
};

type ActiveAction = 'share' | 'photos' | null;

type CreationsGalleryProps = {
  onBack: () => void;
};

function readCreations(): GalleryContents {
  try {
    const directory = new Directory(Paths.document, 'creations');
    const files = directory.exists
      ? directory.list().filter((entry): entry is File =>
        entry instanceof File && entry.name.toLowerCase().endsWith('.png'),
      )
      : [];
    const creations = files
      .map((file) => ({
        name: file.name,
        uri: file.uri,
        modifiedAt: file.lastModified ?? 0,
        available: file.exists && file.size > 0,
      }))
      .sort((left, right) =>
        right.modifiedAt - left.modifiedAt || right.name.localeCompare(left.name),
      );

    return { creations, hasError: false };
  } catch (error) {
    console.error('Unable to load saved creations', error);
    return { creations: [], hasError: true };
  }
}

export default function CreationsGallery({ onBack }: CreationsGalleryProps) {
  const [gallery, setGallery] = useState<GalleryContents>(readCreations);
  const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null);
  const [unavailableUris, setUnavailableUris] = useState<Set<string>>(() => new Set());
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const { creations, hasError: loadError } = gallery;

  const loadCreations = () => {
    const nextGallery = readCreations();
    setGallery(nextGallery);
    setUnavailableUris(
      new Set(nextGallery.creations.filter((creation) => !creation.available).map((creation) => creation.uri)),
    );
  };

  const markUnavailable = (uri: string) => {
    setUnavailableUris((current) => new Set(current).add(uri));
  };

  const selectedIsUnavailable =
    selectedCreation !== null &&
    (!selectedCreation.available || unavailableUris.has(selectedCreation.uri));

  const shareCreation = async () => {
    if (!selectedCreation || activeAction) {
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Sharing unavailable', 'File sharing is not available in a web browser.');
      return;
    }

    const file = new File(selectedCreation.uri);
    if (!file.exists || file.size <= 0) {
      markUnavailable(selectedCreation.uri);
      Alert.alert('Picture unavailable', 'This saved picture can no longer be opened.');
      return;
    }

    setActiveAction('share');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Share your creation',
        mimeType: 'image/png',
      });
    } catch (error) {
      console.error('Unable to share saved creation', error);
      Alert.alert('Unable to share', 'This creation could not be shared. Please try again.');
    } finally {
      setActiveAction(null);
    }
  };

  const saveToPhotos = async () => {
    if (!selectedCreation || activeAction) {
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Saving to Photos is available in the mobile app.');
      return;
    }

    const file = new File(selectedCreation.uri);
    if (!file.exists || file.size <= 0) {
      markUnavailable(selectedCreation.uri);
      Alert.alert('Picture unavailable', 'This saved picture can no longer be opened.');
      return;
    }

    setActiveAction('photos');
    try {
      let permission = await MediaLibrary.getPermissionsAsync(true, ['photo']);
      if (!permission.granted && permission.canAskAgain) {
        permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      }
      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          permission.canAskAgain
            ? 'Please allow photo access to save this creation to Photos.'
            : 'Please enable photo access in your device settings to save this creation.',
        );
        return;
      }

      await Asset.create(file.uri);
      Alert.alert('Saved to Photos', 'Your creation has been added to Photos! 💖');
    } catch (error) {
      console.error('Unable to save creation to Photos', error);
      Alert.alert('Unable to save to Photos', 'Please try again.');
    } finally {
      setActiveAction(null);
    }
  };

  const deleteCreation = (creation: Creation) => {
    try {
      const file = new File(creation.uri);
      if (file.exists) {
        file.delete();
      }
      setGallery((current) => ({
        ...current,
        creations: current.creations.filter((item) => item.uri !== creation.uri),
      }));
      setUnavailableUris((current) => {
        const next = new Set(current);
        next.delete(creation.uri);
        return next;
      });
      setSelectedCreation(null);
    } catch (error) {
      console.error('Unable to delete saved creation', error);
      Alert.alert('Unable to delete', 'This creation could not be deleted. Please try again.');
    }
  };

  const confirmDelete = () => {
    if (!selectedCreation) {
      return;
    }
    Alert.alert(
      'Delete this creation?',
      'This permanently removes it from My Creations. A copy saved to Photos will stay there.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCreation(selectedCreation),
        },
      ],
    );
  };

  const renderCreation = ({ item, index }: { item: Creation; index: number }) => {
    const unavailable = !item.available || unavailableUris.has(item.uri);
    return (
      <Pressable
        accessibilityLabel={unavailable ? 'Unavailable saved creation' : `View creation ${index + 1}`}
        accessibilityRole="button"
        onPress={() => setSelectedCreation(item)}
        style={({ pressed }) => [styles.creationCard, pressed && styles.pressed]}
      >
        <View style={styles.thumbnailFrame}>
          {unavailable ? (
            <UnavailablePicture />
          ) : (
            <Image
              accessible={false}
              onError={() => markUnavailable(item.uri)}
              resizeMode="contain"
              source={{ uri: item.uri }}
              style={styles.thumbnail}
            />
          )}
        </View>
        <Text style={styles.creationTitle}>Creation {index + 1}</Text>
        <Text style={styles.creationDate}>
          {item.modifiedAt > 0 ? new Date(item.modifiedAt).toLocaleDateString() : 'Saved picture'}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {selectedCreation ? (
        <View style={styles.viewer}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back to My Creations"
              accessibilityRole="button"
              onPress={() => setSelectedCreation(null)}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>‹ Gallery</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.headerTitle}>Your Creation</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.viewerImageArea}>
            {selectedIsUnavailable ? (
              <UnavailablePicture large />
            ) : (
              <Image
                accessibilityLabel="Selected saved creation"
                onError={() => markUnavailable(selectedCreation.uri)}
                resizeMode="contain"
                source={{ uri: selectedCreation.uri }}
                style={styles.fullImage}
              />
            )}
          </View>

          <View style={styles.actions}>
            <GalleryActionButton
              disabled={activeAction !== null || selectedIsUnavailable}
              label={activeAction === 'share' ? 'Sharing...' : 'Share'}
              onPress={shareCreation}
              variant="pink"
            />
            <GalleryActionButton
              disabled={activeAction !== null || selectedIsUnavailable}
              label={activeAction === 'photos' ? 'Saving...' : 'Save to Photos'}
              onPress={saveToPhotos}
              variant="purple"
            />
            <GalleryActionButton
              disabled={activeAction !== null}
              label="Delete"
              onPress={confirmDelete}
              variant="delete"
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back to home"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>‹ Back</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.headerTitle}>My Creations ✨</Text>
            <Pressable
              accessibilityLabel="Refresh creations"
              accessibilityRole="button"
              onPress={loadCreations}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
            >
              <Text style={styles.refreshButtonText}>↻</Text>
            </Pressable>
          </View>

          {loadError ? (
            <View style={styles.messageState}>
              <Text style={styles.messageTitle}>We couldn&apos;t open your gallery.</Text>
              <Text style={styles.messageText}>Please try again.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={loadCreations}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : creations.length === 0 ? (
            <View style={styles.messageState}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.messageTitle}>Your creations will sparkle here!</Text>
              <Text style={styles.messageText}>
                Save a dress-up picture and it will appear in your gallery.
              </Text>
            </View>
          ) : (
            <FlatList
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              data={creations}
              keyExtractor={(item) => item.uri}
              numColumns={2}
              renderItem={renderCreation}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function UnavailablePicture({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.unavailable, large && styles.unavailableLarge]}>
      <Text style={styles.unavailableIcon}>🖼️</Text>
      <Text style={styles.unavailableText}>Picture unavailable</Text>
    </View>
  );
}

function GalleryActionButton({
  disabled,
  label,
  onPress,
  variant,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  variant: 'pink' | 'purple' | 'delete';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        styles[variant],
        disabled && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionButtonText, variant === 'delete' && styles.deleteText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF5FB',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    minWidth: 76,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E5F8',
  },
  backButtonText: {
    color: '#80449C',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 8,
    color: '#54365F',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 76,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8DEFF',
  },
  refreshButtonText: {
    color: '#80449C',
    fontSize: 28,
    lineHeight: 32,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  creationCard: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F0D8EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#76537A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnailFrame: {
    width: '100%',
    aspectRatio: 0.78,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#F8EFF9',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  creationTitle: {
    marginTop: 8,
    color: '#62456D',
    fontSize: 14,
    fontWeight: '700',
  },
  creationDate: {
    marginTop: 2,
    color: '#9B879F',
    fontSize: 12,
  },
  messageState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  emptyIcon: {
    marginBottom: 12,
    fontSize: 42,
  },
  messageTitle: {
    color: '#62456D',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageText: {
    marginTop: 8,
    color: '#88748F',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    marginTop: 18,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A64FC1',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewer: {
    flex: 1,
  },
  viewerImageArea: {
    flex: 1,
    minHeight: 100,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pink: {
    backgroundColor: '#D343B5',
  },
  purple: {
    backgroundColor: '#9152D5',
  },
  delete: {
    backgroundColor: '#F6E8F4',
    borderWidth: 1,
    borderColor: '#E8C7DF',
  },
  deleteText: {
    color: '#9B3D78',
  },
  disabledAction: {
    opacity: 0.55,
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  unavailableLarge: {
    width: '100%',
  },
  unavailableIcon: {
    fontSize: 30,
  },
  unavailableText: {
    marginTop: 6,
    color: '#88748F',
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
