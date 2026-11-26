const form = document.querySelector("#sticker-form");
const submit = form.querySelector("button");
const input = document.querySelector("#post-url");
const status = document.querySelector("#sticker-feedback");
const preview = document.querySelector("#sticker-preview");
const label = document.querySelector("#sticker-label");
const help = document.querySelector("#sticker-help");
const download = document.querySelector("#sticker-download");
const copy = JSON.parse(document.querySelector("#sticker-copy").textContent);
const postHost = /^(?:(?:www|mobile)\.)?(?:x|twitter)\.com$/;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true;
  status.dataset.state = "busy";
  status.textContent = copy.busy;

  try {
    const source = new URL(input.value.trim());
    source.hash = "";
    if (postHost.test(source.hostname)) source.search = "";
    const imageURL = new URL(form.action);
    imageURL.searchParams.set("url", source.href);
    const response = await fetch(imageURL);
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      status.dataset.state = "error";
      status.textContent = copy.errors[error?.error] ?? copy.errors.conversion;
      return;
    }

    const format = response.headers.get("Content-Type");
    if (format !== "image/gif" && format !== "image/png") throw new Error("Unexpected sticker type");
    await response.arrayBuffer();

    // The real HTTP image is what Safari supplies when the user long-presses Copy.
    const sticker = new Image();
    sticker.src = imageURL.href;
    await sticker.decode();
    preview.src = sticker.src;
    preview.alt = preview.dataset.resultAlt;
    label.textContent = label.dataset.result;
    help.textContent = help.dataset.result;
    download.href = sticker.src;
    download.download = `sticker.${format.slice(6)}`;
    download.hidden = false;
    status.dataset.state = "ready";
    status.textContent = copy.ready;

    if (preview.getBoundingClientRect().top > window.innerHeight) {
      preview.scrollIntoView({ block: "center" });
    }
  } catch {
    status.dataset.state = "error";
    status.textContent = copy.errors.conversion;
  } finally {
    submit.disabled = false;
  }
});