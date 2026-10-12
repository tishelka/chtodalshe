import { expect, test } from "@playwright/test";

test("вкладки, открытие карточки, удаление избранного и системный возврат в форму", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await page.getByRole("button", { name: "Пропустить", exact: true }).click();
  const tabLabel = await page.getByRole("tab", { name: "Главная", exact: true }).getByText("Главная", { exact: true }).boundingBox();
  expect(tabLabel).not.toBeNull();
  expect(tabLabel!.y + tabLabel!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page
    .getByRole("button", { name: "Подобрать занятие", exact: true })
    .click();
  await page.getByRole("button", { name: "2 часа", exact: true }).click();
  await page.getByRole("button", { name: "Дома", exact: true }).click();
  await page
    .getByRole("button", { name: "Предложить занятие", exact: true })
    .click();
  const title = await page.getByTestId("activity-title").innerText();
  await page.getByRole("button", { name: "В избранное", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранном", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Дома", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await page.getByRole("tab", { name: "Избранное", exact: true }).click();
  await page
    .getByRole("button", { name: `Открыть: ${title}`, exact: true })
    .click();
  await expect(page.getByTestId("activity-title")).toHaveText(title);
  await page.getByRole("button", { name: "В избранном", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "В избранное", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(
    page.getByText("Здесь пока пусто", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "История", exact: true }).click();
  await page
    .getByRole("button", { name: `Открыть: ${title}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Займусь этим", exact: true }).click();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByText("План выбран", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Профиль", exact: true }).click();
  await expect(
    page.getByText("Демонстрационный режим", { exact: true }),
  ).toBeVisible();
});
