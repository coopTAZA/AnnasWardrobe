import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
};

type CameraCaptureProps = {
  onBack: () => void;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
};

export default function CameraCapture({ onBack, onPhotoCaptured }: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [guideVisible, setGuideVisible] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!permission || permission.granted || permissionRequested.current) {
      return;
    }

    permissionRequested.current = true;
    requestPermission().catch((error: unknown) => {
      console.error('Failed to request camera permission', error);
      Alert.alert('Unable to access the camera', 'Please try again.');
    });
  }, [permission, requestPermission]);

  const requestCameraAccess = async () => {
    permissionRequested.current = true;
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera access needed',
          result.canAskAgain
            ? 'Please allow camera access to take a photo.'
            : 'Please enable camera access in your device settings to take a photo.',
        );
      }
    } catch (error) {
      console.error('Failed to request camera permission', error);
      Alert.alert('Unable to access the camera', 'Please try again.');
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo || photo.width <= 0 || photo.height <= 0) {
        Alert.alert('No photo captured', 'Please try taking your photo again.');
        return;
      }

      onPhotoCaptured({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch (error) {
      console.error('Failed to capture camera photo', error);
      Alert.alert('Unable to take a photo', 'Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to welcome screen"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Take a Photo</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!permission ? (
        <View style={styles.permissionPanel}>
          <Text style={styles.permissionText}>Getting the camera ready...</Text>
        </View>
      ) : !permission.granted ? (
        <View style={styles.permissionPanel}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            {permission.canAskAgain
              ? 'Allow camera access to take a photo for your outfit.'
              : 'Please enable camera access in your device settings to take a photo.'}
          </Text>
          {permission.canAskAgain && (
            <Pressable
              accessibilityRole="button"
              onPress={() => { void requestCameraAccess(); }}
              style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
            >
              <Text style={styles.permissionButtonText}>Allow Camera</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={styles.previewFrame}>
            {/* CameraView captures the preview framing; this sibling overlay is never in the captured image. */}
            <CameraView
              key={facing}
              ref={cameraRef}
              facing={facing}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(event) => {
                setCameraReady(false);
                Alert.alert('Unable to open the camera', event.message);
              }}
              style={styles.camera}
            />

            {guideVisible && (
              <View pointerEvents="none" style={styles.guideOverlay}>
                <View style={styles.guideFigure}>
                  <View style={styles.guideHead} />
                  <View style={styles.guideNeck} />
                  <View style={[styles.guideArm, styles.guideLeftArm]} />
                  <View style={[styles.guideArm, styles.guideRightArm]} />
                  <View style={styles.guideTorso} />
                  <View style={styles.guideSkirt} />
                  <View style={[styles.guideLeg, styles.guideLeftLeg]} />
                  <View style={[styles.guideLeg, styles.guideRightLeg]} />
                  <View style={[styles.guideFoot, styles.guideLeftFoot]} />
                  <View style={[styles.guideFoot, styles.guideRightFoot]} />
                </View>
                <View style={styles.guideInstruction}>
                  <Text style={styles.guideInstructionText}>Stand inside the outline!</Text>
                </View>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={guideVisible ? 'Hide guide' : 'Show guide'}
              accessibilityState={{ selected: guideVisible }}
              onPress={() => setGuideVisible((visible) => !visible)}
              style={({ pressed }) => [styles.guideToggle, pressed && styles.pressed]}
            >
              <Text style={styles.guideToggleText}>
                {guideVisible ? 'Hide Guide' : 'Show Guide'}
              </Text>
            </Pressable>

            {!cameraReady && (
              <View style={styles.cameraLoading}>
                <Text style={styles.cameraLoadingText}>Starting camera...</Text>
              </View>
            )}
          </View>

          <View style={styles.cameraControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
              onPress={() => {
                setCameraReady(false);
                setFacing((current) => current === 'front' ? 'back' : 'front');
              }}
              style={({ pressed }) => [styles.flipButton, pressed && styles.pressed]}
            >
              <Text style={styles.flipButtonText}>Flip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              accessibilityState={{ disabled: !cameraReady || isCapturing }}
              disabled={!cameraReady || isCapturing}
              onPress={() => { void capturePhoto(); }}
              style={({ pressed }) => [
                styles.captureButton,
                (!cameraReady || isCapturing) && styles.disabledCaptureButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: '#211B28',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 76,
  },
  previewFrame: {
    flex: 1,
    minHeight: 240,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    backgroundColor: '#342C3A',
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFigure: {
    position: 'absolute',
    top: '9%',
    width: '72%',
    height: '78%',
  },
  guideHead: {
    position: 'absolute',
    top: '0%',
    left: '40%',
    width: '20%',
    height: '13%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  guideNeck: {
    position: 'absolute',
    top: '11%',
    left: '44%',
    width: '12%',
    height: '8%',
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  guideArm: {
    position: 'absolute',
    top: '17%',
    width: '12%',
    height: '34%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 999,
  },
  guideLeftArm: {
    left: '12%',
    transform: [{ rotate: '10deg' }],
  },
  guideRightArm: {
    right: '12%',
    transform: [{ rotate: '-10deg' }],
  },
  guideTorso: {
    position: 'absolute',
    top: '16%',
    left: '34%',
    width: '32%',
    height: '28%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  guideSkirt: {
    position: 'absolute',
    top: '40%',
    left: '19%',
    width: '62%',
    height: '37%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  guideLeg: {
    position: 'absolute',
    top: '72%',
    width: '15%',
    height: '21%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 999,
  },
  guideLeftLeg: {
    left: '34%',
  },
  guideRightLeg: {
    right: '34%',
  },
  guideFoot: {
    position: 'absolute',
    top: '89%',
    width: '24%',
    height: '8%',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 999,
  },
  guideLeftFoot: {
    left: '22%',
  },
  guideRightFoot: {
    right: '22%',
  },
  guideInstruction: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    backgroundColor: 'rgba(65,35,65,0.65)',
  },
  guideInstructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  guideToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    backgroundColor: 'rgba(65,35,65,0.68)',
    zIndex: 2,
  },
  guideToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cameraLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33,27,40,0.55)',
  },
  cameraLoadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraControls: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  captureButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 36,
    backgroundColor: '#D343B5',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D343B5',
  },
  disabledCaptureButton: {
    opacity: 0.55,
  },
  permissionPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: '#E8DCEB',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  permissionButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: '#D343B5',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
