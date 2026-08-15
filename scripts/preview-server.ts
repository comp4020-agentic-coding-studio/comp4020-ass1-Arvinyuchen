// A foreground static server for `dist/`, mounted at the deployed base path.
//
// This exists because `astro preview` cannot be used from a test harness. It has
// a `--background` flag, but it *also* daemonises when it has no TTY — which is
// precisely the situation Playwright's `webServer` runs it in, so Playwright
// starts it, the parent process exits immediately, and Playwright reports
// "Process from config.webServer exited early" without any hint that the server
// is in fact running fine in the background on the requested port.
//
// Serving the base path matters as much as the foreground behaviour. The deployed
// site lives under /comp4020-ass1-Arvinyuchen/, and the island chunks are emitted
// with that prefix, so a server rooted at `dist/` would 404 every one of them and
// the specs would be testing a page with no JavaScript.
//
// Usage: node scripts/preview-server.ts [--port 4329]

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const BASE = "/comp4020-ass1-Arvinyuchen";
const ROOT = resolve("dist");

const portFlag = process.argv.indexOf("--port");
const PORT = portFlag > -1 ? Number(process.argv[portFlag + 1]) : 4329;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  let path = decodeURIComponent(url.pathname);

  // Everything is served under the base path, as it will be once deployed.
  if (path === BASE) path = `${BASE}/`;
  if (!path.startsWith(`${BASE}/`)) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end(`Not found. This server mounts dist/ at ${BASE}/`);
    return;
  }

  let relative = path.slice(BASE.length + 1);
  if (relative === "" || relative.endsWith("/")) relative += "index.html";

  // `normalize` collapses any ../ before the prefix check, so a crafted path
  // cannot escape dist/.
  const file = join(ROOT, normalize(relative));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    // `build.format: "file"` means every page is <name>.html, so try that too.
    const asHtml = `${file}.html`;
    if (existsSync(asHtml) && statSync(asHtml).isFile()) {
      send(asHtml);
      return;
    }
    response.writeHead(404, { "content-type": "text/plain" });
    response.end(`Not found: ${relative}`);
    return;
  }

  send(file);

  function send(target: string): void {
    response.writeHead(200, {
      "content-type": MIME[extname(target)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(target).pipe(response);
  }
});

server.listen(PORT, () => {
  // Playwright waits for the URL to answer, and this process stays in the
  // foreground until it is killed — which is the whole point.
  console.log(`preview: http://localhost:${PORT}${BASE}/`);
});
