import type { Page } from "@playwright/test";
import { expect, test, onboard, apiUrl } from "./helpers";
import { DEFAULT_FILTERS } from "../../src/types/domain";
async function goHome(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Чем займёмся?", { exact: true })).toBeVisible();
}

test("полный сценарий: интересы, подбор, другое, избранное, история, перезапуск, повтор, сюрприз", async ({
  page,
  request,
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
  const preferences = await (await request.get(`${apiUrl}/preferences`)).json();
  const history = await (await request.get(`${apiUrl}/history`)).json();
  expect(preferences.interests).toEqual(["board_games"]);
  expect(preferences.lastFilters.participants).toBe(3);
  expect(history[0].filters).toEqual({
    participants: null,
    availableMinutes: null,
    budgetPerPerson: null,
    location: "any",
    mood: "any",
  });
  expect(await (await request.get(`${apiUrl}/favorites`)).json()).toHaveLength(
    1,
  );
  expect(errors).toEqual([]);
});

test("пропуск онбординга, границы счётчика, пустая выдача и изменение условий", async ({
  page,
  request,
}) => {
  await onboard(page);
  await request.put(`${apiUrl}/preferences`, {
    data: {
      interests: [],
      onboardingCompleted: true,
      lastFilters: {
        ...DEFAULT_FILTERS,
        availableMinutes: 5,
        budgetPerPerson: 0,
        location: "venue",
      },
    },
  });
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

test("интересы сохраняются на сервере, очистка истории требует подтверждения", async ({
  page,
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
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
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
  let failed = false;
  await page.route(`${apiUrl}/favorites/**`, (route) => {
    if (!failed && route.request().method() === "PUT") {
      failed = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    }
    return route.continue();
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

test("повтор после ошибки сохранения подбора открывает результат без дубликатов", async ({
  page,
  request,
}) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  let failed = false;
  await page.route(`${apiUrl}/history/**`, async (route) => {
    if (!failed && route.request().method() === "PUT") {
      failed = true;
      // Сервер записал историю, но клиент не получил успешный ответ.
      await route.fetch();
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось сохранить подбор и историю.",
  );
  await page
    .getByRole("button", { name: "Повторить попытку", exact: true })
    .click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  expect(await (await request.get(`${apiUrl}/history`)).json()).toHaveLength(1);
});

test("недоступный сервер даёт ошибку загрузки и позволяет повторить запрос", async ({
  page,
}) => {
  await page.route(`${apiUrl}/**`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: "{}",
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Не удалось загрузить данные", { exact: true }),
  ).toBeVisible();
  await page.unroute(`${apiUrl}/**`);
  await page
    .getByRole("button", { name: "Повторить попытку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Начать", exact: true }),
  ).toBeVisible();
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
