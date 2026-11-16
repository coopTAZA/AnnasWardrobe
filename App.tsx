import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import CreationsGallery from './CreationsGallery';
import CameraCapture from './CameraCapture';
import DressUpStudio from './DressUpStudio';

const annaAvatar = require('./assets/anna-avatar.png.png');

type SelectedPhoto = {
  uri: string;
  width: number;
  height: number;
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 700;
  const contentWidth = Math.min(width - 40, 480);
  const avatarSize = Math.min(compact ? 195 : 246, contentWidth * 0.76);
  const [homeViewportHeight, setHomeViewportHeight] = useState(0);
  const [homeContentHeight, setHomeContentHeight] = useState(0);
  const [screen, setScreen] = useState<'welcome' | 'camera' | 'studio' | 'gallery'>('welcome');
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const contentShift =
    homeViewportHeight > 0 && homeContentHeight > 0
      ? Math.min(50, Math.max(0, (homeViewportHeight - homeContentHeight) / 2 - 6))
      : 0;

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

  const startDressingUp = () => {
    Alert.alert('Start Dressing Up', 'Choose how you would like to add a photo.', [
      { text: 'Take a Photo', onPress: () => setScreen('camera') },
      { text: 'Choose a Photo', onPress: () => { void choosePhoto(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (screen === 'camera') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <StatusBar style="light" />
          <CameraCapture
            onBack={() => {
              setScreen('welcome');
              setSelectedPhoto(null);
            }}
            onPhotoCaptured={openStudio}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
            onSave={() => Alert.alert('Saved!', 'Your creation has been saved! 💖')}
            photo={selectedPhoto}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (screen === 'gallery') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <View pointerEvents="none" style={styles.glowTop} />
          <View pointerEvents="none" style={styles.glowBottom} />
          <CreationsGallery onBack={() => setScreen('welcome')} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <View pointerEvents="none" style={styles.glowTop} />
        <View pointerEvents="none" style={styles.glowBottom} />

        <SafeAreaView edges={['top', 'bottom']} style={styles.homeSafeArea}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              compact && styles.compactScrollContent,
            ]}
            onLayout={(event) => setHomeViewportHeight(event.nativeEvent.layout.height)}
            showsVerticalScrollIndicator={false}
          >
            <View
              onLayout={(event) => setHomeContentHeight(event.nativeEvent.layout.height)}
              style={[
                styles.content,
                { width: contentWidth, transform: [{ translateY: -contentShift }] },
              ]}
            >
              <View style={[styles.topBar, compact && styles.compactTopBar]}>
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

              <Text style={[styles.title, compact && styles.compactTitle]}>
                Anna&apos;s{'\n'}
                <Text style={styles.titleAccent}>Wardrobe</Text>
              </Text>
              <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>
                Dress up, sparkle &amp; create!
              </Text>

              <View
                style={[
                  styles.avatarFrame,
                  { width: avatarSize, height: avatarSize },
                ]}
              >
                <Image
                  accessible={false}
                  resizeMode="contain"
                  source={annaAvatar}
                  style={styles.avatarImage}
                />
                <Text accessible={false} style={[styles.avatarSparkle, styles.avatarSparkleLeft]}>✦</Text>
                <Text accessible={false} style={[styles.avatarSparkle, styles.avatarSparkleRight]}>✧</Text>
              </View>

              <View style={[styles.buttonList, compact && styles.compactButtonList]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start Dressing Up"
                  onPress={startDressingUp}
                  style={({ pressed }) => [styles.actionButton, styles.pinkButton, pressed && styles.pressed]}
                >
                  <Text accessible={false} style={styles.buttonIcon}>✨</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.buttonText}>
                    Start Dressing Up
                  </Text>
                  <Text accessible={false} style={styles.buttonArrow}>›</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="My Creations"
                  onPress={() => setScreen('gallery')}
                  style={({ pressed }) => [styles.actionButton, styles.purpleButton, pressed && styles.pressed]}
                >
                  <Text accessible={false} style={styles.buttonIcon}>💜</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.buttonText}>
                    My Creations
                  </Text>
                  <Text accessible={false} style={styles.buttonArrow}>›</Text>
                </Pressable>
              </View>

              <Text
                accessible={false}
                style={[styles.bottomSparkle, compact && styles.compactBottomSparkle]}
              >
                ✧　✦　✧
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFF5FB',
  },
  homeSafeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  compactScrollContent: {
    paddingVertical: 4,
  },
  content: {
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    marginBottom: 6,
  },
  compactTopBar: {
    height: 48,
    marginBottom: 4,
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
  title: {
    color: '#51345C',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 35,
    lineHeight: 39,
  },
  titleAccent: {
    color: '#B3519A',
  },
  subtitle: {
    color: '#88748F',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 12,
  },
  compactSubtitle: {
    marginTop: 5,
    marginBottom: 8,
  },
  avatarFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: '#F7E5F5',
    shadowColor: '#794C90',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarSparkle: {
    position: 'absolute',
    color: '#FFF5A8',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: '#B3519A',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  avatarSparkleLeft: {
    top: 16,
    left: 16,
  },
  avatarSparkleRight: {
    right: 15,
    bottom: 20,
  },
  buttonList: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  compactButtonList: {
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    minHeight: 68,
    borderRadius: 24,
    paddingHorizontal: 17,
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  buttonIcon: {
    width: 40,
    fontSize: 24,
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
    marginTop: 14,
  },
  compactBottomSparkle: {
    marginTop: 8,
  },
});
