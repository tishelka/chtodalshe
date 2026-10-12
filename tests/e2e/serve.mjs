// Только статическая выдача Expo export для проверок UI. Серверного API здесь нет.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const root = resolve(process.env.STATIC_DIR ?? "dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".css": "text/css",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
    if (request.method === "POST" && pathname === "/__test_shutdown") {
      response.writeHead(200).end("ok");
      server.close(() => process.exit(0));
      return;
    }
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const file = extname(target) ? target : resolve(root, "index.html");
    const body = await readFile(file);
    response
      .writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(process.env.PORT ?? 4173), "127.0.0.1");
