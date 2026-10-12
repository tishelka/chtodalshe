import {
  CATEGORIES,
  LOCATIONS,
  MOODS,
  type Activity,
  type Category,
  type Filters,
  type HistoryEntry,
  type Preferences,
  type UserData,
} from "../types/domain";
import { validateFilters } from "../features/recommendations/engine";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
function isInterestArray(value: unknown): value is Category[] {
  return (
    isStringArray(value) &&
    value.every((item) => CATEGORIES.some((category) => category === item))
  );
}
function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

export function parseFilters(value: unknown): Filters {
  if (
    !isRecord(value) ||
    !isNullableNumber(value.participants) ||
    !isNullableNumber(value.availableMinutes) ||
    !isNullableNumber(value.budgetPerPerson) ||
    !["any", ...LOCATIONS].some((location) => location === value.location) ||
    !["any", ...MOODS].some((mood) => mood === value.mood)
  )
    throw new Error("invalid filters");
  const filters = value as unknown as Filters;
  if (validateFilters(filters).length) throw new Error("invalid filters");
  return { ...filters };
}
export function parsePreferences(value: unknown): Preferences {
  if (
    !isRecord(value) ||
    !isInterestArray(value.interests) ||
    typeof value.onboardingCompleted !== "boolean"
  )
    throw new Error("invalid preferences");
  return {
    interests: [...new Set(value.interests)],
    onboardingCompleted: value.onboardingCompleted,
    lastFilters:
      value.lastFilters === null ? null : parseFilters(value.lastFilters),
  };
}
export function parseHistory(value: unknown): HistoryEntry {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.activityId !== "string" ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.chosen !== "boolean"
  )
    throw new Error("invalid history");
  return {
    id: value.id,
    activityId: value.activityId,
    createdAt: value.createdAt,
    filters: parseFilters(value.filters),
    chosen: value.chosen,
  };
}
export function parseUserData(value: unknown): UserData {
  if (
    !isRecord(value) ||
    !isStringArray(value.favorites) ||
    !Array.isArray(value.history)
  )
    throw new Error("invalid user data");
  return {
    preferences: parsePreferences(value.preferences),
    favorites: [...new Set(value.favorites)],
    history: value.history
      .map(parseHistory)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
export function parseActivity(value: unknown): Activity {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.description !== "string" ||
    !CATEGORIES.some((category) => category === value.category) ||
    !isStringArray(value.locations) ||
    !value.locations.length ||
    !value.locations.every((location) =>
      LOCATIONS.some((item) => item === location),
    ) ||
    !isStringArray(value.moods) ||
    !value.moods.length ||
    !value.moods.every((mood) => MOODS.some((item) => item === mood)) ||
    !isStringArray(value.tags) ||
    typeof value.minParticipants !== "number" ||
    !Number.isInteger(value.minParticipants) ||
    value.minParticipants < 1 ||
    typeof value.maxParticipants !== "number" ||
    !Number.isInteger(value.maxParticipants) ||
    value.maxParticipants > 10 ||
    value.maxParticipants < value.minParticipants ||
    typeof value.durationMinutes !== "number" ||
    !Number.isInteger(value.durationMinutes) ||
    value.durationMinutes <= 0 ||
    typeof value.estimatedCostPerPerson !== "number" ||
    !Number.isFinite(value.estimatedCostPerPerson) ||
    value.estimatedCostPerPerson < 0 ||
    typeof value.isActive !== "boolean" ||
    (value.preparation !== undefined && typeof value.preparation !== "string")
  )
    throw new Error("invalid activity");
  return value as unknown as Activity;
}
