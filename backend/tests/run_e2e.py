"""Сборка и браузерные проверки с отдельными FastAPI и PostgreSQL."""

import os
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

from app.config import BACKEND_ROOT
from tests.database import temporary_database


def main():
    root = BACKEND_ROOT.parent
    node = sys.argv[1] if len(sys.argv) > 1 else "node"
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    api_url = f"http://127.0.0.1:{port}"
    log_path = root / ".tools" / "e2e-api.log"
    log_path.parent.mkdir(exist_ok=True)
    with temporary_database() as url, log_path.open("w", encoding="utf-8") as log:
        env = {
            **os.environ,
            "DATABASE_URL": url,
            "TEST_API_URL": api_url,
            "EXPO_PUBLIC_API_URL": api_url,
            "WHATNEXT_E2E_ISOLATED": "1",
            "STATIC_DIR": ".tools/ui-test-dist",
        }
        server = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ],
            cwd=BACKEND_ROOT,
            env=env,
            stdout=log,
            stderr=log,
        )
        try:
            deadline = time.monotonic() + 15
            while True:
                if server.poll() is not None:
                    raise RuntimeError(f"Тестовый API завершился; лог: {log_path}")
                try:
                    with urlopen(f"{api_url}/health", timeout=1) as response:
                        if response.status == 200:
                            break
                except (URLError, TimeoutError):
                    if time.monotonic() >= deadline:
                        raise RuntimeError(f"Тестовый API не запустился; лог: {log_path}") from None
                    time.sleep(0.1)
            subprocess.run(
                [
                    node,
                    "node_modules/expo/bin/cli",
                    "export",
                    "--platform",
                    "web",
                    "--clear",
                    "--output-dir",
                    ".tools/ui-test-dist",
                ],
                cwd=root,
                env=env,
                check=True,
            )
            subprocess.run(
                [node, "node_modules/playwright/cli.js", "test"], cwd=root, env=env, check=True
            )
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


if __name__ == "__main__":
    main()
