import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve("backend");
const executable = resolve(
  root,
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
);
const commands = {
  bootstrap: ["-m", "app.bootstrap"],
  start: [
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
  ],
  test: ["-m", "pytest", "-q"],
  lint: ["-m", "ruff", "check", "."],
};
const name = process.argv[2];
if (!existsSync(executable))
  throw new Error(
    "Создайте backend/.venv и установите backend/requirements-dev.txt; инструкция в README.md.",
  );
if (!(name in commands)) throw new Error("Неизвестная команда backend");
const result = spawnSync(
  executable,
  [...commands[name], ...process.argv.slice(3)],
  { cwd: root, stdio: "inherit" },
);
process.exit(result.status ?? 1);
