import { expect, test } from "@playwright/test";

test("при недоступном API нет скрытого переключения; деморежим включается явно", async ({
  page,
}) => {
  await page.route(
    `${process.env.TEST_API_URL ?? "http://127.0.0.1:8000"}/**`,
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "unavailable" }),
      }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Не удалось загрузить данные", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Начать", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Повторить попытку", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Открыть деморежим", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть деморежим", exact: true })
    .click();
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await page.getByRole("button", { name: "Пропустить", exact: true }).click();
  await page.getByRole("tab", { name: "Профиль", exact: true }).click();
  await expect(
    page.getByText("Демонстрационный режим", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Демонстрационный режим", { exact: true }),
  ).toBeVisible();
});
