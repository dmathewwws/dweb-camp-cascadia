import { useState } from 'react'
import { createPortal } from 'react-dom'
import { zipSync } from 'fflate'
import { useToast } from '../hooks/useToast'
import { imgUrl, type PublicPhoto } from '../lib/api'
import { mapWithConcurrency } from '../lib/image'

const pad = (n: number) => String(n).padStart(2, '0')

export function DownloadAllButton({ photos }: { photos: PublicPhoto[] }) {
  const { flash } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  if (photos.length === 0) return null

  const downloading = progress !== null

  const handleDownload = async () => {
    if (downloading) return
    setProgress({ done: 0, total: photos.length })
    try {
      // Everything is buffered in memory (fetched JPEGs + zip ≈ 2× roll size).
      // Fulls are ≤2048px re-encoded JPEGs, so this stays manageable.
      const results = await mapWithConcurrency(photos, 3, async (photo, i) => {
        try {
          const response = await fetch(imgUrl(photo.fullKey))
          if (!response.ok) throw new Error(`Fetch failed (${response.status})`)
          const buf = new Uint8Array(await response.arrayBuffer())
          return { name: `roll-frame-${pad(i + 1)}.jpg`, buf }
        } catch {
          return null
        } finally {
          setProgress((p) => p && { ...p, done: p.done + 1 })
        }
      })
      const files = results.filter((f) => f !== null)
      if (files.length === 0) {
        flash('Could not download photos')
        return
      }
      // level 0 = store: the JPEGs are already compressed
      const zipped = zipSync(Object.fromEntries(files.map((f) => [f.name, f.buf])), { level: 0 })
      const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'dweb-camp-roll.zip'
      a.click()
      URL.revokeObjectURL(url)
      flash(files.length === photos.length ? 'Roll downloaded' : `Saved ${files.length} of ${photos.length} photos`)
    } catch (err) {
      console.error('Download-all error:', err)
      flash('Could not download photos')
    } finally {
      setProgress(null)
      setConfirming(false)
    }
  }

  return (
    <>
      <button
        aria-label="Download all photos"
        className="w-[56px] h-[56px] flex-none rounded-full bg-film-2 border border-paper/12 flex items-center justify-center shadow-[0_0_0_4px_rgba(22,17,12,0.62),0_10px_30px_rgba(0,0,0,0.5)] hover:bg-paper/5 active:translate-y-px"
        onClick={() => setConfirming(true)}
      >
        <svg className="w-[21px] h-[21px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </button>

      {/* Portal: the float-dock's transform would otherwise become the
          containing block for this fixed-position overlay */}
      {confirming && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !downloading && setConfirming(false)}
          />
          <div className="relative z-10 bg-film-2 border border-paper/12 rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="font-display text-2xl font-bold uppercase mb-4">Download the roll</h2>
            <p className="text-paper-dim">
              Download all {photos.length} {photos.length === 1 ? 'photo' : 'photos'} as a ZIP?
            </p>
            <button onClick={handleDownload} disabled={downloading} className="mt-6 px-6 py-2 btn-primary">
              {downloading ? `Fetching ${progress.done} of ${progress.total}…` : 'Download'}
            </button>
            <button
              className="block w-full font-mono-stamp text-[11px] tracking-[0.14em] uppercase text-paper-dim hover:text-paper py-2 mt-3"
              onClick={() => setConfirming(false)}
              disabled={downloading}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
