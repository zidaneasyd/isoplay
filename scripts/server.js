import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
});

export function createStaticServer({ root = process.cwd() } = {}) {
  const absoluteRoot = resolve(root);
  return http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method Not Allowed");
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400);
      response.end("Bad Request");
      return;
    }

    const relativePath = pathname.replace(/^\/+/, "") || "index.html";
    let filePath = resolve(absoluteRoot, relativePath);
    if (filePath !== absoluteRoot && !filePath.startsWith(`${absoluteRoot}${sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    if (!existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not Found");
      return;
    }

    try {
      if (statSync(filePath).isDirectory()) filePath = resolve(filePath, "index.html");
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        response.writeHead(404);
        response.end("Not Found");
        return;
      }
    } catch {
      response.writeHead(404);
      response.end("Not Found");
      return;
    }

    const headers = {
      "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    response.writeHead(200, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (!response.headersSent) response.writeHead(500);
      response.end("Internal Server Error");
    });
    stream.pipe(response);
  });
}

const isDirectExecution = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.PORT || "4173", 10);
  const server = createStaticServer();
  server.listen(port, host, () => {
    console.log(`Iso Playground tersedia di http://${host}:${port}`);
  });
}
