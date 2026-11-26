import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer as httpServer } from "node:http";
import { createServer as httpsServer } from "node:https";
import { parseArgs } from "node:util";
import { assets, renderPage, robots, sitemap } from "./site.mjs";
import { generateSticker } from "./x-stickers.mjs";

const { values } = parseArgs({ options: {
  host: { type: "string", default: "127.0.0.1" },
  port: { type: "string" },
  cert: { type: "string" },
  key: { type: "string" },
} });
if (Boolean(values.cert) !== Boolean(values.key)) {
  throw new Error("Provide both --cert and --key to use HTTPS.");
}
const tls = Boolean(values.cert);
const port = Number(values.port ?? (tls ? 8443 : 8787));
const origin = process.env.SITE_URL ?? `${tls ? "https" : "http"}://${values.host}:${port}`;

function send(request, response, type, body) {
  response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(request.method === "HEAD" ? undefined : body);
}

async function serve(request, response) {
  const path = new URL(request.url, origin).pathname;
  if (path === "/api/sticker") return generateSticker(request, response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  if (["/", "/en", "/es", "/x", "/x/es"].includes(path)) {
    return send(request, response, "text/html; charset=utf-8",
      renderPage({ locale: path.endsWith("/es") ? "es" : "en", detectLocale: path === "/" || path === "/x", origin }));
  }
  if (path === "/sitemap.xml") return send(request, response, "application/xml; charset=utf-8", sitemap(origin));
  if (path === "/robots.txt") return send(request, response, "text/plain; charset=utf-8", robots(origin));

  const asset = Object.hasOwn(assets, path) && assets[path];
  if (!asset) {
    response.writeHead(path === "/favicon.ico" ? 204 : 404).end();
    return;
  }
  const [relativePath, type] = asset;
  const file = new URL(`./${relativePath}`, import.meta.url);
  const { size } = await stat(file);
  response.writeHead(200, {
    "Content-Type": type, "Content-Length": size, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") return response.end();
  const stream = createReadStream(file);
  stream.on("error", () => response.destroy());
  response.on("close", () => stream.destroy());
  stream.pipe(response);
}

const handler = (request, response) => {
  serve(request, response).catch((error) => {
    if (response.headersSent) response.destroy();
    else response.writeHead(error.code === "ENOENT" ? 404 : 500).end();
  });
};

const server = tls
  ? httpsServer({ cert: readFileSync(values.cert), key: readFileSync(values.key) }, handler)
  : httpServer(handler);
server.listen(port, values.host, () => console.log(`Sticker from X · ${origin}/`));
