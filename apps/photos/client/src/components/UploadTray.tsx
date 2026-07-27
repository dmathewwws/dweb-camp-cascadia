import type { UploadBatch } from '../hooks/useUploader'

export function UploadTray({ batch }: { batch: UploadBatch | null }) {
  if (!batch) return null

  return (
    <div className="fixed left-1/2 md:left-3/4 -translate-x-1/2 bottom-[calc(138px+env(safe-area-inset-bottom))] z-50 w-[min(320px,86vw)] bg-film-2 border border-paper/12 rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-baseline justify-between font-mono-stamp text-[11px] tracking-[0.06em] mb-2">
        <span>
          Developing {Math.min(batch.done + 1, batch.total)} of {batch.total}
        </span>
        <span className="stamp text-[11px]">{Math.round(batch.fraction * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-darkroom overflow-hidden">
        <div
          className="h-full bg-stamp rounded-full transition-[width] duration-200"
          style={{ width: `${Math.round(batch.fraction * 100)}%` }}
        />
      </div>
    </div>
  )
}
