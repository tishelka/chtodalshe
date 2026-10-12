import type { Activity, Category, Filters } from "../../types/domain";
import { LOCATIONS, MOODS } from "../../types/domain";

export const SCORING = {
  mood: 3,
  interest: 2,
  tag: 1,
  timeFit: 1,
  timeFitWindowMinutes: 30,
  candidateLimit: 10,
} as const;
export interface RankedActivity {
  activity: Activity;
  score: number;
  reasons: string[];
}
export type RecommendationResult =
  | {
      kind: "success";
      recommendation: RankedActivity;
      eligibleCount: number;
      remainingCount: number;
    }
  | { kind: "empty" | "exhausted"; eligibleCount: number }
  | { kind: "invalid"; errors: string[] };

export function validateFilters(filters: Filters): string[] {
  const errors: string[] = [];
  if (
    filters.participants !== null &&
    (!Number.isInteger(filters.participants) ||
      filters.participants < 1 ||
      filters.participants > 10)
  )
    errors.push("Выбери от 1 до 10 участников.");
  if (
    filters.availableMinutes !== null &&
    (!Number.isFinite(filters.availableMinutes) ||
      filters.availableMinutes <= 0)
  )
    errors.push("Укажи доступное время больше нуля.");
  if (
    filters.budgetPerPerson !== null &&
    (!Number.isFinite(filters.budgetPerPerson) || filters.budgetPerPerson < 0)
  )
    errors.push("Бюджет не может быть отрицательным.");
  if (filters.location !== "any" && !LOCATIONS.includes(filters.location))
    errors.push("Выбери место из списка.");
  if (filters.mood !== "any" && !MOODS.includes(filters.mood))
    errors.push("Выбери настроение из списка.");
  return errors;
}

export function filterActivities(
  activities: readonly Activity[],
  filters: Filters,
): Activity[] {
  if (validateFilters(filters).length) return [];
  return activities.filter(
    (activity) =>
      activity.isActive &&
      (filters.participants === null ||
        (activity.minParticipants <= filters.participants &&
          activity.maxParticipants >= filters.participants)) &&
      (filters.availableMinutes === null ||
        activity.durationMinutes <= filters.availableMinutes) &&
      (filters.budgetPerPerson === null ||
        activity.estimatedCostPerPerson <= filters.budgetPerPerson) &&
      (filters.location === "any" ||
        activity.locations.includes(filters.location)),
  );
}

export function rankActivities(
  activities: readonly Activity[],
  filters: Filters,
  interests: readonly Category[],
  preferredTags: readonly string[] = [],
): RankedActivity[] {
  return activities
    .map((activity) => {
      let score = 0;
      const reasons: string[] = [];
      if (filters.mood !== "any" && activity.moods.includes(filters.mood)) {
        score += SCORING.mood;
        reasons.push("Совпадает с твоим настроением");
      }
      if (interests.includes(activity.category)) {
        score += SCORING.interest;
        reasons.push("Из категории, которая тебе интересна");
      }
      if (preferredTags.some((tag) => activity.tags.includes(tag))) {
        score += SCORING.tag;
        reasons.push("Есть подходящие тебе детали");
      }
      if (
        filters.availableMinutes !== null &&
        filters.availableMinutes >= activity.durationMinutes &&
        filters.availableMinutes - activity.durationMinutes <=
          SCORING.timeFitWindowMinutes
      ) {
        score += SCORING.timeFit;
        reasons.push("Хорошо вписывается в доступное время");
      }
      if (!reasons.length)
        reasons.push("Новая идея, которая подходит под твои условия");
      return { activity, score, reasons };
    })
    .sort(
      (a, b) => b.score - a.score || a.activity.id.localeCompare(b.activity.id),
    );
}

export function recommend(
  activities: readonly Activity[],
  filters: Filters,
  interests: readonly Category[],
  shownIds: readonly string[] = [],
  random: () => number = Math.random,
): RecommendationResult {
  const errors = validateFilters(filters);
  if (errors.length) return { kind: "invalid", errors };
  const eligible = filterActivities(activities, filters);
  if (!eligible.length) return { kind: "empty", eligibleCount: 0 };
  const shown = new Set(shownIds);
  const remaining = eligible.filter((activity) => !shown.has(activity.id));
  if (!remaining.length)
    return { kind: "exhausted", eligibleCount: eligible.length };
  const candidates = rankActivities(remaining, filters, interests).slice(
    0,
    SCORING.candidateLimit,
  );
  const value = random();
  // Защита от некорректного внешнего RNG, в том числе значения ровно 1.
  const index = Number.isFinite(value)
    ? Math.min(
        candidates.length - 1,
        Math.max(0, Math.floor(value * candidates.length)),
      )
    : 0;
  const recommendation = candidates[index]!;
  return {
    kind: "success",
    recommendation,
    eligibleCount: eligible.length,
    remainingCount: remaining.length - 1,
  };
}
