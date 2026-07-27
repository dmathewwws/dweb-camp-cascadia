import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useRoll } from '../hooks/useRoll'
import { useUploader } from '../hooks/useUploader'
import { AdminSection } from '../components/AdminSection'
import { CampLabel } from '../components/CampLabel'
import { FilmStrip } from '../components/FilmStrip'
import { AddShotButton } from '../components/AddShotButton'
import { DownloadAllButton } from '../components/DownloadAllButton'
import { UploadTray } from '../components/UploadTray'

export function Home() {
  const { user, getProfileJwt } = useLocalFirstAuth()
  const { photos, uploaders, loading } = useRoll()
  const { batch, startUpload } = useUploader()

  return (
    <>
      <div className="advance-in pb-[90px]">
        <div className="px-4.5 pt-4.5 pb-4">
          <CampLabel />
        </div>
        <FilmStrip photos={photos} uploaders={uploaders} loading={loading} />

        {/* Admin Section - only show if user is admin */}
        {user?.isAdmin && (
          <div className="px-3">
            <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />
          </div>
        )}
      </div>

      {/* Kept outside .advance-in: its animation leaves a transform on that div, which
          would make it the containing block for these position: fixed children. */}
      <div className="float-dock">
        <AddShotButton onFiles={startUpload} uploading={batch !== null} />
        <DownloadAllButton photos={photos} />
      </div>
      <UploadTray batch={batch} />
    </>
  )
}
