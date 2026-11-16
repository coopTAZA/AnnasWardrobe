import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useRotationGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';
import Slider, { type SliderRef } from '@react-native-community/slider';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SelectedPhoto = {
  uri: string;
  width: number;
  height: number;
};

type AccessoryCategory =
  | 'Sunglasses'
  | 'Earrings'
  | 'Necklaces'
  | 'Handbags'
  | 'Hats';

type WardrobeCategory = 'Dresses' | 'Jackets' | AccessoryCategory | 'Jewellery' | 'Hair';

type CatalogItem = {
  id: string;
  label: string;
  aspectRatio: number;
  color: string;
};

type DressOption = CatalogItem & {
  source: ImageSourcePropType;
};

type EarringArtwork = {
  source: ImageSourcePropType;
  aspectRatio: number;
};

type EarringPair = {
  left: EarringArtwork;
  right: EarringArtwork;
};

type AccessoryOption = CatalogItem & {
  category: AccessoryCategory;
  icon?: string;
  source?: ImageSourcePropType;
  pair?: EarringPair;
};

type LayerItem = {
  id: string;
  pairId?: string;
  catalogId: string;
  kind: 'dress' | 'accessory';
  category: WardrobeCategory;
  label: string;
  aspectRatio: number;
  color: string;
  source?: ImageSourcePropType;
  icon?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type EditorSnapshot = {
  items: LayerItem[];
  selectedItemId: string | null;
};

type EditorState = EditorSnapshot & {
  undoStack: EditorSnapshot[];
};

type Transform = Pick<LayerItem, 'x' | 'y' | 'scale' | 'rotation'>;

type DressUpStudioProps = {
  photo: SelectedPhoto;
  onBack: () => void;
  onSave: () => void;
};

const getLayerImageKey = (item: LayerItem) => `layer:${item.id}:${item.catalogId}`;

const dressOptions: DressOption[] = [
  {
    id: 'pink',
    label: 'Pink Dress',
    source: require('./assets/pink.png.png'),
    aspectRatio: 1284 / 1225,
    color: '#E95FA8',
  },
  {
    id: 'purple',
    label: 'Purple Dress',
    source: require('./assets/purple.png.png'),
    aspectRatio: 1024 / 1536,
    color: '#9B64CC',
  },
  {
    id: 'blue',
    label: 'Blue Dress',
    source: require('./assets/blue.png.png'),
    aspectRatio: 1161 / 1355,
    color: '#4C86D8',
  },
];

const accessoryOptions: Record<AccessoryCategory, AccessoryOption[]> = {
  Sunglasses: [
    {
      id: 'rose-shades',
      label: 'Pink Heart Sunglasses',
      category: 'Sunglasses',
      source: require('./assets/sunglasses-pink.png.png'),
      aspectRatio: 2057 / 764,
      color: '#E66FAF',
    },
    {
      id: 'round-shades',
      label: 'Black Sunglasses',
      category: 'Sunglasses',
      source: require('./assets/sunglasses-black.png.png'),
      aspectRatio: 2172 / 724,
      color: '#333333',
    },
    {
      id: 'star-shades',
      label: 'Purple Flower Sunglasses',
      category: 'Sunglasses',
      source: require('./assets/sunglasses-purple.png.png'),
      aspectRatio: 1983 / 793,
      color: '#9B64CC',
    },
  ],
  Earrings: [
    {
      id: 'heart-earrings',
      label: 'Heart Earrings',
      category: 'Earrings',
      pair: {
        left: {
          source: require('./assets/accessories/earrings-hearts-left.png'),
          aspectRatio: 513 / 848,
        },
        right: {
          source: require('./assets/accessories/earrings-hearts-right.png'),
          aspectRatio: 511 / 851,
        },
      },
      aspectRatio: 1,
      color: '#D343B5',
    },
    {
      id: 'hoop-earrings',
      label: 'Gold Hoop Earrings',
      category: 'Earrings',
      pair: {
        left: {
          source: require('./assets/accessories/earrings-hoops-left.png'),
          aspectRatio: 693 / 764,
        },
        right: {
          source: require('./assets/accessories/earrings-hoops-right.png'),
          aspectRatio: 690 / 764,
        },
      },
      aspectRatio: 1,
      color: '#D5A441',
    },
    {
      id: 'diamond-earrings',
      label: 'Diamond Earrings',
      category: 'Earrings',
      pair: {
        left: {
          source: require('./assets/accessories/earrings-diamonds-left.png'),
          aspectRatio: 573 / 571,
        },
        right: {
          source: require('./assets/accessories/earrings-diamonds-right.png'),
          aspectRatio: 572 / 571,
        },
      },
      aspectRatio: 1,
      color: '#9D70D5',
    },
  ],
  Necklaces: [
    {
      id: 'heart-necklace',
      label: 'Heart Necklace',
      category: 'Necklaces',
      source: require('./assets/necklace-heart.png.png'),
      aspectRatio: 1536 / 1024,
      color: '#C45BB3',
    },
    {
      id: 'pearl-necklace',
      label: 'Pearl Necklace',
      category: 'Necklaces',
      source: require('./assets/necklace-pearls.png.png'),
      aspectRatio: 1536 / 1024,
      color: '#D5A441',
    },
    {
      id: 'butterfly-necklace',
      label: 'Butterfly Necklace',
      category: 'Necklaces',
      source: require('./assets/necklace-butterfly.png.png'),
      aspectRatio: 1536 / 1024,
      color: '#D99538',
    },
  ],
  Handbags: [
    {
      id: 'pink-princess',
      label: 'Pink Princess',
      category: 'Handbags',
      source: require('./assets/handbag-pink.png.png'),
      aspectRatio: 1312 / 1199,
      color: '#E66FAF',
    },
    {
      id: 'purple-glitter',
      label: 'Purple Glitter',
      category: 'Handbags',
      source: require('./assets/handbag-purple.png.png'),
      aspectRatio: 1312 / 1199,
      color: '#9B64CC',
    },
    {
      id: 'silver-sparkle',
      label: 'Silver Sparkle',
      category: 'Handbags',
      source: require('./assets/handbag-silver.png.png'),
      aspectRatio: 1312 / 1199,
      color: '#A8A6AF',
    },
  ],
  Hats: [
    {
      id: 'pink-princess-tiara',
      label: 'Pink Princess Tiara',
      category: 'Hats',
      source: require('./assets/hat-tiara.png'),
      aspectRatio: 718 / 515,
      color: '#D9438F',
    },
    {
      id: 'purple-glitter-fedora',
      label: 'Purple Glitter Fedora',
      category: 'Hats',
      source: require('./assets/hat-purple.png'),
      aspectRatio: 744 / 515,
      color: '#8D45C1',
    },
    {
      id: 'pink-floral-sunhat',
      label: 'Pink Floral Sunhat',
      category: 'Hats',
      source: require('./assets/hat-sun.png'),
      aspectRatio: 759 / 531,
      color: '#E66FAF',
    },
  ],
};

const wardrobeTools: { label: WardrobeCategory; icon: string }[] = [
  { label: 'Dresses', icon: '👗' },
  { label: 'Jackets', icon: '🧥' },
  { label: 'Sunglasses', icon: '🕶️' },
  { label: 'Earrings', icon: '💎' },
  { label: 'Necklaces', icon: '📿' },
  { label: 'Handbags', icon: '👜' },
  { label: 'Hats', icon: '👒' },
  { label: 'Jewellery', icon: '💍' },
  { label: 'Hair', icon: '💇' },
];

const isAccessoryCategory = (category: WardrobeCategory): category is AccessoryCategory =>
  Object.prototype.hasOwnProperty.call(accessoryOptions, category);

const snapshotState = (state: EditorState): EditorSnapshot => ({
  items: state.items,
  selectedItemId: state.selectedItemId,
});

const commitEditorChange = (
  state: EditorState,
  items: LayerItem[],
  selectedItemId: string | null,
): EditorState => ({
  items,
  selectedItemId,
  undoStack: [...state.undoStack, snapshotState(state)].slice(-50),
});

const getAccessoryPosition = (
  category: AccessoryCategory,
  count: number,
  photoWidth: number,
  photoHeight: number,
): Pick<LayerItem, 'x' | 'y'> => {
  switch (category) {
    case 'Sunglasses':
      return { x: 0, y: -photoHeight * 0.24 };
    case 'Earrings':
      return {
        x: (count % 2 === 0 ? -1 : 1) * Math.min(photoWidth * 0.18, 60),
        y: -photoHeight * 0.19,
      };
    case 'Necklaces':
      return { x: (count % 2 === 0 ? 1 : -1) * Math.min(count * 10, 26), y: -photoHeight * 0.06 };
    case 'Handbags':
      return { x: photoWidth * 0.25, y: photoHeight * 0.12 + count * 8 };
    case 'Hats':
      return { x: (count % 2 === 0 ? -1 : 1) * Math.min(count * 12, 24), y: -photoHeight * 0.34 };
  }
};

export default function DressUpStudio({ photo, onBack, onSave }: DressUpStudioProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoomState, setZoomState] = useState(() => ({ photoUri: photo.uri, level: 1 }));
  const photoZoomLevel = zoomState.photoUri === photo.uri ? zoomState.level : 1;
  const [zoomSliderSize, setZoomSliderSize] = useState({ width: 0, height: 0 });
  const [activeCategory, setActiveCategory] = useState<WardrobeCategory | null>(null);
  const [sizeSliderVisible, setSizeSliderVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedImageKeys, setLoadedImageKeys] = useState<Set<string>>(() => new Set());
  const [failedImageKeys, setFailedImageKeys] = useState<Set<string>>(() => new Set());
  const [editor, setEditor] = useState<EditorState>({
    items: [],
    selectedItemId: null,
    undoStack: [],
  });
  const photoZoom = useSharedValue(1);
  const photoPanX = useSharedValue(0);
  const photoPanY = useSharedValue(0);
  const photoPanStartX = useSharedValue(0);
  const photoPanStartY = useSharedValue(0);
  const captureViewRef = useRef<ComponentRef<typeof View> | null>(null);
  const zoomSliderRef = useRef<SliderRef | null>(null);
  const alertedImageErrors = useRef(new Set<string>());
  const accessoryIdCounter = useRef(0);
  const accessoryScaleStart = useRef<{
    itemId: string;
    pairId?: string;
    scale: number;
    snapshot: EditorSnapshot;
  } | null>(null);

  const imageScale = Math.min(canvasSize.width / photo.width, canvasSize.height / photo.height);
  const photoWidth = canvasSize.width > 0 ? photo.width * imageScale : 0;
  const photoHeight = canvasSize.height > 0 ? photo.height * imageScale : 0;
  const photoX = (canvasSize.width - photoWidth) / 2;
  const photoY = (canvasSize.height - photoHeight) / 2;
  useEffect(() => {
    photoZoom.value = 1;
    photoPanX.value = 0;
    photoPanY.value = 0;
    zoomSliderRef.current?.updateValue(1);
  }, [photo.uri, photoPanX, photoPanY, photoZoom]);

  /* eslint-disable react-hooks/immutability -- Pan gestures update Reanimated values on the UI thread. */
  const photoPanGesture = usePanGesture({
    enabled: photoZoomLevel > 1,
    runOnJS: false,
    onActivate: () => {
      'worklet';
      photoPanStartX.value = photoPanX.value;
      photoPanStartY.value = photoPanY.value;
    },
    onUpdate: (event) => {
      'worklet';
      const maxPanX = (photoWidth * (photoZoom.value - 1)) / 2;
      const maxPanY = (photoHeight * (photoZoom.value - 1)) / 2;
      photoPanX.value = Math.max(
        -maxPanX,
        Math.min(maxPanX, photoPanStartX.value + event.translationX),
      );
      photoPanY.value = Math.max(
        -maxPanY,
        Math.min(maxPanY, photoPanStartY.value + event.translationY),
      );
    },
  });
  /* eslint-enable react-hooks/immutability */

  const compositionPositionStyle = useAnimatedStyle(() => ({
    left: photoPanX.value,
    top: photoPanY.value,
  }));
  const compositionScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoZoom.value }],
  }));

  /* eslint-disable react-hooks/immutability -- Keep the gesture zoom synchronized with its displayed scale. */
  const updatePhotoZoom = (value: number) => {
    const zoom = Math.max(1, Math.min(4, value));
    photoZoom.value = zoom;
    setZoomState({ photoUri: photo.uri, level: zoom });

    const maxPanX = (photoWidth * (zoom - 1)) / 2;
    const maxPanY = (photoHeight * (zoom - 1)) / 2;
    photoPanX.value = Math.max(-maxPanX, Math.min(maxPanX, photoPanX.value));
    photoPanY.value = Math.max(-maxPanY, Math.min(maxPanY, photoPanY.value));
  };
  /* eslint-enable react-hooks/immutability */

  const resetPhotoZoom = () => {
    updatePhotoZoom(1);
    zoomSliderRef.current?.updateValue(1);
  };

  const photoImageKey = `photo:${photo.uri}`;
  const requiredImageKeys = [
    photoImageKey,
    ...editor.items.filter((item) => item.source).map(getLayerImageKey),
  ];
  const hasImageLoadError = requiredImageKeys.some((key) => failedImageKeys.has(key));
  const imagesReady =
    !hasImageLoadError && requiredImageKeys.every((key) => loadedImageKeys.has(key));
  const selectedItem =
    editor.items.find((item) => item.id === editor.selectedItemId) ?? null;
  const selectedAccessory = selectedItem?.kind === 'accessory' ? selectedItem : null;
  const accessoriesForCategory =
    activeCategory && isAccessoryCategory(activeCategory)
      ? accessoryOptions[activeCategory]
      : null;

  const markImageLoaded = (imageKey: string) => {
    setLoadedImageKeys((current) => {
      if (current.has(imageKey)) {
        return current;
      }

      const next = new Set(current);
      next.add(imageKey);
      return next;
    });
    setFailedImageKeys((current) => {
      if (!current.has(imageKey)) {
        return current;
      }

      const next = new Set(current);
      next.delete(imageKey);
      return next;
    });
  };

  const markImageFailed = (imageKey: string) => {
    setFailedImageKeys((current) => {
      if (current.has(imageKey)) {
        return current;
      }

      const next = new Set(current);
      next.add(imageKey);
      return next;
    });
    if (!alertedImageErrors.current.has(imageKey)) {
      alertedImageErrors.current.add(imageKey);
      Alert.alert(
        'Unable to load image',
        'A photo or accessory could not be loaded, so this creation cannot be saved.',
      );
    }
  };

  /* eslint-disable react-hooks/immutability -- Temporarily reset shared zoom values for an unzoomed capture. */
  const saveCreation = async () => {
    if (isSaving) {
      return;
    }
    if (!imagesReady) {
      Alert.alert(
        hasImageLoadError ? 'Unable to save creation' : 'Still loading',
        hasImageLoadError
          ? 'A photo or accessory could not be loaded. Please try again.'
          : 'Please wait for the photo and accessories to finish loading.',
      );
      return;
    }
    if (photoWidth <= 0 || photoHeight <= 0) {
      Alert.alert('Unable to save creation', 'The photo is not ready yet. Please try again.');
      return;
    }

    const savedZoom = photoZoom.value;
    const savedPanX = photoPanX.value;
    const savedPanY = photoPanY.value;
    setIsSaving(true);
    try {
      photoZoom.value = 1;
      photoPanX.value = 0;
      photoPanY.value = 0;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const captureView = captureViewRef.current;
      if (!captureView) {
        throw new Error('The photo canvas is not available for capture.');
      }

      const capturedUri = await captureRef(captureView, {
        format: 'png',
        result: 'tmpfile',
      });
      photoZoom.value = savedZoom;
      photoPanX.value = savedPanX;
      photoPanY.value = savedPanY;
      const creationsDirectory = new Directory(Paths.document, 'creations');
      creationsDirectory.create({ idempotent: true, intermediates: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let suffix = 0;
      let savedFile = new File(creationsDirectory, `creation-${timestamp}.png`);
      while (savedFile.exists) {
        suffix += 1;
        savedFile = new File(creationsDirectory, `creation-${timestamp}-${suffix}.png`);
      }

      await new File(capturedUri).copy(savedFile);
      if (!savedFile.exists) {
        throw new Error('The saved image file could not be verified.');
      }
      onSave();
    } catch (error) {
      console.error('Failed to save dress-up creation', error);
      Alert.alert('Unable to save creation', 'Please try again.');
    } finally {
      photoZoom.value = savedZoom;
      photoPanX.value = savedPanX;
      photoPanY.value = savedPanY;
      setIsSaving(false);
    }
  };
  /* eslint-enable react-hooks/immutability */

  const selectDress = (dress: DressOption) => {
    setSizeSliderVisible(false);
    setEditor((current) => {
      const currentDress = current.items.find((item) => item.kind === 'dress');
      if (currentDress?.catalogId === dress.id) {
        return current.selectedItemId === currentDress.id
          ? current
          : { ...current, selectedItemId: currentDress.id };
      }

      const newDress: LayerItem = {
        id: 'dress',
        catalogId: dress.id,
        kind: 'dress',
        category: 'Dresses',
        label: dress.label,
        aspectRatio: dress.aspectRatio,
        color: dress.color,
        source: dress.source,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
      };
      const items = [newDress, ...current.items.filter((item) => item.kind !== 'dress')];
      return commitEditorChange(current, items, newDress.id);
    });
  };

  const addAccessory = (option: AccessoryOption) => {
    setSizeSliderVisible(false);

    const pairArtwork = option.pair;
    if (pairArtwork) {
      const leftId = `accessory-${++accessoryIdCounter.current}`;
      const rightId = `accessory-${++accessoryIdCounter.current}`;
      const pairId = `earring-pair-${leftId}`;
      setEditor((current) => {
        const existingEarringCount = current.items.filter(
          (item) => item.kind === 'accessory' && item.category === 'Earrings',
        ).length;
        const pairOffset = Math.floor(existingEarringCount / 2);
        const xOffset = Math.max(32, Math.min(photoWidth * 0.18, 60));
        const y = -photoHeight * 0.19 + pairOffset * Math.min(photoHeight * 0.045, 24);
        const makeEarring = (
          id: string,
          side: 'left' | 'right',
          x: number,
        ): LayerItem => {
          const artwork = pairArtwork[side];
          return {
            id,
            pairId,
            catalogId: option.id,
            kind: 'accessory',
            category: 'Earrings',
            label: `${option.label} (${side})`,
            aspectRatio: artwork.aspectRatio,
            color: option.color,
            source: artwork.source,
            x,
            y,
            scale: 1,
            rotation: 0,
          };
        };
        const pair = [
          makeEarring(leftId, 'left', -xOffset),
          makeEarring(rightId, 'right', xOffset),
        ];

        return commitEditorChange(current, [...current.items, ...pair], rightId);
      });
      return;
    }

    const id = `accessory-${++accessoryIdCounter.current}`;
    setEditor((current) => {
      const categoryCount = current.items.filter(
        (item) => item.kind === 'accessory' && item.category === option.category,
      ).length;
      const position = getAccessoryPosition(option.category, categoryCount, photoWidth, photoHeight);
      const newItem: LayerItem = {
        id,
        catalogId: option.id,
        kind: 'accessory',
        category: option.category,
        label: option.label,
        aspectRatio: option.aspectRatio,
        color: option.color,
        icon: option.icon,
        source: option.source,
        ...position,
        scale: 1,
        rotation: 0,
      };
      const items = option.category === 'Sunglasses'
        ? current.items.filter(
          (item) => item.kind !== 'accessory' || item.category !== 'Sunglasses',
        )
        : current.items;

      return commitEditorChange(current, [...items, newItem], newItem.id);
    });
  };

  const selectLayerItem = (itemId: string) => {
    setSizeSliderVisible(false);
    setEditor((current) => {
      const index = current.items.findIndex((item) => item.id === itemId);
      if (index < 0) {
        return current;
      }

      const item = current.items[index];
      if (item.kind === 'accessory' && index !== current.items.length - 1) {
        const items = current.items.filter((entry) => entry.id !== itemId);
        items.push(item);
        return commitEditorChange(current, items, itemId);
      }

      return current.selectedItemId === itemId
        ? current
        : { ...current, selectedItemId: itemId };
    });
  };

  const deselectLayerItem = () => {
    setSizeSliderVisible(false);
    setEditor((current) =>
      current.selectedItemId === null
        ? current
        : { ...current, selectedItemId: null },
    );
  };

  const updateTransform = (itemId: string, transform: Transform) => {
    setEditor((current) => {
      const item = current.items.find((entry) => entry.id === itemId);
      if (!item || current.selectedItemId !== itemId) {
        return current;
      }

      const unchanged =
        Math.abs(item.x - transform.x) < 0.001 &&
        Math.abs(item.y - transform.y) < 0.001 &&
        Math.abs(item.scale - transform.scale) < 0.001 &&
        Math.abs(item.rotation - transform.rotation) < 0.001;
      if (unchanged) {
        return current;
      }

      const items = current.items.map((entry) =>
        entry.id === itemId ? { ...entry, ...transform } : entry,
      );
      return commitEditorChange(current, items, current.selectedItemId);
    });
  };

  const resetSelectedItem = () => {
    setEditor((current) => {
      const selectedId = current.selectedItemId;
      const selected = current.items.find((item) => item.id === selectedId);
      if (!selected) {
        return current;
      }

      if (
        selected.x === 0 &&
        selected.y === 0 &&
        selected.scale === 1 &&
        selected.rotation === 0
      ) {
        return current;
      }

      const items = current.items.map((item) =>
        item.id === selected.id
          ? { ...item, x: 0, y: 0, scale: 1, rotation: 0 }
          : item,
      );
      return commitEditorChange(current, items, current.selectedItemId);
    });
  };

  const removeSelectedItem = () => {
    setSizeSliderVisible(false);
    setEditor((current) => {
      if (!current.selectedItemId) {
        return current;
      }

      return commitEditorChange(
        current,
        current.items.filter((item) => item.id !== current.selectedItemId),
        null,
      );
    });
  };

  const moveSelectedItem = (direction: -1 | 1) => {
    setEditor((current) => {
      if (!current.selectedItemId) {
        return current;
      }

      const index = current.items.findIndex((item) => item.id === current.selectedItemId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.items.length) {
        return current;
      }

      const items = current.items.slice();
      [items[index], items[target]] = [items[target], items[index]];
      return commitEditorChange(current, items, current.selectedItemId);
    });
  };

  const undo = () => {
    setSizeSliderVisible(false);
    setEditor((current) => {
      const previous = current.undoStack[current.undoStack.length - 1];
      if (!previous) {
        return current;
      }

      return {
        items: previous.items,
        selectedItemId: previous.selectedItemId,
        undoStack: current.undoStack.slice(0, -1),
      };
    });
  };

  const beginAccessoryResize = () => {
    if (!selectedAccessory) {
      return;
    }

    accessoryScaleStart.current = {
      itemId: selectedAccessory.id,
      pairId: selectedAccessory.pairId,
      scale: selectedAccessory.scale,
      snapshot: snapshotState(editor),
    };
  };

  const updateAccessoryScale = (scale: number) => {
    const resizeTarget = accessoryScaleStart.current;
    if (!resizeTarget) {
      return;
    }

    setEditor((current) => {
      let changed = false;
      const items = current.items.map((item) => {
        const isTarget = resizeTarget.pairId
          ? item.pairId === resizeTarget.pairId
          : item.id === resizeTarget.itemId;
        if (
          !isTarget ||
          item.kind !== 'accessory' ||
          Math.abs(item.scale - scale) < 0.001
        ) {
          return item;
        }

        changed = true;
        return { ...item, scale };
      });
      if (!changed) {
        return current;
      }

      return { ...current, items };
    });
  };

  const finishAccessoryResize = () => {
    const start = accessoryScaleStart.current;
    accessoryScaleStart.current = null;
    if (!start) {
      return;
    }

    setEditor((current) => {
      const previousScales = new Map(
        start.snapshot.items.map((item) => [item.id, item.scale]),
      );
      const changed = current.items.some((item) => {
        const isTarget = start.pairId
          ? item.pairId === start.pairId
          : item.id === start.itemId;
        const previousScale = previousScales.get(item.id);
        return (
          isTarget &&
          item.kind === 'accessory' &&
          previousScale !== undefined &&
          Math.abs(item.scale - previousScale) >= 0.001
        );
      });
      if (!changed) {
        return current;
      }

      return {
        ...current,
        undoStack: [...current.undoStack, start.snapshot].slice(-50),
      };
    });
  };

  const onGestureTransform = (
    itemId: string,
    x: number,
    y: number,
    scale: number,
    rotation: number,
  ) => updateTransform(itemId, { x, y, scale, rotation });

  const renderCatalog = () => {
    if (activeCategory === 'Dresses') {
      return (
        <ScrollView
          contentContainerStyle={styles.catalogItems}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {dressOptions.map((dress) => (
            <Pressable
              key={dress.id}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${dress.label}`}
              onPress={() => selectDress(dress)}
              style={[
                styles.catalogCard,
                selectedItem?.kind === 'dress' &&
                  selectedItem.catalogId === dress.id &&
                  styles.selectedCatalogCard,
              ]}
            >
              <Image
                accessible={false}
                resizeMode="contain"
                source={dress.source}
                style={styles.dressCatalogImage}
              />
              <Text numberOfLines={1} style={styles.catalogLabel}>{dress.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    if (accessoriesForCategory) {
      return (
        <ScrollView
          contentContainerStyle={styles.catalogItems}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {accessoriesForCategory.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${option.label}`}
              onPress={() => addAccessory(option)}
              style={styles.catalogCard}
            >
              {option.pair
                ? <EarringPairArtwork pair={option.pair} />
                : <AccessoryArtwork option={option} small />}
              <Text numberOfLines={1} style={styles.catalogLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    if (activeCategory) {
      return (
        <View style={styles.comingSoonStrip}>
          <Text style={styles.comingSoonText}>
            More {activeCategory.toLowerCase()} coming soon!
          </Text>
        </View>
      );
    }

    return <View style={styles.emptyCatalog} />;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.studioContent}>
      <View style={styles.studioHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to welcome screen"
          onPress={onBack}
          style={({ pressed }) => [styles.studioHeaderButton, pressed && styles.pressed]}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.studioTitle}>Dress-Up Studio</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving || !imagesReady }}
          disabled={isSaving || !imagesReady}
          onPress={saveCreation}
          style={({ pressed }) => [
            styles.saveButton,
            (isSaving || !imagesReady) && styles.disabledSaveButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      <View pointerEvents={isSaving ? 'none' : 'auto'} style={styles.photoArea}>
        <View
          onLayout={({ nativeEvent }) => {
            const { width, height } = nativeEvent.layout;
            setCanvasSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
          }}
          style={styles.photoCanvas}
        >
          {photoWidth > 0 && photoHeight > 0 && (
            <View
              ref={captureViewRef}
              collapsable={false}
              pointerEvents="box-none"
              style={[styles.captureCanvas, { left: photoX, top: photoY, width: photoWidth, height: photoHeight }]}
            >
              <Animated.View
                style={[
                  styles.zoomedComposition,
                  { width: photoWidth, height: photoHeight },
                  compositionPositionStyle,
                ]}
              >
                <Animated.View
                  style={[
                    styles.zoomedCompositionInner,
                    { width: photoWidth, height: photoHeight },
                    compositionScaleStyle,
                  ]}
                >
                  <GestureDetector gesture={photoPanGesture}>
                    <Pressable
                      accessible={false}
                      onPress={() => {
                        if (photoZoom.value === 1) {
                          deselectLayerItem();
                        }
                      }}
                      style={StyleSheet.absoluteFill}
                    >
                      <Image
                        accessibilityLabel="Photo selected for dress-up"
                        onError={() => markImageFailed(photoImageKey)}
                        onLoad={() => markImageLoaded(photoImageKey)}
                        pointerEvents="none"
                        resizeMode="stretch"
                        source={{ uri: photo.uri }}
                        style={styles.capturePhotoImage}
                      />
                    </Pressable>
                  </GestureDetector>
                  <View
                    pointerEvents="box-none"
                    style={[styles.layerPlane, { left: 0, top: 0, width: photoWidth, height: photoHeight }]}
                  >
                    {editor.items.map((item, index) => (
                      <EditableLayerItem
                        key={item.id}
                        item={item}
                        imageKey={getLayerImageKey(item)}
                        layerIndex={index}
                        onImageError={markImageFailed}
                        onImageLoad={markImageLoaded}
                        onSelect={selectLayerItem}
                        onTransform={onGestureTransform}
                        photoHeight={photoHeight}
                        photoWidth={photoWidth}
                        photoZoom={photoZoom}
                        selected={editor.selectedItemId === item.id}
                        suppressSelectionOutline={isSaving}
                      />
                    ))}
                  </View>
                </Animated.View>
              </Animated.View>
            </View>
          )}
        </View>

        <View
          pointerEvents="box-none"
          style={[
            styles.zoomControls,
            sizeSliderVisible && styles.zoomControlsAboveSize,
          ]}
        >
          <Text style={styles.zoomLevelText}>
            {Number.isInteger(photoZoomLevel) ? photoZoomLevel : photoZoomLevel.toFixed(1)}×
          </Text>
          <View
            onLayout={({ nativeEvent }) => {
              const { width, height } = nativeEvent.layout;
              setZoomSliderSize((current) =>
                current.width === width && current.height === height
                  ? current
                  : { width, height },
              );
            }}
            style={styles.zoomSliderTrack}
          >
            {zoomSliderSize.height > 0 && (
              <Slider
                accessibilityLabel="Photo zoom"
                accessibilityIncrements={['1', '2', '3', '4']}
                accessibilityUnits="times"
                maximumTrackTintColor="#E4D4EA"
                maximumValue={4}
                minimumTrackTintColor="#B3519A"
                minimumValue={1}
                onValueChange={updatePhotoZoom}
                ref={zoomSliderRef}
                step={0.1}
                style={[
                  styles.zoomSlider,
                  {
                    width: zoomSliderSize.height,
                    left: (zoomSliderSize.width - zoomSliderSize.height) / 2,
                    top: (zoomSliderSize.height - 36) / 2,
                  },
                ]}
                thumbTintColor="#A64FC1"
                value={photoZoomLevel}
              />
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset photo zoom to 1 times"
            onPress={resetPhotoZoom}
            style={({ pressed }) => [styles.zoomResetButton, pressed && styles.pressed]}
          >
            <Text style={styles.zoomResetText}>1×</Text>
          </Pressable>
        </View>

        {selectedAccessory && !sizeSliderVisible && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resize ${selectedAccessory.label}`}
            onPress={() => setSizeSliderVisible(true)}
            style={({ pressed }) => [
              styles.sizeButton,
              selectedAccessory.x >= 0 ? styles.lowerLeftControl : styles.lowerRightControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sizeButtonText}>Size</Text>
          </Pressable>
        )}

        {selectedAccessory && sizeSliderVisible && (
          <View
            style={[
              styles.floatingSizeControl,
              selectedAccessory.x >= 0 ? styles.lowerLeftControl : styles.lowerRightControl,
            ]}
          >
            <Text style={styles.floatingSizeLabel}>Size</Text>
            <Slider
              accessibilityLabel={`Size of ${selectedAccessory.label}`}
              maximumTrackTintColor="#E4D4EA"
              maximumValue={3}
              minimumTrackTintColor="#B3519A"
              minimumValue={0.25}
              onSlidingComplete={(value) => {
                updateAccessoryScale(value);
                finishAccessoryResize();
              }}
              onSlidingStart={beginAccessoryResize}
              onValueChange={updateAccessoryScale}
              step={0.01}
              style={styles.sizeSlider}
              thumbTintColor="#A64FC1"
              value={selectedAccessory.scale}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done adjusting size"
              onPress={() => setSizeSliderVisible(false)}
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.editingControls}>
        <ScrollView
          contentContainerStyle={styles.controlRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <ControlButton
            disabled={!selectedItem}
            icon="↻"
            label={selectedItem?.kind === 'dress' ? 'Reset Dress' : 'Reset Item'}
            onPress={resetSelectedItem}
            shortLabel="Reset"
          />
          <ControlButton
            disabled={!selectedItem}
            icon="×"
            label={selectedItem?.kind === 'dress' ? 'Remove Dress' : 'Remove Item'}
            onPress={removeSelectedItem}
            shortLabel="Remove"
          />
          <ControlButton
            disabled={editor.undoStack.length === 0}
            icon="↶"
            label="Undo"
            onPress={undo}
            shortLabel="Undo"
          />
          <ControlButton
            disabled={!selectedItem || editor.items[editor.items.length - 1]?.id === selectedItem.id}
            icon="↑"
            label="Bring Forward"
            onPress={() => moveSelectedItem(1)}
            shortLabel="Forward"
          />
          <ControlButton
            disabled={!selectedItem || editor.items[0]?.id === selectedItem.id}
            icon="↓"
            label="Send Backward"
            onPress={() => moveSelectedItem(-1)}
            shortLabel="Backward"
          />
        </ScrollView>
      </View>

      <View style={styles.catalogStrip}>{renderCatalog()}</View>

      <View style={styles.toolbar}>
        <ScrollView
          contentContainerStyle={styles.toolbarItems}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {wardrobeTools.map((tool) => (
            <Pressable
              key={tool.label}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              onPress={() => setActiveCategory(tool.label)}
              style={[
                styles.toolItem,
                activeCategory === tool.label && styles.activeToolItem,
              ]}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text
                style={[
                  styles.toolLabel,
                  activeCategory === tool.label && styles.activeToolText,
                ]}
              >
                {tool.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
type EditableLayerItemProps = {
  item: LayerItem;
  imageKey: string;
  layerIndex: number;
  photoWidth: number;
  photoHeight: number;
  photoZoom: SharedValue<number>;
  selected: boolean;
  suppressSelectionOutline: boolean;
  onImageLoad: (imageKey: string) => void;
  onImageError: (imageKey: string) => void;
  onSelect: (itemId: string) => void;
  onTransform: (itemId: string, x: number, y: number, scale: number, rotation: number) => void;
};

function EditableLayerItem({
  item,
  imageKey,
  layerIndex,
  photoWidth,
  photoHeight,
  photoZoom,
  selected,
  suppressSelectionOutline,
  onImageLoad,
  onImageError,
  onSelect,
  onTransform,
}: EditableLayerItemProps) {
  const translateX = useSharedValue(item.x);
  const translateY = useSharedValue(item.y);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation);
  const panStartX = useSharedValue(item.x);
  const panStartY = useSharedValue(item.y);
  const pinchStartScale = useSharedValue(item.scale);
  const rotationStart = useSharedValue(item.rotation);
  const gestureStartX = useSharedValue(item.x);
  const gestureStartY = useSharedValue(item.y);
  const gestureStartScale = useSharedValue(item.scale);
  const gestureStartRotation = useSharedValue(item.rotation);
  const activeGestureCount = useSharedValue(0);
  const gestureChanged = useSharedValue(false);
  const gestureSucceeded = useSharedValue(false);

  useEffect(() => {
    translateX.value = item.x;
    translateY.value = item.y;
    scale.value = item.scale;
    rotation.value = item.rotation;
  }, [item.x, item.y, item.scale, item.rotation, rotation, scale, translateX, translateY]);

  const isEarring = item.category === 'Earrings';
  const maxWidth = item.kind === 'dress'
    ? photoWidth * 0.78
    : item.category === 'Sunglasses'
      ? photoWidth * 0.38
      : item.category === 'Handbags'
        ? photoWidth * 0.3
      : item.category === 'Necklaces'
        ? photoWidth * 0.42
      : photoWidth * 0.4;
  const maxHeight = item.kind === 'dress'
    ? photoHeight * 0.78
    : item.category === 'Sunglasses'
      ? photoHeight * 0.18
      : item.category === 'Handbags'
        ? photoHeight * 0.5
      : item.category === 'Necklaces'
        ? photoHeight * 0.85
      : item.category === 'Hats'
        ? photoHeight * 0.6
      : photoHeight * 0.3;
  const itemWidth = isEarring
    ? Math.max(56, photoWidth * 0.14)
    : Math.min(maxWidth, maxHeight * item.aspectRatio);
  const itemHeight = isEarring
    ? Math.max(56, photoHeight * 0.12)
    : itemWidth / item.aspectRatio;
  const earringArtworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}rad` }],
  }));

  /* eslint-disable react-hooks/immutability -- Gesture worklets update Reanimated SharedValues on the UI thread. */
  const beginGesture = () => {
    'worklet';
    if (activeGestureCount.value === 0) {
      gestureStartX.value = translateX.value;
      gestureStartY.value = translateY.value;
      gestureStartScale.value = scale.value;
      gestureStartRotation.value = rotation.value;
      gestureChanged.value = false;
      gestureSucceeded.value = false;
    }
    activeGestureCount.value += 1;
  };

  const finishGesture = (canceled: boolean) => {
    'worklet';
    if (!canceled) {
      gestureSucceeded.value = true;
    }
    activeGestureCount.value = Math.max(0, activeGestureCount.value - 1);

    if (activeGestureCount.value === 0) {
      if (gestureChanged.value && gestureSucceeded.value) {
        scheduleOnRN(
          onTransform,
          item.id,
          translateX.value,
          translateY.value,
          scale.value,
          rotation.value,
        );
      } else {
        translateX.value = gestureStartX.value;
        translateY.value = gestureStartY.value;
        scale.value = gestureStartScale.value;
        rotation.value = gestureStartRotation.value;
      }
      gestureChanged.value = false;
      gestureSucceeded.value = false;
    }
  };

  const tapGesture = useTapGesture({
    runOnJS: false,
    onActivate: () => {
      'worklet';
      scheduleOnRN(onSelect, item.id);
    },
  });

  const panGesture = usePanGesture({
    enabled: selected,
    runOnJS: false,
    onActivate: () => {
      'worklet';
      beginGesture();
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    },
    onUpdate: (event) => {
      'worklet';
      translateX.value = panStartX.value + event.translationX / photoZoom.value;
      translateY.value = panStartY.value + event.translationY / photoZoom.value;
      gestureChanged.value = true;
    },
    onDeactivate: (event) => {
      'worklet';
      finishGesture(event.canceled);
    },
  });

  const pinchGesture = usePinchGesture({
    enabled: selected,
    runOnJS: false,
    onActivate: () => {
      'worklet';
      beginGesture();
      pinchStartScale.value = scale.value;
    },
    onUpdate: (event) => {
      'worklet';
      scale.value = Math.max(0.25, Math.min(3, pinchStartScale.value * event.scale));
      gestureChanged.value = true;
    },
    onDeactivate: (event) => {
      'worklet';
      finishGesture(event.canceled);
    },
  });

  const rotationGesture = useRotationGesture({
    enabled: selected,
    runOnJS: false,
    onActivate: () => {
      'worklet';
      beginGesture();
      rotationStart.value = rotation.value;
    },
    onUpdate: (event) => {
      'worklet';
      rotation.value = rotationStart.value + event.rotation;
      gestureChanged.value = true;
    },
    onDeactivate: (event) => {
      'worklet';
      finishGesture(event.canceled);
    },
  });

  const gesture = useSimultaneousGestures(
    tapGesture,
    panGesture,
    pinchGesture,
    rotationGesture,
  );
  /* eslint-enable react-hooks/immutability */

  const animatedStyle = useAnimatedStyle(() => ({
    width: itemWidth,
    height: itemHeight,
    left: (photoWidth - itemWidth) / 2 + translateX.value,
    top: (photoHeight - itemHeight) / 2 + translateY.value,
    zIndex: layerIndex + 1,
    transform: isEarring
      ? []
      : [{ scale: scale.value }, { rotate: `${rotation.value}rad` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected }}
        style={[
          styles.layerItem,
          animatedStyle,
          selected && !suppressSelectionOutline && styles.selectedLayerItem,
        ]}
      >
        {item.source && isEarring ? (
          <Animated.Image
            accessible={false}
            onError={() => onImageError(imageKey)}
            onLoad={() => onImageLoad(imageKey)}
            pointerEvents="none"
            resizeMode="contain"
            source={item.source}
            style={[styles.earringLayerImage, earringArtworkStyle]}
          />
        ) : item.source ? (
          <Image
            accessible={false}
            onError={() => onImageError(imageKey)}
            onLoad={() => onImageLoad(imageKey)}
            resizeMode="contain"
            source={item.source}
            style={isEarring ? styles.earringLayerImage : styles.layerImage}
          />
        ) : (
          <View style={styles.accessoryOverlay}>
            <AccessoryArtwork
              color={item.color}
              icon={item.icon ?? '✨'}
            />
            <Text numberOfLines={1} style={styles.overlayLabel}>{item.label}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function AccessoryArtwork({
  option,
  color,
  icon,
  small = false,
}: {
  option?: AccessoryOption;
  color?: string;
  icon?: string;
  small?: boolean;
}) {
  return (
    <View
      style={[
        styles.accessoryBadge,
        small && styles.smallAccessoryBadge,
        { borderColor: option?.color ?? color ?? '#B3519A' },
      ]}
    >
      {option?.source ? (
        <Image
          accessible={false}
          resizeMode="contain"
          source={option.source}
          style={styles.accessoryImage}
        />
      ) : (
        <Text style={[styles.accessoryGlyph, small && styles.smallAccessoryGlyph]}>
          {option?.icon ?? icon ?? '✨'}
        </Text>
      )}
    </View>
  );
}

function EarringPairArtwork({ pair }: { pair: EarringPair }) {
  return (
    <View style={styles.earringPairPreview}>
      <Image
        accessible={false}
        resizeMode="contain"
        source={pair.left.source}
        style={styles.earringPreviewImage}
      />
      <Image
        accessible={false}
        resizeMode="contain"
        source={pair.right.source}
        style={styles.earringPreviewImage}
      />
    </View>
  );
}

function ControlButton({
  disabled,
  icon,
  label,
  onPress,
  shortLabel,
}: {
  disabled: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  shortLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.controlButtonIcon}>{icon}</Text>
      <Text numberOfLines={1} style={styles.controlButtonText}>{shortLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  studioContent: {
    flex: 1,
  },
  studioHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  studioHeaderButton: {
    minWidth: 76,
    minHeight: 46,
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
  studioTitle: {
    flex: 1,
    color: '#54365F',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginHorizontal: 6,
  },
  saveButton: {
    minWidth: 70,
    minHeight: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C54AB7',
    shadowColor: '#8C3A83',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledSaveButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  photoArea: {
    flex: 1,
    minHeight: 150,
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0D8EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#76537A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  photoCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  captureCanvas: {
    position: 'absolute',
    overflow: 'hidden',
  },
  zoomedComposition: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  zoomedCompositionInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  capturePhotoImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  layerPlane: {
    position: 'absolute',
    overflow: 'hidden',
  },
  zoomControls: {
    position: 'absolute',
    top: 8,
    right: 4,
    bottom: 56,
    zIndex: 10,
    width: 50,
    alignItems: 'center',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F0D8EB',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    elevation: 5,
  },
  zoomControlsAboveSize: {
    bottom: 82,
  },
  zoomLevelText: {
    minWidth: 38,
    color: '#78438E',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  zoomSliderTrack: {
    position: 'relative',
    flex: 1,
    width: '100%',
    minHeight: 76,
    marginVertical: 3,
  },
  zoomSlider: {
    position: 'absolute',
    height: 36,
    transform: [{ rotate: '-90deg' }],
  },
  zoomResetButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F1E2F8',
  },
  zoomResetText: {
    color: '#78438E',
    fontSize: 12,
    fontWeight: '800',
  },
  layerItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  selectedLayerItem: {
    borderWidth: 1.5,
    borderColor: '#DB72C7',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  layerImage: {
    width: '100%',
    height: '100%',
  },
  earringLayerImage: {
    width: '76%',
    height: '84%',
  },
  earringPairPreview: {
    width: 66,
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  earringPreviewImage: {
    width: 25,
    height: 58,
  },
  accessoryOverlay: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  accessoryBadge: {
    width: '78%',
    height: '72%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 250, 254, 0.9)',
  },
  accessoryGlyph: {
    fontSize: 38,
  },
  accessoryImage: {
    width: '92%',
    height: '90%',
  },
  overlayLabel: {
    maxWidth: '100%',
    color: '#684B70',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 250, 254, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  editingControls: {
    marginBottom: 2,
  },
  sizeButton: {
    position: 'absolute',
    bottom: 12,
    zIndex: 5,
    minWidth: 64,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#C54AB7',
    shadowColor: '#8C3A83',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  sizeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  lowerLeftControl: {
    left: 12,
  },
  lowerRightControl: {
    right: 12,
  },
  floatingSizeControl: {
    position: 'absolute',
    bottom: 12,
    zIndex: 5,
    width: 260,
    maxWidth: '90%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0D8EB',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: '#76537A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  floatingSizeLabel: {
    width: 36,
    color: '#78438E',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeSlider: {
    flex: 1,
    height: 40,
  },
  doneButton: {
    minWidth: 52,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#F1E2F8',
  },
  doneButtonText: {
    color: '#78438E',
    fontSize: 12,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  controlButton: {
    width: 64,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F1E2F8',
  },
  controlButtonIcon: {
    color: '#A64FC1',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 19,
  },
  controlButtonText: {
    color: '#78438E',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledControl: {
    opacity: 0.38,
    backgroundColor: '#F4EEF5',
  },
  catalogStrip: {
    height: 104,
    justifyContent: 'center',
  },
  catalogItems: {
    minHeight: 100,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  catalogCard: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  selectedCatalogCard: {
    borderColor: '#C54AB7',
    backgroundColor: '#FFF0FA',
  },
  dressCatalogImage: {
    width: 58,
    height: 68,
  },
  catalogLabel: {
    maxWidth: 90,
    color: '#684B70',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  smallAccessoryBadge: {
    width: 54,
    height: 52,
    borderRadius: 20,
  },
  smallAccessoryGlyph: {
    fontSize: 27,
  },
  comingSoonStrip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    color: '#A784AE',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCatalog: {
    flex: 1,
  },
  toolbar: {
    minHeight: 96,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0D8EB',
    backgroundColor: '#FFFFFF',
  },
  toolbarItems: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  toolItem: {
    minWidth: 78,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#FFF5FB',
  },
  activeToolItem: {
    backgroundColor: '#A64FC1',
  },
  activeToolText: {
    color: '#FFFFFF',
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 3,
  },
  toolLabel: {
    color: '#684B70',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
