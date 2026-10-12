# ЧтоДальше

Учебное мобильное приложение: **React Native / Expo → HTTP → FastAPI → PostgreSQL**. Предлагает занятие под число участников, время, бюджет, место, настроение и интересы. Каталог содержит 70 занятий в 10 категориях.

Сохранены онбординг, четыре вкладки, подбор, «Другое» без повторов, «Удиви меня», повтор последних условий, избранное, история, отметка выбранного плана и редактирование интересов.

Все постоянные данные хранятся в PostgreSQL. Регистрации, токенов, AsyncStorage и отдельного деморежима нет. Для простоты **все устройства используют один общий профиль**: изменение интересов или очистка истории затрагивает всех. Уже открытый экран обновляется при изменении на этом устройстве; изменения другого устройства видны после повторного открытия приложения. Для работы нужен запущенный API.

## Запуск через Docker

Нужны Node.js >= 22.13 и запущенный Docker Desktop с Linux-контейнерами.

```sh
npm ci
docker compose up --build -d
```

Compose запускает PostgreSQL 18 и FastAPI, применяет миграции и загружает каталог. Данные сохраняются в именованном volume. Повторный запуск не очищает профиль.

Создайте `.env` в корне проекта:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000
```

```sh
npm run start -- --clear
```

- API: `http://localhost:8000`
- Swagger с примерами запросов: `http://localhost:8000/docs`
- Проверка API и базы: `http://localhost:8000/health`
- Остановка: `docker compose down` — данные сохраняются.

## Backend без Docker

Нужны Python >= 3.12 и PostgreSQL >= 16. Создайте пользователя и базу `whatnext`, затем выполните из корня проекта:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Copy-Item backend/.env.example backend/.env
```

Укажите подключение в `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://whatnext:whatnext@localhost:5432/whatnext
CORS_ORIGINS=["http://localhost:8081","http://127.0.0.1:8081","http://localhost:4173","http://127.0.0.1:4173"]
```

```sh
npm run backend:bootstrap
npm run backend:start
```

Первая команда создаёт таблицы и общий профиль, загружает каталог. Вторая запускает сервер на `0.0.0.0:8000`. На Linux/macOS Python находится в `backend/.venv/bin/python`; npm-скрипты выбирают путь автоматически.

Те же операции из папки `backend/` с активированным виртуальным окружением:

```sh
python -m app.bootstrap
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Адрес API на устройстве

| Где открыто приложение     | EXPO_PUBLIC_API_URL             |
| -------------------------- | ------------------------------- |
| Браузер на этом компьютере | `http://localhost:8000`         |
| Android Emulator           | `http://10.0.2.2:8000`          |
| iOS Simulator на Mac       | `http://localhost:8000`         |
| Телефон в той же сети      | `http://LAN_IP_компьютера:8000` |

При отсутствии настройки используется `http://localhost:8000`. После изменения `.env` перезапустите Expo с `--clear`. Для браузера на другом адресе добавьте его origin в `CORS_ORIGINS`. Реквизиты PostgreSQL задаются только на сервере.

```sh
npm run android
npm run web
npm run ios
```

Для эмулятора Android нужны Android Studio и запущенное виртуальное устройство. Симулятор iOS требует macOS/Xcode. Телефон с Expo Go должен иметь доступ к Metro и API.

## Что изучать первокурсникам

В backend четыре небольшие группы обработчиков: каталог, настройки, избранное и история. Вместе с `/health` это **12 HTTP-операций**. Авторизация не требуется: запрос можно проверить сразу в Swagger.

Начните с `backend/app/routers/activities.py`: обработчик получает подключение к базе, делает `SELECT` и возвращает JSON. Затем изучите `favorites.py`: добавление, получение и удаление. Настройки и история используют тот же подход.

Общий ID профиля задан в `backend/app/profile.py`. Таблицы описаны в `models.py`, формат запросов — в `schemas.py`. SQLAlchemy выполняет SQL-запросы к PostgreSQL; SQLite и дополнительного хранилища нет. Контракт с примерами: [backend/API.md](backend/API.md).

## Структура

```text
app/                         маршруты и четыре вкладки
src/
  features/                  экраны, React-состояние, движок рекомендаций
  data/apiRepository.ts      HTTP-запросы к FastAPI
  data/catalog.ts            исходный каталог для наполнения базы
  lib/backend.ts             адрес API
  components/                общий интерфейс
backend/
  app/routers/               каталог, настройки, избранное, история
  app/models.py              таблицы SQLAlchemy
  app/schemas.py             формат JSON и проверка данных
  app/profile.py             ID общего профиля
  app/database.py            подключение к PostgreSQL
  app/main.py                FastAPI, CORS, ошибки, health
  app/bootstrap.py           миграции и наполнение базы
  migrations/                версии схемы Alembic
  data/activities.json       каталог для PostgreSQL
  tests/                     проверки с отдельной PostgreSQL-базой
compose.yaml                 запуск API и базы
tests/                       тесты TypeScript и браузерные сценарии
```

Подбор остаётся в чистом TypeScript-модуле: участники, время, бюджет на человека и место — обязательные ограничения; интересы и настроение влияют на рейтинг. «Удиви меня» не использует прошлые ограничения.

## Изменение каталога

Редактируйте `src/data/catalog.ts`, сохраняя коды существующих занятий:

```sh
npm run seed:generate
npm run seed:check
npm run backend:bootstrap
```

Генератор обновляет `backend/data/activities.json`, Python загружает его в PostgreSQL. Чтобы архивировать занятие, установите `isActive: false`: оно останется доступным в истории, но больше не будет рекомендоваться.

## Переход со старой версии

Обновите зависимости через `npm ci`, примените `npm run backend:bootstrap`, перезапустите API и Expo. Миграция создаёт общий профиль и удаляет таблицу прежних токенов. Старые профили, их настройки, избранное и история остаются в базе, но новый API использует только общий профиль. Автоматического объединения прежних профилей и импорта данных с устройств нет.

## Проверки

```sh
npm run check
npm run backend:lint
npm run backend:test
npx playwright install chromium
npm run test:e2e
npm run export:native
npx expo-doctor
```

Серверные и браузерные проверки создают отдельную базу со случайным именем и удаляют её после завершения. Рабочую базу они не очищают. Нужны PostgreSQL, зависимости из `requirements-dev.txt` и права создания базы. Для другого тестового сервера можно задать `TEST_DATABASE_URL`. Браузерные проверки сами запускают временный API.

Подробнее: [TESTING.md](TESTING.md), [ARCHITECTURE.md](ARCHITECTURE.md).

## Текущее Windows-окружение

В рабочей папке установлен Node.js 22 и доступен помощник:

```powershell
.\scripts\npm-local.ps1 run backend:bootstrap
.\scripts\npm-local.ps1 run backend:start
.\scripts\npm-local.ps1 run start -- --clear
```

Локальный PostgreSQL для этой рабочей папки использует `.tools/postgres/data` и порт **55432**; подключение записано в `backend/.env`. Системные базы не менялись. Если кластер остановлен, запустите его в отдельном терминале:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "$PWD\.tools\postgres\data" -p 55432 -h 127.0.0.1
```

Для установленного здесь тестового Chromium:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.tools\playwright"
.\scripts\npm-local.ps1 run test:e2e
```
