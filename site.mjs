const brand = "Sticker from X";
const locales = ["en", "es"];

export const assets = {
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/language.js": ["public/language.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"],
  "/icon.svg": ["public/icon.svg", "image/svg+xml"],
  "/example.gif": ["public/example.gif", "image/gif"],
  "/social.png": ["public/social.png", "image/png"],
  "/bricolage.woff2": ["node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2", "font/woff2"],
  "/dm-sans.woff2": ["node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2", "font/woff2"],
};

const copy = {
  en: {
    title: "X to WhatsApp Sticker Maker · Sticker from X",
    description: "Make WhatsApp stickers from public X (Twitter) photos and GIFs. Paste a link, then copy your sticker right from your browser.",
    heading: "From X to sticker.",
    introduction: "Turn a photo or GIF from X into a WhatsApp sticker right in your browser.",
    label: "Public post link",
    submit: "Make sticker",
    busy: "Making sticker…",
    example: "Example GIF",
    exampleAlt: "Animated sticker of an orange cat waving",
    exampleHelp: "Try copying this GIF and pasting it into a WhatsApp chat.",
    result: "Your sticker",
    resultAlt: "Sticker made from your X link",
    copyHelp: "Press and hold the image, choose Copy, then paste it into a WhatsApp chat.",
    ready: "Your sticker is ready.",
    download: "Download",
    share: "Share on X",
    credit: "Created by",
    shareText: "Turn an X GIF or photo into a WhatsApp sticker right in your browser.",
    errors: {
      invalid_link: "Enter a full link to a public X or Twitter post.",
      unavailable: "That post or image is unavailable. Try another public link.",
      upstream: "X media couldn’t be loaded right now. Try again in a moment.",
      too_large: "This file is too large. Try a smaller photo or GIF.",
      video: "This post has a video. Try a post with a photo or a GIF.",
      no_media: "We couldn’t find a photo or GIF in that post.",
      busy: "The sticker maker is busy. Try again in a moment.",
      conversion: "We couldn’t make your sticker. Try again or use another link.",
    },
  },
  es: {
    title: "Generador de stickers de X para WhatsApp · Sticker from X",
    description: "Creá stickers para WhatsApp con fotos y GIF de X (Twitter). Pegá el enlace y copiá tu sticker desde el navegador.",
    heading: "De X a sticker.",
    introduction: "Convertí una foto o un GIF de X en un sticker para WhatsApp desde el navegador.",
    label: "Enlace de la publicación pública",
    submit: "Generar sticker",
    busy: "Generando sticker…",
    example: "GIF de ejemplo",
    exampleAlt: "Sticker animado de un gato naranja saludando",
    exampleHelp: "Probá copiar este GIF y pegarlo en un chat de WhatsApp.",
    result: "Tu sticker",
    resultAlt: "Sticker generado desde tu enlace de X",
    copyHelp: "Mantené pulsada la imagen, elegí Copiar y pegala en un chat de WhatsApp.",
    ready: "Tu sticker está listo.",
    download: "Descargar",
    share: "Compartir en X",
    credit: "Creado por",
    shareText: "Convertí un GIF o una foto de X en un sticker para WhatsApp desde el navegador.",
    errors: {
      invalid_link: "Ingresá el enlace completo a una publicación pública de X o Twitter.",
      unavailable: "La publicación o su imagen no está disponible. Probá con otro enlace público.",
      upstream: "No se pudo cargar el contenido de X. Probá en unos segundos.",
      too_large: "Este archivo pesa demasiado. Probá una foto o GIF más chico.",
      video: "La publicación contiene un video. Probá con una foto o un GIF.",
      no_media: "No encontré una foto ni un GIF en esa publicación.",
      busy: "El generador está ocupado. Probá en unos segundos.",
      conversion: "No se pudo generar el sticker. Probá de nuevo o usá otro enlace.",
    },
  },
};

const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const html = (value) => String(value).replace(/[&<>"']/g, character => escapes[character]);
const absolute = (path, origin) => new URL(path, origin).href;
const localePath = (locale) => `/${locale}`;

export function renderPage({ locale = "en", detectLocale = false, origin, analytics, speedInsights }) {
  const t = copy[locale];
  const canonical = absolute(localePath(locale), origin);
  const socialImage = absolute("/social.png", origin);
  const campaign = new URL("/x", origin);
  campaign.search = new URLSearchParams({ utm_source: "x", utm_medium: "social", utm_campaign: "sticker_launch" });
  const share = new URL("https://twitter.com/intent/tweet");
  share.search = new URLSearchParams({ text: t.shareText, url: campaign.href });
  const client = JSON.stringify({ busy: t.busy, ready: t.ready, errors: t.errors }).replace(/</g, "\\u003c");
  const localeLinks = locales.map(code =>
    `<link rel="alternate" hreflang="${code}" href="${html(absolute(localePath(code), origin))}">`).join("\n  ");
  const analyticsPath = (path) => new URL(path, origin).pathname;
  const analyticsScript = analytics
    ? `<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="${html(analyticsPath(analytics.scriptSrc))}"${analytics.viewEndpoint ? ` data-view-endpoint="${html(analyticsPath(analytics.viewEndpoint))}"` : ""}></script>`
    : "";
  const speedInsightsScript = speedInsights
    ? `<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>
  <script defer src="${html(analyticsPath(speedInsights.scriptSrc))}"${speedInsights.endpoint ? ` data-endpoint="${html(analyticsPath(speedInsights.endpoint))}"` : ""}></script>`
    : "";
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${html(t.title)}</title>
  <meta name="description" content="${html(t.description)}">
  <meta name="theme-color" content="#f7f6ed">
  <link rel="canonical" href="${html(canonical)}">
  ${localeLinks}
  <link rel="alternate" hreflang="x-default" href="${html(absolute("/", origin))}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${brand}">
  <meta property="og:locale" content="${locale === "es" ? "es_UY" : "en_US"}">
  <meta property="og:title" content="${html(t.title)}">
  <meta property="og:description" content="${html(t.description)}">
  <meta property="og:url" content="${html(canonical)}">
  <meta property="og:image" content="${html(socialImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${html(t.exampleAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${html(t.title)}">
  <meta name="twitter:description" content="${html(t.description)}">
  <meta name="twitter:image" content="${html(socialImage)}">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  ${detectLocale ? '<script src="/language.js"></script>' : ""}
  <link rel="stylesheet" href="/styles.css">
  <script id="sticker-copy" type="application/json">${client}</script>
  <script defer src="/app.js"></script>
  ${analyticsScript}
  ${speedInsightsScript}
</head>
<body>
  <div class="shell">
    <header class="site-header">
      <a class="brand" href="${localePath(locale)}"><img src="/icon.svg" width="35" height="35" alt="">${brand}</a>
      <a class="share" href="${html(share.href)}" target="_blank" rel="noopener noreferrer">${html(t.share)} <span aria-hidden="true">↗</span></a>
    </header>
    <main class="workspace">
      <section class="intro" aria-labelledby="title">
        <h1 id="title">${html(t.heading.slice(0, -1))}<span aria-hidden="true">.</span></h1>
        <p class="intro-copy">${html(t.introduction)}</p>
        <form id="sticker-form" action="/api/sticker" method="get">
          <label for="post-url">${html(t.label)}</label>
          <input id="post-url" name="url" type="url" inputmode="url" spellcheck="false" autocapitalize="none" autocomplete="off" maxlength="2000" placeholder="https://x.com/…" required>
          <button class="make-button" type="submit">${html(t.submit)}<span aria-hidden="true">↗</span></button>
          <p id="sticker-feedback" class="feedback" role="status"></p>
        </form>
      </section>
      <section class="preview" aria-labelledby="sticker-label">
        <div class="preview-image">
          <img id="sticker-preview" src="/example.gif" width="512" height="512" alt="${html(t.exampleAlt)}" data-result-alt="${html(t.resultAlt)}">
        </div>
        <div class="preview-caption">
          <div>
            <h2 id="sticker-label" data-result="${html(t.result)}">${html(t.example)}</h2>
            <p id="sticker-help" data-result="${html(t.copyHelp)}">${html(t.exampleHelp)}</p>
          </div>
          <a id="sticker-download" class="download" download hidden>${html(t.download)}</a>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p class="credit">${html(t.credit)} <a href="https://www.linkedin.com/in/adriandelosreyess/" target="_blank" rel="noopener noreferrer">adriandelosreyes</a></p>
      <nav class="languages" aria-label="${locale === "es" ? "Idioma" : "Language"}">
        ${locales.map(code => `<a href="/${code}" hreflang="${code}" lang="${code}"${code === locale ? ' aria-current="page"' : ""}>${code === "en" ? "English" : "Español"}</a>`).join("\n        ")}
      </nav>
    </footer>
  </div>
</body>
</html>
`;
}

export function sitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${locales.map(locale => `<url>
    <loc>${html(absolute(localePath(locale), origin))}</loc>
    ${locales.map(code => `<xhtml:link rel="alternate" hreflang="${code}" href="${html(absolute(localePath(code), origin))}" />`).join("\n    ")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${html(absolute("/", origin))}" />
  </url>`).join("\n  ")}
</urlset>
`;
}

export function robots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${absolute("/sitemap.xml", origin)}\n`;
}
