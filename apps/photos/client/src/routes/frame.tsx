import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatStamp, formatTime } from '@dweb/photos-shared'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useRoll } from '../hooks/useRoll'
import { useToast } from '../hooks/useToast'
import { deletePhoto, imgUrl } from '../lib/api'
import { Avatar } from '../components/Avatar'

const pad = (n: number) => String(n).padStart(2, '0')

function orientationClass(width: number, height: number): 'land' | 'port' | 'sqr' {
  const ratio = width / height
  if (ratio > 1.05) return 'land'
  if (ratio < 0.95) return 'port'
  return 'sqr'
}

export function Frame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, getProfileJwt, setIsOnboardingModalOpen } = useLocalFirstAuth()
  const { photos, uploaders, loading } = useRoll()
  const { flash } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const index = photos.findIndex((p) => p.id === id)
  const photo = index >= 0 ? photos[index] : undefined

  if (!photo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="font-mono-stamp text-[11px] tracking-[0.18em] uppercase text-paper-dim">
          {loading ? 'Developing…' : 'This frame is no longer on the roll'}
        </div>
        {!loading && (
          <button
            className="font-mono-stamp text-[13px] tracking-[0.1em] px-2.5 py-2 rounded-xl hover:bg-paper/5"
            onClick={() => navigate('/')}
          >
            ✕ Back to the roll
          </button>
        )}
      </div>
    )
  }

  const frameNo = index + 1
  const uploader = uploaders[photo.did]
  const canDelete = user && (user.did === photo.did || user.isAdmin)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Blob download works even in in-app browsers that ignore the download attr
      const response = await fetch(imgUrl(photo.fullKey))
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roll-frame-${pad(frameNo)}.jpg`
      a.click()
      URL.revokeObjectURL(url)
      flash('Photo saved')
    } catch (err) {
      console.error('Save error:', err)
      flash('Could not save photo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setIsOnboardingModalOpen(true)
      return
    }
    setDeleting(true)
    try {
      await deletePhoto(profileJwt, photo.id)
      flash('Photo removed')
      navigate('/')
    } catch (err) {
      console.error('Delete error:', err)
      flash(err instanceof Error ? err.message : 'Could not delete photo')
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 pt-3 pb-2 bg-gradient-to-b from-darkroom from-70% to-transparent">
        <button
          className="font-mono-stamp text-[13px] tracking-[0.1em] flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-paper/5"
          onClick={() => navigate('/')}
        >
          ✕ Close
        </button>
        <span className="font-mono-stamp text-[11px] tracking-[0.18em] text-paper-dim uppercase pr-1.5">
          Frame {pad(frameNo)} of {photos.length}
        </span>
      </div>

      <div className="flex-1 min-h-[58vh] flex items-center justify-center px-4.5 py-2">
        <div className={`polaroid ${orientationClass(photo.width, photo.height)}`}>
          <div className="shot" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
            <img src={imgUrl(photo.fullKey)} alt={`Frame ${frameNo}`} />
            <div className="vig" />
            <div className="cast" />
          </div>
          <div className="absolute left-[15px] right-[15px] bottom-3.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {uploader && <Avatar avatar={uploader.avatar} name={uploader.name} size="sm" />}
              <span className="font-mono-stamp text-[11px] text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                {uploader?.name ?? 'Camper'}
              </span>
            </div>
            <span className="stamp text-xs flex-none">
              {formatStamp(photo.createdAt)} {formatTime(photo.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 px-4.5 pt-3.5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-darkroom from-[72%] to-transparent space-y-2.5">
        <button className="big-btn" onClick={handleSave} disabled={saving}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          {saving ? 'Downloading…' : 'Download photo'}
        </button>
        {canDelete && (
          <button
            className="w-full font-mono-stamp text-[11px] tracking-[0.14em] uppercase text-paper-dim hover:text-red-400 py-2"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Removing…' : confirmingDelete ? 'Tap again to confirm delete' : 'Delete photo'}
          </button>
        )}
      </div>
    </div>
  )
}
