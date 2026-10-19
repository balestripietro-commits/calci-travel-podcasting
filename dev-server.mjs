import { createReadStream, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const root = realpathSync(resolve(process.env.E2E_STATIC_ROOT || "."));
const port = Number(process.argv[2] || process.env.PORT || 8000);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendError(response, status, message, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  response.end(message);
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    end = Math.min(end, size - 1);
  }

  return start < size && start <= end ? { start, end } : null;
}

createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendError(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    sendError(response, 400, "Bad request");
    return;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith(".") || segment === "node_modules" || segment === "work")) {
    sendError(response, 403, "Forbidden");
    return;
  }

  let filePath;
  try {
    const requested = resolve(root, `.${pathname}`);
    const relativePath = relative(root, requested);
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      sendError(response, 403, "Forbidden");
      return;
    }
    const candidate = statSync(requested).isDirectory() ? join(requested, "index.html") : requested;
    filePath = realpathSync(candidate);
    const realRelative = relative(root, filePath);
    if (realRelative === ".." || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) {
      sendError(response, 403, "Forbidden");
      return;
    }
  } catch {
    sendError(response, 404, "Not found");
    return;
  }

  let size;
  try {
    size = statSync(filePath).size;
  } catch {
    sendError(response, 404, "Not found");
    return;
  }
  const rangeHeader = request.headers.range;
  const range = rangeHeader ? parseRange(rangeHeader, size) : null;
  if (rangeHeader && !range) {
    sendError(response, 416, "Range not satisfiable", {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes */${size}`,
    });
    return;
  }

  const headers = {
    "Accept-Ranges": "bytes",
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": range ? range.end - range.start + 1 : size,
  };
  if (range) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath, range || undefined).on("error", () => response.destroy()).pipe(response);
}).listen(port, host, () => {
  process.stdout.write(`Travel Podcasting: http://${host}:${port}\n`);
});
