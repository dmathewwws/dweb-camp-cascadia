import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useRoll } from '../hooks/useRoll'
import { useUploader } from '../hooks/useUploader'
import { AdminSection } from '../components/AdminSection'
import { RollHeader } from '../components/RollHeader'
import { FilmStrip } from '../components/FilmStrip'
import { AddShotButton } from '../components/AddShotButton'
import { UploadTray } from '../components/UploadTray'

export function Home() {
  const { user, getProfileJwt } = useLocalFirstAuth()
  const { photos, uploaders, loading } = useRoll()
  const { batch, startUpload } = useUploader()

  return (
    <div className="advance-in pb-[130px]">
      <RollHeader frameCount={photos.length} />
      <FilmStrip photos={photos} uploaders={uploaders} loading={loading} />

      {/* Admin Section - only show if user is admin */}
      {user?.isAdmin && (
        <div className="px-3">
          <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />
        </div>
      )}

      <AddShotButton onFiles={startUpload} uploading={batch !== null} />
      <UploadTray batch={batch} />
    </div>
  )
}
