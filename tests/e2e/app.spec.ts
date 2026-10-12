import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_FILTERS } from "../../src/types/domain";
import { DEMO_STORAGE_KEY } from "../../src/data/localRepository";
async function onboard(page: Page, skip = true) {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  if (!skip)
    await page
      .getByRole("button", { name: "Настольные игры", exact: true })
      .click();
  await page
    .getByRole("button", {
      name: skip ? "Пропустить" : "Продолжить",
      exact: true,
    })
    .click();
  await expect(page.getByText("Чем займёмся?", { exact: true })).toBeVisible();
}
async function goHome(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Чем займёмся?", { exact: true })).toBeVisible();
}

test("полный сценарий: интересы, подбор, другое, избранное, история, перезапуск, повтор, сюрприз", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await onboard(page, false);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить число участников" })
    .click({ clickCount: 2, delay: 150 });
  await expect(page.getByTestId("participants-count")).toHaveText("3");
  await page.getByRole("button", { name: "2 часа", exact: true }).click();
  await page.getByRole("button", { name: "Дома", exact: true }).click();
  await page
    .getByRole("button", { name: "Спокойного отдыха", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  const firstTitle = await page.getByTestId("activity-title").innerText();
  await page.getByRole("button", { name: "Другое", exact: true }).click();
  await expect(page.getByTestId("activity-title")).not.toHaveText(firstTitle);
  const savedTitle = await page.getByTestId("activity-title").innerText();
  await page.screenshot({
    path: "test-results/recommendation-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Займусь этим", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "План выбран", exact: true }),
  ).toBeDisabled();
  await page.goto("/favorites");
  await expect(page.getByText(savedTitle, { exact: true })).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText("План выбран", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Открыть: ${firstTitle}` }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("План выбран", { exact: true })).toBeVisible();
  await goHome(page);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByTestId("participants-count")).toHaveText("3");
  await expect(
    page.getByRole("button", { name: "2 часа", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Дома", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await goHome(page);
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    DEMO_STORAGE_KEY,
  );
  expect(stored.data.preferences.interests).toEqual(["board_games"]);
  expect(stored.data.preferences.lastFilters.participants).toBe(3);
  expect(stored.data.history[0].filters).toEqual({
    participants: null,
    availableMinutes: null,
    budgetPerPerson: null,
    location: "any",
    mood: "any",
  });
  expect(stored.data.favorites).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("пропуск онбординга, границы счётчика, пустая выдача и изменение условий", async ({
  page,
}) => {
  await onboard(page);
  // Каталог покрывает все стандартные сочетания; моделируем сохранённый короткий лимит.
  await page.evaluate(
    ({ key, filters }) => {
      const stored = JSON.parse(localStorage.getItem(key) ?? "{}");
      stored.data.preferences.lastFilters = {
        ...filters,
        availableMinutes: 5,
        budgetPerPerson: 0,
        location: "venue",
      };
      localStorage.setItem(key, JSON.stringify(stored));
    },
    { key: DEMO_STORAGE_KEY, filters: DEFAULT_FILTERS },
  );
  await goHome(page);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Уменьшить число участников" }),
  ).toBeDisabled();
  for (let i = 1; i < 10; i++)
    await page
      .getByRole("button", { name: "Увеличить число участников" })
      .click();
  await expect(
    page.getByRole("button", { name: "Увеличить число участников" }),
  ).toBeDisabled();
  for (let i = 10; i > 1; i--)
    await page
      .getByRole("button", { name: "Уменьшить число участников" })
      .click();
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  await expect(
    page.getByText("Пока не нашли ничего подходящего", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Изменить условия", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Бесплатно", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "До 30 минут", exact: true }).click();
  await page.getByRole("button", { name: "Дома", exact: true }).click();
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
});

test("деморежим после загрузки работает офлайн, интересы сохраняются, очистка требует подтверждения", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Прогулки", exact: true }).click();
  await page
    .getByRole("button", { name: "Сохранить интересы", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Интересы сохранены", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Прогулки", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await goHome(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Очистить историю", exact: true })
    .click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await page
    .getByRole("button", { name: "Очистить историю", exact: true })
    .click();
  await page.getByRole("button", { name: "Да, очистить", exact: true }).click();
  await expect(
    page.getByText("Сохранено идей: 1. Рекомендаций в истории: 0.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("исчерпание серии и явный перезапуск", async ({ page }) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить число участников" })
    .click();
  await page.getByRole("button", { name: "До 30 минут", exact: true }).click();
  await page.getByRole("button", { name: "Бесплатно", exact: true }).click();
  await page
    .getByRole("button", { name: "Куда-нибудь сходить", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "Другое", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "Другое", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "Другое", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "Другое", exact: true }).click();
  await expect(
    page.getByText("Все идеи посмотрели", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Начать заново", exact: true })
    .click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
});

test("ошибка записи в избранное показывает повторную попытку", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "whatnext.demo.v1") {
        Storage.prototype.setItem = original;
        throw new Error("test write failure");
      }
      original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .getByText(
        "Не удалось сохранить изменение в избранном. Попробуй ещё раз.",
        { exact: true },
      ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Повторить попытку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
});

test("повтор после ошибки сохранения подбора открывает результат без дубликатов", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Подобрать занятие", exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "whatnext.demo.v1" && ++writes === 2) {
        Storage.prototype.setItem = original;
        throw new Error("test history write failure");
      }
      original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Предложить занятие", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Не удалось сохранить подбор и историю.");
  await page.getByRole("button", { name: "Повторить попытку", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}").data.history.length, DEMO_STORAGE_KEY)).toBe(1);
});

test("повреждённое хранилище даёт ошибку загрузки и не удаляет данные", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "broken"),
    DEMO_STORAGE_KEY,
  );
  await page.goto("/");
  await expect(
    page.getByText("Не удалось загрузить данные", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), DEMO_STORAGE_KEY),
  ).toBe("broken");
});

test("маленький экран не имеет горизонтального переполнения", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await onboard(page);
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await expect(
    page.getByRole("button", { name: "В избранное", exact: true }),
  ).toBeVisible();
});
