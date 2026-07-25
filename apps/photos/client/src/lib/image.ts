/**
 * Client-side image pipeline: downscale + JPEG re-encode before upload.
 * Re-encoding through a canvas strips all EXIF (including GPS) and keeps
 * payloads small for camp wifi. Each photo uploads as two objects:
 * full (≤2048px long edge) and thumb (≤640px).
 */

const FULL_EDGE = 2048
const THUMB_EDGE = 640

export interface ProcessedPhoto {
  fullBlob: Blob
  thumbBlob: Blob
  width: number // full-size pixel dimensions
  height: number
  contentType: 'image/jpeg'
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // imageOrientation bakes the EXIF rotation into the pixels
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older WebViews: fall back to an <img> (browsers auto-orient via CSS spec)
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function scaleToEdge(source: ImageBitmap | HTMLImageElement, maxEdge: number): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcW = source.width
  const srcH = source.height
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(source, 0, 0, width, height)
  return { canvas, width, height }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encode failed'))),
      'image/jpeg',
      quality
    )
  })
}

export async function processFile(file: File): Promise<ProcessedPhoto> {
  const bitmap = await loadBitmap(file)
  try {
    const full = scaleToEdge(bitmap, FULL_EDGE)
    const thumb = scaleToEdge(bitmap, THUMB_EDGE)
    const [fullBlob, thumbBlob] = await Promise.all([toJpeg(full.canvas, 0.82), toJpeg(thumb.canvas, 0.7)])
    return { fullBlob, thumbBlob, width: full.width, height: full.height, contentType: 'image/jpeg' }
  } finally {
    if ('close' in bitmap) bitmap.close()
  }
}

/**
 * PUT a blob with upload progress (XHR — fetch has no upload progress events).
 * Works for both presigned R2 URLs and the dev-upload worker route.
 */
export function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Upload failed (network)'))
    xhr.send(blob)
  })
}

/** Run fn over items with a concurrency cap, preserving result order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}
