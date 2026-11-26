import { execFile } from "node:child_process";
import { mkdtemp, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import staticFfmpeg from "ffmpeg-static";

const run = promisify(execFile);
const postHosts = new Set(["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]);
const lifetime = 30 * 60_000;
const results = new Map();
let conversions = 0;
let ffmpegPath;

class StickerError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function mediaLink(url) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  if (url.hostname === "pbs.twimg.com" && /^\/media\/[\w.-]+(?::\w+)?$/.test(url.pathname)) {
    return { type: "photo", url };
  }
  if (url.hostname === "video.twimg.com" && /^\/tweet_video\/[\w-]+\.mp4$/.test(url.pathname)) {
    return { type: "gif", url };
  }
  return null;
}

function parseLink(input) {
  const raw = input.trim();
  const url = URL.canParse(raw) ? new URL(raw) : null;
  if (!url || !["https:", "http:"].includes(url.protocol) || url.port || url.username || url.password) {
    throw new StickerError(400, "invalid_link");
  }
  const direct = mediaLink(url);
  if (direct) return direct;
  const match = /^\/(?:[\w]+|i\/web)\/status\/([0-9]{1,20})(?:\/(?:photo|video)\/([1-4]))?\/?$/.exec(url.pathname);
  if (!postHosts.has(url.hostname) || !match) throw new StickerError(400, "invalid_link");
  return { postId: match[1], position: match[2] ? Number(match[2]) - 1 : null };
}

async function fetchExternal(url, limit, fetcher) {
  try {
    const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(9_000) });
    if ([401, 403, 404].includes(response.status)) {
      await response.body?.cancel();
      throw new StickerError(404, "unavailable");
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new StickerError(502, "upstream");
    }
    if (Number(response.headers.get("content-length")) > limit) {
      await response.body.cancel();
      throw new StickerError(413, "too_large");
    }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw new StickerError(413, "too_large");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
  } catch (error) {
    if (error instanceof StickerError) throw error;
    throw new StickerError(502, "upstream");
  }
}

async function resolveMedia(source, fetcher) {
  if (source.url) return source;
  const data = await fetchExternal(`https://api.fxtwitter.com/2/status/${source.postId}`, 1_000_000, fetcher);
  let post;
  try {
    post = JSON.parse(data).status;
  } catch {
    throw new StickerError(502, "upstream");
  }
  if (post?.type !== "status") throw new StickerError(404, "unavailable");
  const attachments = Array.isArray(post.media?.all) ? post.media.all : [];
  const selected = source.position === null
    ? attachments.find(item => item?.type === "photo" || item?.type === "gif")
    : attachments[source.position];
  if (selected?.type === "video" || (!selected && attachments.some(item => item?.type === "video"))) {
    throw new StickerError(422, "video");
  }
  if (!selected) throw new StickerError(422, "no_media");
  const url = typeof selected.url === "string" && URL.canParse(selected.url) ? new URL(selected.url) : null;
  const media = url && mediaLink(url);
  if (!media || media.type !== selected.type) throw new StickerError(422, "no_media");
  return media;
}

function inputFormat(bytes, type) {
  if (type === "gif" && bytes.toString("ascii", 4, 8) === "ftyp") return "mov";
  if (type === "photo") {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg_pipe";
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png_pipe";
    if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp_pipe";
  }
  throw new StickerError(422, "no_media");
}

async function ffmpeg() {
  if (ffmpegPath) return ffmpegPath;
  if (process.env.FFMPEG_PATH) return ffmpegPath = process.env.FFMPEG_PATH;
  if (process.platform === "win32") {
    const directory = new URL("./.tools/imageio_ffmpeg/binaries/", import.meta.url);
    const bundled = (await readdir(directory).catch(() => [])).find(name => name.startsWith("ffmpeg-") && name.endsWith(".exe"));
    if (bundled) return ffmpegPath = fileURLToPath(new URL(bundled, directory));
  }
  return ffmpegPath = staticFfmpeg || "ffmpeg";
}

const scale = (limit) => `scale=w='min(iw,${limit})':h='min(ih,${limit})':force_original_aspect_ratio=decrease,setsar=1,format=rgba`;
const palette = (filter, colors) => `${filter},split[pixels][colors];[colors]palettegen=max_colors=${colors}:reserve_transparent=1[palette];[pixels][palette]paletteuse=dither=none`;

function gifProfile(size, duration, fps) {
  const animation = `trim=duration=${duration},fps=${fps},scale=${size}:${size}:force_original_aspect_ratio=decrease,setsar=1,format=rgba,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=black@0`;
  return ["-filter_complex", palette(animation, 256), "-loop", "0", "-f", "gif"];
}

const encodingProfiles = {
  gif: { maxBytes: 150_000, options: [
    gifProfile(512, 4, 12),
    gifProfile(320, 4, 10),
    gifProfile(256, 2, 8),
    gifProfile(224, 2, 6),
    gifProfile(192, 2, 5),
    gifProfile(176, 2, 5),
    gifProfile(144, 2, 5),
    gifProfile(112, 1.5, 5),
  ] },
  png: { maxBytes: 100_000, options: [
    ["-vf", scale(512)],
    ["-filter_complex", palette(scale(512), 96)],
    ["-filter_complex", palette(scale(384), 64)],
    ["-filter_complex", palette(scale(288), 48)],
  ].map(filter => [...filter, "-frames:v", "1", "-c:v", "png", "-f", "image2pipe"]) },
};

async function encode(bytes, type, format) {
  const inputType = inputFormat(bytes, type);
  const directory = await mkdtemp(join(tmpdir(), "sticker-x-"));
  const input = join(directory, "source");
  const profiles = encodingProfiles[format];
  const signal = AbortSignal.timeout(20_000);
  try {
    await writeFile(input, bytes);
    const binary = await ffmpeg();
    for (const options of profiles.options) {
      try {
        const { stdout } = await run(binary, [
          "-hide_banner", "-loglevel", "error", "-nostdin", "-filter_threads", "1", "-filter_complex_threads", "1",
          "-threads", "1", "-max_pixels", "16777216", "-protocol_whitelist", "file,pipe",
          "-f", inputType, "-i", input, "-an", "-sn", "-dn", ...options, "-threads", "1", "pipe:1",
        ], { encoding: "buffer", timeout: 7_000, signal, maxBuffer: 5_000_000, windowsHide: true });
        if (stdout.length && stdout.length <= profiles.maxBytes) return stdout;
      } catch (error) {
        if (error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") throw error;
      }
    }
    throw new StickerError(422, "too_large");
  } catch (error) {
    if (error instanceof StickerError) throw error;
    if (error.code === "ENOENT" || error.code === "EACCES") {
      console.error("FFmpeg could not start:", error.code);
      throw new StickerError(503, "busy");
    }
    throw new StickerError(422, "conversion");
  } finally {
    await unlink(input).catch(() => {});
    await rmdir(directory).catch(() => {});
  }
}

async function convert(source, fetcher) {
  const key = source.url?.href ?? `${source.postId}/${source.position ?? ""}`;
  const now = Date.now();
  const cached = results.get(key);
  if (cached && cached.expires > now) return cached.sticker;
  if (conversions >= 2) throw new StickerError(429, "busy");

  for (const [cacheKey, entry] of results) {
    if (entry.expires <= now) results.delete(cacheKey);
  }
  if (results.size >= 64) results.delete(results.keys().next().value);
  conversions++;
  const started = performance.now();
  const sticker = (async () => {
    const { url, type } = await resolveMedia(source, fetcher);
    const bytes = await fetchExternal(url, 12_000_000, fetcher);
    const format = type === "photo" ? "png" : "gif";
    return { format, image: await encode(bytes, type, format) };
  })();
  results.set(key, { sticker, expires: now + lifetime });
  let status = 200;
  let format;
  try {
    const result = await sticker;
    format = result.format;
    return result;
  } catch (error) {
    if (results.get(key)?.sticker === sticker) results.delete(key);
    status = error instanceof StickerError ? error.status : 500;
    throw error;
  } finally {
    conversions--;
    if (process.env.VERCEL) {
      console.info("sticker_conversion", JSON.stringify({
        status, format, durationMs: Math.round(performance.now() - started),
      }));
    }
  }
}

export async function generateSticker(request, response, fetcher = fetch) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const url = new URL(request.url, "http://localhost").searchParams.get("url");
    if (!url || url.length > 2000) throw new StickerError(400, "invalid_link");
    const { format, image } = await convert(parseLink(url), fetcher);
    response.writeHead(200, {
      "Content-Type": `image/${format}`,
      "Content-Length": image.length,
      "Content-Disposition": `inline; filename="sticker.${format}"`,
      "Cache-Control": "public, max-age=1800",
      "Vercel-CDN-Cache-Control": "public, s-maxage=1800",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    });
    response.end(request.method === "HEAD" ? undefined : image);
  } catch (error) {
    if (!(error instanceof StickerError)) console.error(error);
    response.writeHead(error instanceof StickerError ? error.status : 500, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    });
    response.end(JSON.stringify({ error: error instanceof StickerError ? error.message : "conversion" }));
  }
}
