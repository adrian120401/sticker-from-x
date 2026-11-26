import { generateSticker } from "../x-stickers.mjs";

export default async function handler(request, response) {
  await generateSticker(request, response);
}
