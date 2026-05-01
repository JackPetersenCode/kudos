import { useState } from "react";
import { Modal, View, Image, Pressable, Text, StyleSheet, FlatList, Dimensions, StatusBar } from "react-native";

type Photo = { id: string; originalUrl: string };

type Props = {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
};

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

export default function PhotoLightbox({ visible, photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: WINDOW_WIDTH, offset: WINDOW_WIDTH * i, index: i })}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / WINDOW_WIDTH);
            setIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image source={{ uri: item.originalUrl }} style={styles.image} resizeMode="contain" />
            </View>
          )}
        />

        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.counter}>
            {index + 1} / {photos.length}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  page: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "white", fontSize: 20, fontWeight: "700" },
  counter: { color: "white", fontWeight: "600", fontSize: 14 },
});
