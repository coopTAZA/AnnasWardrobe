import { useEffect, useRef, useState } from 'react';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useRotationGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

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

type AccessoryOption = CatalogItem & {
  category: AccessoryCategory;
  icon: string;
};

type LayerItem = {
  id: string;
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
    { id: 'rose-shades', label: 'Rose Cat-Eye', category: 'Sunglasses', icon: '🕶️', aspectRatio: 1.55, color: '#E66FAF' },
    { id: 'round-shades', label: 'Round Frames', category: 'Sunglasses', icon: '👓', aspectRatio: 1.45, color: '#9B64CC' },
    { id: 'star-shades', label: 'Star Frames', category: 'Sunglasses', icon: '✨', aspectRatio: 1.35, color: '#D5A441' },
  ],
  Earrings: [
    { id: 'pearl-drops', label: 'Pearl Drops', category: 'Earrings', icon: '🤍', aspectRatio: 0.9, color: '#D5A441' },
    { id: 'star-drops', label: 'Star Drops', category: 'Earrings', icon: '⭐', aspectRatio: 0.9, color: '#D99538' },
    { id: 'crystal-drops', label: 'Crystal Drops', category: 'Earrings', icon: '💎', aspectRatio: 0.9, color: '#9D70D5' },
  ],
  Necklaces: [
    { id: 'heart-necklace', label: 'Heart Charm', category: 'Necklaces', icon: '💜', aspectRatio: 1.2, color: '#C45BB3' },
    { id: 'pearl-necklace', label: 'Pearl Strand', category: 'Necklaces', icon: '📿', aspectRatio: 1.2, color: '#D5A441' },
    { id: 'star-necklace', label: 'Star Pendant', category: 'Necklaces', icon: '🌟', aspectRatio: 1.2, color: '#D99538' },
  ],
  Handbags: [
    { id: 'pink-satchel', label: 'Pink Satchel', category: 'Handbags', icon: '👜', aspectRatio: 0.95, color: '#E66FAF' },
    { id: 'lavender-clutch', label: 'Lavender Clutch', category: 'Handbags', icon: '👛', aspectRatio: 0.95, color: '#9B64CC' },
    { id: 'gem-backpack', label: 'Gem Backpack', category: 'Handbags', icon: '🎒', aspectRatio: 0.95, color: '#6A8EDB' },
  ],
  Hats: [
    { id: 'sun-hat', label: 'Sun Hat', category: 'Hats', icon: '👒', aspectRatio: 1.3, color: '#E6A55A' },
    { id: 'royal-crown', label: 'Royal Crown', category: 'Hats', icon: '👑', aspectRatio: 1.3, color: '#D5A441' },
    { id: 'star-hat', label: 'Star Hat', category: 'Hats', icon: '🎀', aspectRatio: 1.3, color: '#C45BB3' },
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
  const [activeCategory, setActiveCategory] = useState<WardrobeCategory | null>(null);
  const [editor, setEditor] = useState<EditorState>({
    items: [],
    selectedItemId: null,
    undoStack: [],
  });
  const accessoryIdCounter = useRef(0);

  const imageScale = Math.min(canvasSize.width / photo.width, canvasSize.height / photo.height);
  const photoWidth = canvasSize.width > 0 ? photo.width * imageScale : 0;
  const photoHeight = canvasSize.height > 0 ? photo.height * imageScale : 0;
  const photoX = (canvasSize.width - photoWidth) / 2;
  const photoY = (canvasSize.height - photoHeight) / 2;
  const selectedItem =
    editor.items.find((item) => item.id === editor.selectedItemId) ?? null;
  const accessoriesForCategory =
    activeCategory && isAccessoryCategory(activeCategory)
      ? accessoryOptions[activeCategory]
      : null;

  const selectDress = (dress: DressOption) => {
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
              <AccessoryArtwork option={option} small />
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
    <View style={styles.studioContent}>
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
          onPress={onSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.photoArea}>
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
          <Image
            accessibilityLabel="Photo selected for dress-up"
            resizeMode="contain"
            source={{ uri: photo.uri }}
            style={styles.photoImage}
          />
          {photoWidth > 0 && photoHeight > 0 && (
            <View
              pointerEvents="box-none"
              style={[
                styles.layerPlane,
                { left: photoX, top: photoY, width: photoWidth, height: photoHeight },
              ]}
            >
              {editor.items.map((item, index) => (
                <EditableLayerItem
                  key={item.id}
                  item={item}
                  layerIndex={index}
                  onSelect={selectLayerItem}
                  onTransform={onGestureTransform}
                  photoHeight={photoHeight}
                  photoWidth={photoWidth}
                  selected={editor.selectedItemId === item.id}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.editingControls}>
        <View style={styles.controlRow}>
          <ControlButton
            disabled={!selectedItem}
            label={selectedItem?.kind === 'dress' ? 'Reset Dress' : 'Reset Item'}
            onPress={resetSelectedItem}
          />
          <ControlButton
            disabled={!selectedItem}
            label={selectedItem?.kind === 'dress' ? 'Remove Dress' : 'Remove Item'}
            onPress={removeSelectedItem}
          />
          <ControlButton
            disabled={editor.undoStack.length === 0}
            label="Undo"
            onPress={undo}
          />
        </View>
        <View style={styles.controlRow}>
          <ControlButton
            disabled={!selectedItem || editor.items[editor.items.length - 1]?.id === selectedItem.id}
            label="Bring Forward"
            onPress={() => moveSelectedItem(1)}
          />
          <ControlButton
            disabled={!selectedItem || editor.items[0]?.id === selectedItem.id}
            label="Send Backward"
            onPress={() => moveSelectedItem(-1)}
          />
        </View>
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
    </View>
  );
}

type EditableLayerItemProps = {
  item: LayerItem;
  layerIndex: number;
  photoWidth: number;
  photoHeight: number;
  selected: boolean;
  onSelect: (itemId: string) => void;
  onTransform: (itemId: string, x: number, y: number, scale: number, rotation: number) => void;
};

function EditableLayerItem({
  item,
  layerIndex,
  photoWidth,
  photoHeight,
  selected,
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

  const maxWidth = item.kind === 'dress' ? photoWidth * 0.78 : photoWidth * 0.4;
  const maxHeight = item.kind === 'dress' ? photoHeight * 0.78 : photoHeight * 0.3;
  const itemWidth = Math.min(maxWidth, maxHeight * item.aspectRatio);
  const itemHeight = itemWidth / item.aspectRatio;

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
      translateX.value = panStartX.value + event.translationX;
      translateY.value = panStartY.value + event.translationY;
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
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}rad` }],
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
          selected && styles.selectedLayerItem,
        ]}
      >
        {item.kind === 'dress' && item.source ? (
          <Image
            accessible={false}
            resizeMode="contain"
            source={item.source}
            style={styles.layerImage}
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
      <Text style={[styles.accessoryGlyph, small && styles.smallAccessoryGlyph]}>
        {option?.icon ?? icon ?? '✨'}
      </Text>
    </View>
  );
}

function ControlButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        disabled && styles.disabledControl,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.controlButtonText}>{label}</Text>
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
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  photoArea: {
    flex: 1,
    minHeight: 150,
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
  photoImage: {
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
  layerItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  selectedLayerItem: {
    borderWidth: 2,
    borderColor: '#DB72C7',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 242, 252, 0.18)',
  },
  layerImage: {
    width: '100%',
    height: '100%',
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
    gap: 7,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 7,
  },
  controlButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: '#F1E2F8',
  },
  controlButtonText: {
    color: '#78438E',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledControl: {
    opacity: 0.42,
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
