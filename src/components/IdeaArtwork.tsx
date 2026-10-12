import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/tokens";

// Векторные композиции из нативных элементов: доступны без загрузки изображений.
export function IdeaArtwork({ small = false }: { small?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.art, small && { height: 160 }]}
    >
      <View style={styles.orbit} />
      <View
        style={[styles.orbit, { width: 180, height: 180, top: 25, right: 44 }]}
      />
      <View style={styles.book}>
        <View style={styles.bookLine} />
        <View style={[styles.bookLine, { width: 36 }]} />
        <Feather name="book-open" size={40} color={colors.primary} />
      </View>
      <View style={styles.ticket}>
        <Feather name="film" size={38} color="#736183" />
      </View>
      <View style={styles.sun}>
        <Feather name="sun" size={40} color="#9A7E41" />
      </View>
      <View style={styles.spark}>
        <Feather name="star" size={18} color={colors.primary} />
      </View>
      <View style={[styles.dot, { top: 35, left: 44 }]} />
      <View
        style={[styles.dot, { bottom: 36, right: 20, width: 8, height: 8 }]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  art: { height: 220, width: "100%", maxWidth: 350, alignSelf: "center" },
  orbit: {
    position: "absolute",
    width: 235,
    height: 235,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: "#CFD7C4",
    top: -4,
    right: 18,
  },
  book: {
    position: "absolute",
    width: 112,
    height: 140,
    borderRadius: 16,
    backgroundColor: "#D8E1CA",
    bottom: 24,
    left: 35,
    transform: [{ rotate: "-16deg" }],
    padding: 16,
    gap: 10,
    justifyContent: "center",
    shadowColor: "#45673B",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  bookLine: {
    backgroundColor: "#A8BC99",
    height: 4,
    width: 55,
    borderRadius: 3,
  },
  ticket: {
    position: "absolute",
    width: 104,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#E2D8EE",
    top: 25,
    right: 25,
    transform: [{ rotate: "14deg" }],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1C4E1",
  },
  sun: {
    position: "absolute",
    width: 87,
    height: 87,
    borderRadius: 44,
    bottom: 18,
    right: 38,
    backgroundColor: "#F0E3B9",
    justifyContent: "center",
    alignItems: "center",
  },
  spark: { position: "absolute", left: 163, top: 91 },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 8,
    backgroundColor: "#A4B594",
  },
});
