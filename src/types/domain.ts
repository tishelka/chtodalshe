export const CATEGORIES = [
  "movies",
  "video_games",
  "board_games",
  "walks",
  "sport",
  "creativity",
  "cooking",
  "reading",
  "culture",
  "social",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const LOCATIONS = ["home", "outdoors", "venue"] as const;
export type ActivityLocation = (typeof LOCATIONS)[number];
export const MOODS = ["calm", "active", "social", "creative"] as const;
export type Mood = (typeof MOODS)[number];

export interface Activity {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: Category;
  readonly locations: readonly ActivityLocation[];
  readonly minParticipants: number;
  readonly maxParticipants: number;
  readonly durationMinutes: number;
  readonly estimatedCostPerPerson: number;
  readonly moods: readonly Mood[];
  readonly tags: readonly string[];
  readonly preparation?: string;
  readonly isActive: boolean;
}

export interface Filters {
  participants: number | null;
  availableMinutes: number | null;
  budgetPerPerson: number | null;
  location: ActivityLocation | "any";
  mood: Mood | "any";
}
export interface Preferences {
  interests: Category[];
  onboardingCompleted: boolean;
  lastFilters: Filters | null;
}
export interface HistoryEntry {
  id: string;
  activityId: string;
  createdAt: string;
  filters: Filters;
  chosen: boolean;
}
export interface UserData {
  preferences: Preferences;
  favorites: string[];
  history: HistoryEntry[];
}
export type DataMode = "demo" | "api";

export const DEFAULT_FILTERS: Filters = {
  participants: 1,
  availableMinutes: 60,
  budgetPerPerson: 500,
  location: "any",
  mood: "any",
};
export const SURPRISE_FILTERS: Filters = {
  participants: null,
  availableMinutes: null,
  budgetPerPerson: null,
  location: "any",
  mood: "any",
};
export function emptyUserData(): UserData {
  return {
    preferences: {
      interests: [],
      onboardingCompleted: false,
      lastFilters: null,
    },
    favorites: [],
    history: [],
  };
}
