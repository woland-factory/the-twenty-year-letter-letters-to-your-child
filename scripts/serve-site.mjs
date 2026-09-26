// A tiny static file server for the distribution site. Node built-ins only, so
// the production image needs no dependencies. Serves site/dist with sensible
// security headers and the correct content type for .html.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "site", "dist");

function argPort() {
  const i = process.argv.indexOf("-p");
  if (i !== -1 && process.argv[i + 1]) return Number(process.argv[i + 1]);
  return undefined;
}

const PORT = argPort() ?? Number(process.env.E2E_PORT ?? process.env.PORT ?? 3100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

// A restrictive site CSP. It permits self-hosted analytics over https while the
// artifact's own stricter meta CSP still forbids all network from inside the file.
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https:; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  "connect-src 'self' https:; base-uri 'self'; form-action 'self'";

function securityHeaders(type) {
  return {
    "Content-Type": type,
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    // Contain the path to the served root.
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, securityHeaders("text/html; charset=utf-8")).end(
        "<!DOCTYPE html><h1>Page not found</h1><p>Head back to the home page.</p>",
      );
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, securityHeaders(TYPES[extname(filePath)] ?? "application/octet-stream"));
    res.end(body);
  } catch {
    res.writeHead(500, securityHeaders("text/plain; charset=utf-8")).end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serving site/dist on http://0.0.0.0:${PORT}`);
});
