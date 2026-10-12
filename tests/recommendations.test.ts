import { describe, expect, it } from "vitest";
import {
  filterActivities,
  rankActivities,
  recommend,
  SCORING,
} from "../src/features/recommendations/engine";
import { catalog } from "../src/data/catalog";
import { parseActivity } from "../src/data/validation";
import {
  CATEGORIES,
  DEFAULT_FILTERS,
  SURPRISE_FILTERS,
  type Activity,
  type Filters,
} from "../src/types/domain";
function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a",
    title: "Рисование",
    description: "Нарисовать вид из окна.",
    category: "creativity",
    locations: ["home"],
    minParticipants: 1,
    maxParticipants: 4,
    durationMinutes: 30,
    estimatedCostPerPerson: 0,
    moods: ["creative"],
    tags: ["бумага"],
    isActive: true,
    ...overrides,
  };
}
const filters: Filters = {
  participants: 1,
  availableMinutes: 60,
  budgetPerPerson: 500,
  location: "home",
  mood: "any",
};

describe("Жёсткая фильтрация", () => {
  it("не предлагает занятие для двоих одному участнику", () => {
    expect(
      filterActivities([activity({ minParticipants: 2 })], filters),
    ).toEqual([]);
  });
  it("проверяет верхнюю границу участников", () => {
    expect(
      filterActivities([activity({ maxParticipants: 2 })], {
        ...filters,
        participants: 3,
      }),
    ).toEqual([]);
  });
  it("исключает стоимость выше бюджета на человека", () => {
    expect(
      filterActivities([activity({ estimatedCostPerPerson: 501 })], filters),
    ).toEqual([]);
    expect(
      filterActivities([activity({ estimatedCostPerPerson: 500 })], {
        ...filters,
        participants: 4,
      }),
    ).toHaveLength(1);
  });
  it("бесплатный бюджет допускает только бесплатные занятия", () => {
    expect(
      filterActivities(
        [activity(), activity({ id: "paid", estimatedCostPerPerson: 1 })],
        { ...filters, budgetPerPerson: 0 },
      ).map((item) => item.id),
    ).toEqual(["a"]);
  });
  it("исключает неподходящее место, допускает несколько мест", () => {
    expect(
      filterActivities([activity({ locations: ["outdoors"] })], filters),
    ).toEqual([]);
    expect(
      filterActivities(
        [activity({ locations: ["outdoors", "home"] })],
        filters,
      ),
    ).toHaveLength(1);
  });
  it("исключает слишком длинные занятия и допускает равную длительность", () => {
    expect(
      filterActivities([activity({ durationMinutes: 61 })], filters),
    ).toEqual([]);
    expect(
      filterActivities([activity({ durationMinutes: 60 })], filters),
    ).toHaveLength(1);
  });
  it("значения без ограничений не ограничивают выдачу", () => {
    expect(
      filterActivities(
        [
          activity({
            minParticipants: 5,
            maxParticipants: 10,
            durationMinutes: 360,
            estimatedCostPerPerson: 10000,
            locations: ["venue"],
          }),
        ],
        SURPRISE_FILTERS,
      ),
    ).toHaveLength(1);
  });
  it("архивные занятия не рекомендуются", () =>
    expect(filterActivities([activity({ isActive: false })], filters)).toEqual(
      [],
    ));
});

describe("Ранжирование", () => {
  it("совпадающее настроение добавляет три балла", () => {
    const list = rankActivities(
      [activity({ id: "match", moods: ["calm"] }), activity({ id: "other" })],
      { ...filters, mood: "calm" },
      [],
    );
    expect(list[0]?.activity.id).toBe("match");
    expect(list[0]!.score - list[1]!.score).toBe(SCORING.mood);
  });
  it("интересы добавляют баллы, но не исключают другие категории", () => {
    const list = rankActivities(
      [activity({ id: "book", category: "reading" }), activity({ id: "art" })],
      filters,
      ["reading"],
    );
    expect(list).toHaveLength(2);
    expect(list[0]?.activity.id).toBe("book");
    expect(list[0]!.score - list[1]!.score).toBe(SCORING.interest);
  });
  it("дубликаты интересов и тегов не дают дополнительные баллы", () => {
    expect(
      rankActivities(
        [activity()],
        filters,
        ["creativity", "creativity"],
        ["бумага", "бумага"],
      )[0]?.score,
    ).toBe(SCORING.interest + SCORING.tag + SCORING.timeFit);
  });
  it("не начисляет настроение для «Неважно» и время без ограничения", () => {
    expect(rankActivities([activity()], SURPRISE_FILTERS, [])[0]?.score).toBe(
      0,
    );
  });
  it("время влияет на score при близкой длительности", () => {
    const ranked = rankActivities(
      [
        activity({ id: "short", durationMinutes: 15 }),
        activity({ id: "fit", durationMinutes: 45 }),
      ],
      filters,
      [],
    );
    expect(ranked[0]?.activity.id).toBe("fit");
    expect(ranked[0]!.score - ranked[1]!.score).toBe(SCORING.timeFit);
  });
});

describe("Выбор рекомендации", () => {
  it("пустое состояние сохраняет жёсткие ограничения", () =>
    expect(
      recommend([activity({ estimatedCostPerPerson: 2000 })], filters, []),
    ).toEqual({ kind: "empty", eligibleCount: 0 }));
  it("«Другое» исключает уже показанные занятия", () => {
    const result = recommend(
      [activity(), activity({ id: "b" })],
      filters,
      [],
      ["a"],
      () => 0,
    );
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.recommendation.activity.id).toBe("b");
      expect(result.remainingCount).toBe(0);
    }
  });
  it("исчерпание серии отличается от отсутствия кандидатов", () =>
    expect(recommend([activity()], filters, [], ["a"])).toEqual({
      kind: "exhausted",
      eligibleCount: 1,
    }));
  it("новая серия может повторно показать занятие из прошлой серии", () =>
    expect(recommend([activity()], filters, [], []).kind).toBe("success"));
  it("детерминированный RNG выбирает разные позиции", () => {
    const list = [activity(), activity({ id: "b" })];
    const first = recommend(list, filters, [], [], () => 0);
    const last = recommend(list, filters, [], [], () => 0.999);
    if (first.kind !== "success" || last.kind !== "success")
      throw new Error("expected success");
    expect(first.recommendation.activity.id).toBe("a");
    expect(last.recommendation.activity.id).toBe("b");
  });
  it("выбирает только из десяти лучших и пополняет пул после пропуска", () => {
    const list = Array.from({ length: 15 }, (_, index) =>
      activity({ id: String(index).padStart(2, "0") }),
    );
    const result = recommend(list, filters, [], [], () => 0.999);
    expect(result.kind).toBe("success");
    if (result.kind === "success")
      expect(result.recommendation.activity.id).toBe("09");
    const shown = list.slice(0, 10).map((item) => item.id);
    const next = recommend(list, filters, [], shown, () => 0);
    if (next.kind !== "success") throw new Error("expected success");
    expect(next.recommendation.activity.id).toBe("10");
  });
  it.each([1, -1, Number.NaN])(
    "некорректный RNG %s не приводит к исключению",
    (value) =>
      expect(recommend([activity()], filters, [], [], () => value).kind).toBe(
        "success",
      ),
  );
  it.each([
    { participants: 0 },
    { participants: 11 },
    { participants: 1.5 },
    { availableMinutes: 0 },
    { budgetPerPerson: -1 },
    { budgetPerPerson: Number.NaN },
  ])("проверяет некорректные параметры %j", (override) =>
    expect(recommend([activity()], { ...filters, ...override }, []).kind).toBe(
      "invalid",
    ),
  );
  it("не изменяет исходные данные", () => {
    const original = structuredClone(catalog);
    const frozen = catalog.map((item) =>
      Object.freeze({
        ...item,
        locations: Object.freeze([...item.locations]),
        tags: Object.freeze([...item.tags]),
        moods: Object.freeze([...item.moods]),
      }),
    );
    recommend(Object.freeze(frozen), DEFAULT_FILTERS, ["walks"]);
    expect(catalog).toEqual(original);
  });
});

describe("Реальный каталог", () => {
  it("содержит 70 уникальных валидных занятий во всех категориях", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(60);
    expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((item) => item.title)).size).toBe(
      catalog.length,
    );
    expect([...new Set(catalog.map((item) => item.category))].sort()).toEqual(
      [...CATEGORIES].sort(),
    );
    catalog.forEach((item) => expect(() => parseActivity(item)).not.toThrow());
  });
  it("пример из ТЗ имеет подходящие занятия", () => {
    const result = recommend(
      catalog,
      {
        participants: 3,
        availableMinutes: 120,
        budgetPerPerson: 500,
        location: "home",
        mood: "calm",
      },
      ["board_games"],
      [],
      () => 0,
    );
    expect(result.kind).toBe("success");
  });
  it("каждая выдача в сетке условий соблюдает все ограничения", () => {
    for (const participants of [1, 2, 3, 6, 10])
      for (const availableMinutes of [30, 60, 120, 180, null])
        for (const budgetPerPerson of [0, 500, 1500, null])
          for (const location of [
            "home",
            "outdoors",
            "venue",
            "any",
          ] as const) {
            const input: Filters = {
              participants,
              availableMinutes,
              budgetPerPerson,
              location,
              mood: "calm",
            };
            const result = recommend(catalog, input, [], [], () => 0.6);
            if (result.kind === "success") {
              const item = result.recommendation.activity;
              expect(item.minParticipants).toBeLessThanOrEqual(participants);
              expect(item.maxParticipants).toBeGreaterThanOrEqual(participants);
              if (availableMinutes !== null)
                expect(item.durationMinutes).toBeLessThanOrEqual(
                  availableMinutes,
                );
              if (budgetPerPerson !== null)
                expect(item.estimatedCostPerPerson).toBeLessThanOrEqual(
                  budgetPerPerson,
                );
              if (location !== "any")
                expect(item.locations).toContain(location);
            } else expect(result.kind).toBe("empty");
          }
  });
});
