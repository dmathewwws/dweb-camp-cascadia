import { useRef, useState } from 'react'
import { confirmUploads, requestUploads } from '../lib/api'
import { mapWithConcurrency, processFile, putWithProgress, type ProcessedPhoto } from '../lib/image'
import { useLocalFirstAuth } from './useLocalFirstAuth'
import { useRoll } from './useRoll'
import { useToast } from './useToast'

const MAX_BATCH = 25
const CONCURRENCY = 3 // camp wifi
const PROCESS_SHARE = 0.15 // slice of each photo's progress bar reserved for on-device processing

export interface UploadBatch {
  total: number
  done: number
  fraction: number // 0..1 across the whole batch's PUTs
}

/**
 * The Add Photos flow: downscale each file on-device (strips EXIF), mint
 * direct-upload URLs, PUT full+thumb straight to R2, then confirm so the
 * server creates the frames and broadcasts them.
 */
export function useUploader() {
  const { getProfileJwt, setIsOnboardingModalOpen } = useLocalFirstAuth()
  const { mergePhotos } = useRoll()
  const { flash } = useToast()
  const [batch, setBatch] = useState<UploadBatch | null>(null)
  const fractionsRef = useRef<number[]>([])

  const updateFraction = (index: number, value: number) => {
    fractionsRef.current[index] = value
    const sum = fractionsRef.current.reduce((a, b) => a + b, 0)
    setBatch((prev) =>
      prev ? { ...prev, fraction: sum / prev.total, done: fractionsRef.current.filter((f) => f >= 1).length } : prev
    )
  }

  const startUpload = async (files: File[]) => {
    if (!files.length || batch) return

    let selected = files
    if (files.length > MAX_BATCH) {
      selected = files.slice(0, MAX_BATCH)
      flash(`Max ${MAX_BATCH} per batch — taking the first ${MAX_BATCH}`)
    }

    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setIsOnboardingModalOpen(true)
      return
    }

    fractionsRef.current = new Array(selected.length).fill(0)
    setBatch({ total: selected.length, done: 0, fraction: 0 })

    try {
      // Mint upload slots while photos process — the request only needs a count,
      // and unconfirmed slots simply expire
      const uploadsPromise = requestUploads(profileJwt, selected.length)

      const processed = await mapWithConcurrency(selected, CONCURRENCY, (file, i) => {
        updateFraction(i, 0.05)
        return processFile(file)
          .then((photo) => {
            updateFraction(i, PROCESS_SHARE)
            return photo
          })
          .catch((err) => {
            console.error('Error processing photo:', err)
            return null
          })
      })
      const good = processed.filter((p): p is ProcessedPhoto => p !== null)
      if (!good.length) {
        flash('Could not read those photos')
        return
      }

      const { uploads } = await uploadsPromise

      const uploaded = await mapWithConcurrency(good, CONCURRENCY, async (photo, i) => {
        const slot = uploads[i]
        try {
          const wFull = photo.fullBlob.size / (photo.fullBlob.size + photo.thumbBlob.size)
          let fFull = 0
          let fThumb = 0
          const report = () =>
            updateFraction(i, PROCESS_SHARE + (fFull * wFull + fThumb * (1 - wFull)) * (1 - PROCESS_SHARE))
          await Promise.all([
            putWithProgress(slot.fullUploadUrl, photo.fullBlob, photo.contentType, (f) => {
              fFull = f
              report()
            }),
            putWithProgress(slot.thumbUploadUrl, photo.thumbBlob, photo.contentType, (f) => {
              fThumb = f
              report()
            }),
          ])
          updateFraction(i, 1)
          return { id: slot.id, width: photo.width, height: photo.height }
        } catch (err) {
          console.error('Error uploading photo:', err)
          return null
        }
      })
      const succeeded = uploaded.filter((u): u is NonNullable<typeof u> => u !== null)
      if (!succeeded.length) {
        flash('Upload failed — check your connection')
        return
      }

      // Fresh JWT — they expire after ~2 minutes and a big batch can take longer
      const confirmJwt = (await getProfileJwt()) ?? profileJwt
      const { photos } = await confirmUploads(confirmJwt, succeeded)

      mergePhotos(photos)
      const missed = selected.length - photos.length
      if (photos.length) {
        flash(
          photos.length === 1
            ? 'Frame added — developing…'
            : `${photos.length} frames added — developing…${missed ? ` (${missed} failed)` : ''}`
        )
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100)
      } else {
        flash('Upload failed — check your connection')
      }
    } catch (err) {
      console.error('Upload error:', err)
      flash(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBatch(null)
    }
  }

  return { batch, startUpload }
}
