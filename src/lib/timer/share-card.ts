import { eventLabel } from "./events";
import { formatMs, formatResult } from "./format";
import { RECORD_LABEL, type RecordHit } from "./pb-detect";
import { trimmedIndices } from "./stats";
import type { TimerPuzzle } from "./types";
import { readTokenRgb, withAlpha, type Rgb } from "@/lib/token-color";

/**
 * The personal-best image people post to WhatsApp status and Instagram:
 * 1080×1350, Instagram's portrait size, drawn on a canvas in the active
 * theme's colours. Client-only.
 */

const W = 1080;
const H = 1350;
const PAD = 96;

const rgb = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/** Resolve a font-family token (which may chain through other variables). */
function fontFamily(token: string): string {
  const probe = document.createElement("span");
  probe.style.fontFamily = `var(--${token})`;
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || "sans-serif";
}

/** The headline hit: the longest average wins, a single only when it's alone. */
export function headlineHit(hits: RecordHit[]): RecordHit {
  const rank = { ao12: 0, ao5: 1, mean3: 2, single: 3 } as const;
  return [...hits].sort((a, b) => rank[a.category] - rank[b.category])[0];
}

/** "11.20  (10.90)  13.10  (DNF)  12.70": oldest first, trimmed in brackets. */
export function windowTimes(hit: RecordHit): string[] {
  const trimmed = trimmedIndices(hit.solves);
  return hit.solves
    .map((s, i) => {
      const t = formatResult(s.timeMs, s.penalty);
      return trimmed.has(i) ? `(${t})` : t;
    })
    .reverse();
}

export async function drawShareCard(
  hits: RecordHit[],
  puzzle: TimerPuzzle,
  when: Date = new Date(),
): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const c = {
    bg: readTokenRgb("background"),
    card: readTokenRgb("card"),
    fg: readTokenRgb("foreground"),
    muted: readTokenRgb("muted-foreground"),
    primary: readTokenRgb("primary"),
    ready: readTokenRgb("timer-ready"),
    border: readTokenRgb("border"),
  };
  const ui = fontFamily("font-ui");
  const mono = fontFamily("font-timer");

  // Background with a soft glow behind the time.
  ctx.fillStyle = rgb(c.bg);
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 620);
  glow.addColorStop(0, withAlpha(c.ready, 0.18));
  glow.addColorStop(1, withAlpha(c.ready, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Wordmark: "Cube" in the foreground colour, "Hub" in primary, as in the navbar.
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 56px ${ui}`;
  ctx.textAlign = "left";
  ctx.fillStyle = rgb(c.fg);
  ctx.fillText("Cube", PAD, PAD + 40);
  const cubeW = ctx.measureText("Cube").width;
  ctx.fillStyle = rgb(c.primary);
  ctx.fillText("Hub", PAD + cubeW, PAD + 40);

  // A row of cube stickers in the theme's sticker colours.
  const stickers = ["u", "r", "f", "d", "l", "b"].map((f) => readTokenRgb(`sticker-${f}`));
  stickers.forEach((s, i) => {
    ctx.fillStyle = rgb(s);
    roundRect(ctx, W - PAD - (6 - i) * 40 + 4, PAD + 6, 32, 32, 6);
    ctx.fill();
  });

  const head = headlineHit(hits);
  ctx.textAlign = "center";

  ctx.fillStyle = rgb(c.primary);
  ctx.font = `700 40px ${ui}`;
  ctx.fillText("NEW PERSONAL BEST", W / 2, 330);

  ctx.fillStyle = rgb(c.muted);
  ctx.font = `600 52px ${ui}`;
  ctx.fillText(`${eventLabel(puzzle)} · ${RECORD_LABEL[head.category]}`, W / 2, 420);

  ctx.fillStyle = rgb(c.ready);
  ctx.font = `700 ${fitFont(ctx, formatMs(head.timeMs), mono, 260, W - PAD * 2)}px ${mono}`;
  ctx.fillText(formatMs(head.timeMs), W / 2, 660);

  ctx.fillStyle = rgb(c.fg);
  ctx.font = `500 44px ${ui}`;
  const gain = head.previousMs - head.timeMs;
  ctx.fillText(`${formatMs(gain)} faster than ${formatMs(head.previousMs)}`, W / 2, 760);

  // The solves behind an average.
  let y = 880;
  if (head.category !== "single") {
    ctx.fillStyle = rgb(c.muted);
    ctx.font = `500 40px ${mono}`;
    const times = windowTimes(head);
    const perLine = times.length > 6 ? 6 : times.length;
    for (let i = 0; i < times.length; i += perLine) {
      ctx.fillText(times.slice(i, i + perLine).join("   "), W / 2, y);
      y += 60;
    }
  }

  // Anything else beaten in the same solve.
  const others = hits.filter((h) => h !== head);
  if (others.length > 0) {
    ctx.fillStyle = rgb(c.fg);
    ctx.font = `600 40px ${ui}`;
    const line = others.map((h) => `${RECORD_LABEL[h.category]} ${formatMs(h.timeMs)}`).join("  ·  ");
    ctx.fillText(`Also new: ${line}`, W / 2, Math.max(y + 30, 1000));
  }

  // Footer.
  ctx.strokeStyle = rgb(c.border);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 170);
  ctx.lineTo(W - PAD, H - 170);
  ctx.stroke();
  ctx.fillStyle = rgb(c.muted);
  ctx.font = `500 36px ${ui}`;
  ctx.textAlign = "left";
  ctx.fillText(
    when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    PAD,
    H - 100,
  );
  ctx.textAlign = "right";
  ctx.fillText(window.location.host, W - PAD, H - 100);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Largest size up to `max` at which `text` fits in `width`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, max: number, width: number): number {
  let size = max;
  ctx.font = `700 ${size}px ${family}`;
  while (size > 80 && ctx.measureText(text).width > width) {
    size -= 10;
    ctx.font = `700 ${size}px ${family}`;
  }
  return size;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Share the image through the phone's share sheet (WhatsApp, Instagram…).
 * Where files can't be shared (most desktops), download it and also put it on
 * the clipboard, so it can be pasted straight into a chat.
 */
export async function shareImage(blob: Blob, text: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], "cubehub-pb.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Fall through to download.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    // Clipboard images need permission and a secure context; the download is enough.
  }
  return "saved";
}
