import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { assets, renderPage, robots, sitemap } from "../site.mjs";

const origin = new URL(process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:8787")).origin;
const configured = JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || "{}");
const telemetry = process.env.VERCEL || process.env.VERCEL_PROJECT_PRODUCTION_URL ? {
  analytics: { scriptSrc: "/_vercel/insights/script.js", ...configured.analytics },
  speedInsights: { scriptSrc: "/_vercel/speed-insights/script.js", ...configured.speedInsights },
} : {};
const output = new URL("../dist/", import.meta.url);
await mkdir(new URL("x/", output), { recursive: true });

await Promise.all([
  ...Object.entries(assets).map(([path, [file]]) =>
    copyFile(new URL(`../${file}`, import.meta.url), new URL(path.slice(1), output))),
  writeFile(new URL("index.html", output), renderPage({ origin, detectLocale: true, ...telemetry })),
  ...["en", "es"].map(locale => writeFile(new URL(`${locale}.html`, output), renderPage({ locale, origin, ...telemetry }))),
  writeFile(new URL("x.html", output), renderPage({ origin, detectLocale: true, ...telemetry })),
  writeFile(new URL("x/es.html", output), renderPage({ locale: "es", origin, ...telemetry })),
  writeFile(new URL("robots.txt", output), robots(origin)),
  writeFile(new URL("sitemap.xml", output), sitemap(origin)),
]);
