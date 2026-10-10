'use client';

/**
 * A photo taken on a phone is three or four megabytes and four thousand pixels
 * wide. The menu shows it eighty pixels wide. Left alone, a customer on mobile
 * data downloads the whole thing — fifteen dishes of it — to look at
 * thumbnails, which is the slowest part of the site by an order of magnitude
 * and the one nobody would guess at.
 *
 * So it is shrunk in the shop's own browser before it is ever uploaded. A
 * failure here never stops a photo going up: the original goes instead, and the
 * worst case is the size it was before.
 */
const MAX_EDGE = 900;
const QUALITY = 0.82;
/** Below this, re-encoding buys little and may even cost. */
const LEAVE_ALONE = 300 * 1024;

export type Shrunk = { blob: Blob; contentType: string; ext: string };

type Source = { image: CanvasImageSource; w: number; h: number; done: () => void };

async function decode(file: File): Promise<Source | null> {
  // A phone writes which way up the picture is into the file rather than
  // rotating the pixels, so asking for it the right way up matters: a canvas
  // draws what it is given, and dishes would come out on their side.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, w: bitmap.width, h: bitmap.height, done: () => bitmap.close() };
    } catch { /* an older browser, or a format it will not decode: fall through */ }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('could not read that image'));
      el.src = url;
    });
    return {
      image: img,
      w: img.naturalWidth || img.width,
      h: img.naturalHeight || img.height,
      done: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

export async function shrinkImage(file: File): Promise<Shrunk> {
  const original: Shrunk = {
    blob: file,
    contentType: file.type || 'image/jpeg',
    ext: file.name.split('.').pop()?.toLowerCase() || 'jpg',
  };

  if (file.size <= LEAVE_ALONE) return original;

  // A PNG is kept a PNG. It may be a graphic with a transparent background,
  // and turning that into a JPEG would put a square behind it.
  const png = file.type === 'image/png';
  const type = png ? 'image/png' : 'image/jpeg';

  const source = await decode(file);
  if (!source || !source.w || !source.h) return original;

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(source.w, source.h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.w * scale));
    canvas.height = Math.max(1, Math.round(source.h * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, png ? undefined : QUALITY);
    });
    if (!blob) return original;

    // Only if it actually helped. A picture that was already well compressed
    // can come out bigger, and then the original is the better upload.
    if (blob.size >= file.size) return original;
    return { blob, contentType: type, ext: png ? 'png' : 'jpg' };
  } catch {
    return original;
  } finally {
    source.done();
  }
}
