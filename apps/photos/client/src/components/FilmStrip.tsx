import type { PublicPhoto, Uploader } from '../lib/api'
import { FrameCard } from './FrameCard'

interface FilmStripProps {
  photos: PublicPhoto[]
  uploaders: Record<string, Uploader>
  loading: boolean
}

export function FilmStrip({ photos, uploaders, loading }: FilmStripProps) {
  return (
    <div className="grid grid-cols-[18px_1fr_18px] bg-leader-deep mx-3 rounded overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <div className="rail" />
      <div className="py-1.5">
        {photos.length === 0 ? (
          <div className="py-[46px] px-[22px] text-center">
            <div className="font-display font-bold text-[26px] uppercase text-ink">Roll loaded</div>
            <div className="font-mono-stamp text-[11px] tracking-[0.06em] text-ink/70 mt-2 leading-relaxed">
              {loading ? 'Developing…' : (
                <>
                  No frames yet.
                  <br />
                  Add the first shot.
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {photos.map((photo, i) => (
              <FrameCard key={photo.id} photo={photo} frameNo={i + 1} uploader={uploaders[photo.did]} />
            ))}
            <div className="roll-end">Roll in progress</div>
          </>
        )}
      </div>
      <div className="rail" />
    </div>
  )
}
