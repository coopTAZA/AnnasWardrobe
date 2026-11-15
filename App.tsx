import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import DressUpStudio from './DressUpStudio';

const welcomeArtwork = require('./assets/welcome.png.jpg');
const artworkAspectRatio = 2048 / 924;
const emblemCenterRatio = 0.214;

type SelectedPhoto = {
  uri: string;
  width: number;
  height: number;
};

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const contentWidth = Math.min(width - 44, 480);
  const artworkHeight = contentWidth * artworkAspectRatio;
  const [screen, setScreen] = useState<'welcome' | 'studio'>('welcome');
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} will be available soon.`);
  };

  const showPickerError = (action: string, error: unknown) => {
    const message = error instanceof Error ? error.message : 'Please try again.';
    Alert.alert(action, message);
  };

  const openStudio = (photo: SelectedPhoto) => {
    setSelectedPhoto(photo);
    setScreen('studio');
  };

  const takePhoto = async () => {
    try {
      const currentPermission = await ImagePicker.getCameraPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera access needed',
          permission.canAskAgain
            ? 'Please allow camera access to take a photo.'
            : 'Please enable camera access in your device settings to take a photo.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const photo = result.assets[0];
      if (!photo || photo.width <= 0 || photo.height <= 0) {
        Alert.alert('No photo captured', 'Please try taking your photo again.');
        return;
      }

      openStudio({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch (error) {
      showPickerError('Unable to open the camera', error);
    }
  };

  const choosePhoto = async () => {
    try {
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          permission.canAskAgain
            ? 'Please allow photo access to choose an image.'
            : 'Please enable photo access in your device settings to choose an image.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const photo = result.assets[0];
      if (!photo || photo.width <= 0 || photo.height <= 0) {
        Alert.alert('No photo selected', 'Please choose an image to continue.');
        return;
      }

      openStudio({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch (error) {
      showPickerError('Unable to open your photo library', error);
    }
  };

  if (screen === 'studio' && selectedPhoto) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <View pointerEvents="none" style={styles.glowTop} />
          <View pointerEvents="none" style={styles.glowBottom} />
          <DressUpStudio
            onBack={() => {
              setScreen('welcome');
              setSelectedPhoto(null);
            }}
            onSave={() => showComingSoon('Saving')}
            photo={selectedPhoto}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <View style={styles.topBarSpacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => showComingSoon('Settings')}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Text style={styles.settingsIcon}>⚙︎</Text>
            </Pressable>
          </View>

          <View style={styles.heroRow}>
            <Text accessible={false} style={[styles.sparkle, styles.leftSparkle]}>✦</Text>
            <View style={styles.artworkCrop}>
              <Image
                accessible={false}
                resizeMode="stretch"
                source={welcomeArtwork}
                style={[
                  styles.artworkImage,
                  {
                    width: contentWidth,
                    height: artworkHeight,
                    left: (styles.artworkCrop.width - contentWidth) / 2,
                    top: styles.artworkCrop.height / 2 + 10 - artworkHeight * emblemCenterRatio,
                  },
                ]}
              />
            </View>
            <Text accessible={false} style={[styles.sparkle, styles.rightSparkle]}>✧</Text>
          </View>

          <Text style={[styles.title, compact && styles.compactTitle]}>
            Anna&apos;s{'\n'}
            <Text style={styles.titleAccent}>Wardrobe</Text>
          </Text>
          <Text style={styles.subtitle}>
            Dream up a look and let your{'\n'}creativity sparkle.
          </Text>

          <View style={styles.buttonList}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take a Photo"
              onPress={takePhoto}
              style={({ pressed }) => [styles.actionButton, styles.pinkButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonIcon}>📸</Text>
              <Text style={styles.buttonText}>Take a Photo</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a Photo"
              onPress={choosePhoto}
              style={({ pressed }) => [styles.actionButton, styles.purpleButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonIcon}>🖼️</Text>
              <Text style={styles.buttonText}>Choose a Photo</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="My Creations"
              onPress={() => showComingSoon('My Creations')}
              style={({ pressed }) => [styles.actionButton, styles.pinkPurpleButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonIcon}>✨</Text>
              <Text style={styles.buttonText}>My Creations</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </Pressable>
          </View>

          <Text accessible={false} style={styles.bottomSparkle}>✧　✦　✧</Text>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFF5FB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 18,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  glowTop: {
    position: 'absolute',
    top: -110,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#F9DDF1',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -155,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E8DEFF',
  },
  topBar: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topBarSpacer: {
    width: 48,
    height: 48,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A64FC1',
    shadowColor: '#8C3A9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  settingsIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  heroRow: {
    width: '100%',
    height: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  artworkCrop: {
    width: 112,
    height: 112,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
  },
  artworkImage: {
    position: 'absolute',
  },
  sparkle: {
    color: '#D99538',
    fontWeight: '700',
  },
  leftSparkle: {
    fontSize: 23,
    marginRight: 19,
    marginTop: -32,
  },
  rightSparkle: {
    color: '#BC6BC0',
    fontSize: 19,
    marginLeft: 19,
    marginTop: 31,
  },
  title: {
    color: '#51345C',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 37,
    lineHeight: 43,
  },
  titleAccent: {
    color: '#B3519A',
  },
  subtitle: {
    color: '#88748F',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  buttonList: {
    width: '100%',
    gap: 14,
  },
  actionButton: {
    minHeight: 70,
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7D347A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.19,
    shadowRadius: 8,
    elevation: 4,
  },
  pinkButton: {
    backgroundColor: '#D343B5',
  },
  purpleButton: {
    backgroundColor: '#9152D5',
  },
  pinkPurpleButton: {
    backgroundColor: '#B34BC5',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  buttonIcon: {
    width: 38,
    fontSize: 23,
    textAlign: 'center',
    marginRight: 10,
  },
  buttonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '300',
    lineHeight: 32,
    marginLeft: 8,
    opacity: 0.9,
  },
  bottomSparkle: {
    color: '#C58AC1',
    fontSize: 15,
    letterSpacing: 4,
    marginTop: 21,
  },
});
