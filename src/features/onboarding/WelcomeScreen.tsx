import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { IdeaArtwork } from "../../components/IdeaArtwork";
import { PrimaryButton, ScreenContainer } from "../../components/ui";
import { colors, fonts } from "../../theme/tokens";
export function WelcomeScreen() {
  const router = useRouter();
  return (
    <ScreenContainer style={{ flexGrow: 1, justifyContent: "space-between" }}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Feather name="compass" size={24} color={colors.surface} />
        </View>
        <Text style={styles.brandName}>ЧтоДальше</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.artBackground}>
          <IdeaArtwork />
        </View>
        <Text style={styles.eyebrow}>МЕНЬШЕ ВЫБОРА. БОЛЬШЕ ЖИЗНИ.</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Не знаешь,{"\n"}чем заняться?
        </Text>
        <Text style={styles.description}>
          Расскажи, сколько у тебя времени и чего хочется, а мы предложим
          подходящий вариант.
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label="Начать"
          icon="arrow-right"
          onPress={() => router.push("/interests")}
        />
        <Text style={styles.note}>Твои интересы. Твой ритм. Твои планы.</Text>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  brand: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 12 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.8,
  },
  main: { gap: 20, paddingVertical: 20 },
  artBackground: {
    backgroundColor: colors.primarySoft,
    borderRadius: 36,
    paddingVertical: 22,
    marginBottom: 12,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 40,
    lineHeight: 49,
    letterSpacing: -1.8,
    color: colors.text,
  },
  description: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 27,
  },
  footer: { gap: 16, paddingBottom: 12 },
  note: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
