import { expect, test, type Page } from "@playwright/test";
const apiUrl = process.env.TEST_API_URL ?? "http://127.0.0.1:8000";
async function token(page: Page): Promise<string> {
  return page.evaluate(
    (url) =>
      JSON.parse(localStorage.getItem(`whatnext.api.session.v1:${url}`) ?? "{}")
        .accessToken,
    apiUrl,
  );
}
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await page
    .getByRole("button", { name: "Настольные игры", exact: true })
    .click();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByText("Чем займёмся?", { exact: true })).toBeVisible();
}

test("реальный FastAPI/PostgreSQL: весь сценарий, перезапуск, повтор и удаление", async ({
  page,
  request,
}) => {
  expect((await request.get(`${apiUrl}/health`)).ok()).toBe(true);
  await onboard(page);
  const sessionToken = await token(page);
  const headers = { Authorization: `Bearer ${sessionToken}` };
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Увеличить число участников" })
    .click();
  await page
    .getByRole("button", { name: "Увеличить число участников" })
    .click();
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
  const title = await page.getByTestId("activity-title").innerText();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Займусь этим", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "План выбран", exact: true }),
  ).toBeDisabled();
  const history = await (
    await request.get(`${apiUrl}/me/history`, { headers })
  ).json();
  expect(history).toHaveLength(2);
  expect(history[0].chosen).toBe(true);
  expect(history[0].filters.participants).toBe(3);
  const favorites = await (
    await request.get(`${apiUrl}/me/favorites`, { headers })
  ).json();
  expect(favorites).toHaveLength(1);
  await page.goto("/favorites");
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  expect(await token(page)).toBe(sessionToken);
  await page.goto("/");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByTestId("participants-count")).toHaveText("3");
  await expect(
    page.getByRole("button", { name: "2 часа", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  const updatedHistory = await (
    await request.get(`${apiUrl}/me/history`, { headers })
  ).json();
  expect(updatedHistory[0].filters.participants).toBeNull();
  expect(
    (await (await request.get(`${apiUrl}/me/preferences`, { headers })).json())
      .lastFilters.participants,
  ).toBe(3);
  await page.goto("/favorites");
  await page
    .getByRole("button", {
      name: `Удалить из избранного: ${title}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Здесь пока пусто", { exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await expect(
    page.getByText("Серверный режим", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Очистить историю", exact: true })
    .click();
  await page.getByRole("button", { name: "Да, очистить", exact: true }).click();
  await expect(
    page.getByText("Сохранено идей: 0. Рекомендаций в истории: 0.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await (await request.get(`${apiUrl}/me/history`, { headers })).json(),
  ).toEqual([]);
  const anotherSession = await (
    await request.post(`${apiUrl}/sessions/anonymous`)
  ).json();
  const anotherPreferences = await (
    await request.get(`${apiUrl}/me/preferences`, {
      headers: { Authorization: `Bearer ${anotherSession.accessToken}` },
    })
  ).json();
  expect(anotherPreferences.interests).toEqual([]);
});

test("реальный API: ошибка записи, повтор и разделение деморежима", async ({
  page,
  request,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Удиви меня", exact: true }).click();
  await expect(page.getByTestId("activity-title")).toBeVisible();
  const sessionToken = await token(page);
  const headers = { Authorization: `Bearer ${sessionToken}` };
  let failed = false;
  await page.route(`${apiUrl}/me/favorites/**`, (route) => {
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
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось сохранить изменение в избранном.",
  );
  await page
    .getByRole("button", { name: "Повторить попытку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Открыть деморежим", exact: true })
    .click();
  await page.getByRole("button", { name: "Переключить", exact: true }).click();
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await page.getByRole("button", { name: "Пропустить", exact: true }).click();
  await page.goto("/profile");
  await expect(
    page.getByText("Демонстрационный режим", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Сохранено идей: 0. Рекомендаций в истории: 0.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Подключить сервер", exact: true })
    .click();
  await page.getByRole("button", { name: "Переключить", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("whatnext.selected-mode.v1")),
    )
    .toBe("api");
  await page.goto("/profile");
  await expect(
    page.getByText("Серверный режим", { exact: true }),
  ).toBeVisible();
  expect(await token(page)).toBe(sessionToken);
  expect(
    await (await request.get(`${apiUrl}/me/favorites`, { headers })).json(),
  ).toHaveLength(1);
});
