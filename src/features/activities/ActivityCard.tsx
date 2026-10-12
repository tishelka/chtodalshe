import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Activity } from "../../types/domain";
import {
  categoryLabels,
  costLabel,
  durationLabel,
  locationLabels,
  peopleLabel,
} from "../../lib/labels";
import { categoryStyle } from "../../theme/categories";
import { colors, fonts } from "../../theme/tokens";

export function ActivityCard({
  activity,
  onPress,
  footer,
}: {
  activity: Activity;
  onPress?: () => void;
  footer?: React.ReactNode;
}) {
  const category = categoryStyle[activity.category];
  const content = (
    <>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: category.color }]}>
          <Feather name={category.icon} size={25} color={category.ink} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.category}>
            {categoryLabels[activity.category]}
          </Text>
          <Text style={styles.title}>{activity.title}</Text>
        </View>
        {onPress && (
          <Feather name="chevron-right" size={19} color={colors.muted} />
        )}
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {activity.description}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {durationLabel(activity.durationMinutes)}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>
          {costLabel(activity.estimatedCostPerPerson)}
        </Text>
      </View>
    </>
  );
  return (
    <View style={styles.card}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Открыть: ${activity.title}`}
          onPress={onPress}
          style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.body}>{content}</View>
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

export function ActivityDetails({
  activity,
  reasons,
}: {
  activity: Activity;
  reasons?: string[];
}) {
  const category = categoryStyle[activity.category];
  return (
    <View style={styles.detail}>
      <View style={[styles.visual, { backgroundColor: category.color }]}>
        <View style={styles.ring} />
        <View style={[styles.ring, { width: 175, height: 175 }]} />
        <View style={[styles.detailIcon, { backgroundColor: "#FFFFFF99" }]}>
          <Feather name={category.icon} size={62} color={category.ink} />
        </View>
        <Feather
          name="star"
          size={20}
          color={category.ink}
          style={{ position: "absolute", top: 35, right: 48 }}
        />
      </View>
      <View style={styles.detailBody}>
        <Text style={[styles.badge, { color: category.ink }]}>
          {categoryLabels[activity.category]}
        </Text>
        <Text
          accessibilityRole="header"
          testID="activity-title"
          style={styles.detailTitle}
        >
          {activity.title}
        </Text>
        <Text style={styles.detailDescription}>{activity.description}</Text>
        <View style={styles.stats}>
          <Stat
            icon="clock"
            text={`От ${durationLabel(activity.durationMinutes)}`}
          />
          <Stat
            icon="users"
            text={
              activity.minParticipants === activity.maxParticipants
                ? peopleLabel(activity.minParticipants)
                : `${activity.minParticipants}–${activity.maxParticipants} человек`
            }
          />
          <Stat
            icon="credit-card"
            text={costLabel(activity.estimatedCostPerPerson)}
          />
          <Stat
            icon="map-pin"
            text={activity.locations
              .map((location) => locationLabels[location])
              .join(" / ")}
          />
        </View>
        {reasons && (
          <View style={styles.reasons}>
            <Feather name="check-circle" size={20} color={colors.primary} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.why}>Почему эта идея</Text>
              {reasons.map((reason) => (
                <Text key={reason} style={styles.reason}>
                  {reason}
                </Text>
              ))}
            </View>
          </View>
        )}
        {activity.preparation && (
          <View style={{ gap: 8 }}>
            <Text style={styles.why}>Перед началом</Text>
            <Text style={styles.detailDescription}>{activity.preparation}</Text>
          </View>
        )}
        <Text style={styles.priceNote}>
          Стоимость — примерная оценка на человека. Проверь расходы перед
          началом.
        </Text>
      </View>
    </View>
  );
}
function Stat({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  text: string;
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={17} color={colors.muted} />
      <Text style={styles.statText}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  body: { padding: 20, gap: 14 },
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  category: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 25,
    color: colors.text,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaText: { fontFamily: fonts.medium, color: colors.text, fontSize: 12 },
  dot: { color: colors.muted },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detail: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  visual: {
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: "#FFFFFF99",
  },
  detailIcon: {
    width: 116,
    height: 116,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },
  detailBody: { padding: 24, gap: 20 },
  badge: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5 },
  detailTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    lineHeight: 37,
    letterSpacing: -0.8,
    color: colors.text,
  },
  detailDescription: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 24,
    color: colors.muted,
  },
  stats: { gap: 13, paddingVertical: 4 },
  stat: { flexDirection: "row", alignItems: "center", gap: 11 },
  statText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 22,
    color: colors.text,
    flex: 1,
  },
  reasons: {
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 11,
  },
  why: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  reason: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 21,
    color: colors.primary,
  },
  priceNote: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 17,
  },
});
