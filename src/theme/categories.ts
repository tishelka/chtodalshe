import type { ComponentProps } from "react";
import type Feather from "@expo/vector-icons/Feather";
import type { Category } from "../types/domain";
import { colors } from "./tokens";
export type IconName = ComponentProps<typeof Feather>["name"];
export const categoryStyle: Record<
  Category,
  { icon: IconName; color: string; ink: string }
> = {
  movies: { icon: "film", color: colors.lilac, ink: "#736183" },
  video_games: { icon: "monitor", color: colors.blue, ink: "#4E7483" },
  board_games: { icon: "grid", color: colors.peach, ink: "#9A6E3F" },
  walks: { icon: "sun", color: colors.primarySoft, ink: colors.primary },
  sport: { icon: "activity", color: colors.peach, ink: "#9A6E3F" },
  creativity: { icon: "edit-3", color: colors.lilac, ink: "#736183" },
  cooking: { icon: "coffee", color: colors.yellow, ink: "#90763C" },
  reading: { icon: "book-open", color: colors.blue, ink: "#4E7483" },
  culture: { icon: "columns", color: colors.lilac, ink: "#736183" },
  social: {
    icon: "message-circle",
    color: colors.primarySoft,
    ink: colors.primary,
  },
};
