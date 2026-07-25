import { useRef } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'

interface AddShotButtonProps {
  onFiles: (files: File[]) => void
  uploading: boolean
}

export function AddShotButton({ onFiles, uploading }: AddShotButtonProps) {
  const { user, setIsOnboardingModalOpen } = useLocalFirstAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (!user) {
      setIsOnboardingModalOpen(true)
      return
    }
    inputRef.current?.click()
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onFiles(Array.from(e.target.files))
          }
          e.target.value = '' // allow re-selecting the same photos
        }}
      />
      <button className="big-btn float" onClick={handleClick} disabled={uploading}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.4" />
          <path d="M13.9 8.4l5.4 9.3M9.9 8.4h11M8 11.9l5.4-9.3M9.9 15.5L4.5 6.2M13.9 15.5h-11M15.9 11.9l-5.4 9.3" />
        </svg>
        {uploading ? 'Developing…' : 'Add photos'}
      </button>
    </>
  )
}
